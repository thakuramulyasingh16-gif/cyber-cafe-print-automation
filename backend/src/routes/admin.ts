import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { emitOrderUpdate, emitPrintJobUpdate, emitDashboardUpdate } from '../socket';
import { queuePrintJob } from '../services/printQueue';

const router = Router();

// All admin routes require authentication
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard - Dashboard stats
router.get('/dashboard', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalOrders,
      pendingPayments,
      queuedJobs,
      printingJobs,
      completedOrders,
      failedOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.printJob.count({ where: { status: 'QUEUED' } }),
      prisma.printJob.count({ where: { status: 'PRINTING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: { in: ['PRINT_FAILED', 'PAYMENT_FAILED'] } } }),
    ]);

    // Revenue (from paid/completed orders)
    const revenue = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    });

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        document: { select: { originalName: true } },
      },
    });

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingPayments,
        queuedJobs,
        printingJobs,
        completedOrders,
        failedOrders,
        revenue: revenue._sum.totalAmount || 0,
      },
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/orders - List all orders with pagination and filters
router.get('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
      search: z.string().optional(),
    }).parse(req.query);

    const skip = (query.page - 1) * query.limit;
    
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search } },
        { customerName: { contains: query.search } },
        { customerPhone: { contains: query.search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          document: { select: { originalName: true, pageCount: true } },
          printJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/orders/:orderId - Get single order details
router.get('/orders/:orderId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        document: true,
        printJobs: {
          include: { printer: true },
          orderBy: { createdAt: 'desc' },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) return next(createError('Order not found', 404));

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/orders/:orderId/confirm-payment - Confirm cash payment
router.post('/orders/:orderId/confirm-payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { payments: true },
    });

    if (!order) return next(createError('Order not found', 404));

    if (order.paymentMode !== 'CASH') {
      return next(createError('Only cash payments can be manually confirmed', 400));
    }

    if (order.paymentStatus === 'PAID') {
      return next(createError('Payment already confirmed', 400));
    }

    // Valid states to confirm payment from
    if (!['PAYMENT_PENDING', 'CREATED'].includes(order.status)) {
      return next(createError('Order is not in a valid state for payment confirmation', 400));
    }

    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Update payment record
    await prisma.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: {
        status: 'SUCCESS',
        confirmedByUserId: req.user!.id,
        confirmedAt: new Date(),
        notes: notes || 'Cash payment confirmed by admin',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        userId: req.user!.id,
        action: 'PAYMENT_CONFIRMED',
        details: JSON.stringify({ method: 'CASH', amount: order.totalAmount, notes }),
      },
    });

    // Queue for printing
    await queueOrderForPrinting(order.id);

    // Emit updates
    emitOrderUpdate(updatedOrder);
    emitDashboardUpdate();

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/orders/:orderId/cancel - Cancel an order
router.post('/orders/:orderId/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return next(createError('Order not found', 404));

    const cancellableStates = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'QUEUED'];
    if (!cancellableStates.includes(order.status)) {
      return next(createError('Order cannot be cancelled in its current state', 400));
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });

    // Cancel any queued print jobs
    await prisma.printJob.updateMany({
      where: { orderId: order.id, status: { in: ['QUEUED', 'PRINTING'] } },
      data: { status: 'CANCELLED' },
    });

    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        userId: req.user!.id,
        action: 'ORDER_CANCELLED',
      },
    });

    emitOrderUpdate(updatedOrder);
    emitDashboardUpdate();

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/print-queue - Get print queue
router.get('/print-queue', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await prisma.printJob.findMany({
      where: { status: { in: ['QUEUED', 'PRINTING', 'FAILED'] } },
      orderBy: { queuedAt: 'asc' },
      include: {
        order: {
          include: {
            document: { select: { originalName: true } },
          },
        },
        printer: true,
      },
    });

    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/print-jobs/:jobId/retry - Retry a failed print job
router.post('/print-jobs/:jobId/retry', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.printJob.findUnique({
      where: { id: req.params.jobId },
      include: { order: true },
    });

    if (!job) return next(createError('Print job not found', 404));
    if (job.status !== 'FAILED') return next(createError('Only failed jobs can be retried', 400));
    if (job.attempts >= job.maxAttempts) {
      return next(createError('Maximum retry attempts reached', 400));
    }

    const updatedJob = await prisma.printJob.update({
      where: { id: job.id },
      data: { status: 'QUEUED', lastError: null },
    });

    // Update order status
    await prisma.order.update({
      where: { id: job.orderId },
      data: { status: 'QUEUED' },
    });

    await prisma.auditLog.create({
      data: {
        orderId: job.orderId,
        userId: req.user!.id,
        action: 'PRINT_JOB_RETRIED',
        details: JSON.stringify({ jobId: job.id }),
      },
    });

    emitPrintJobUpdate(updatedJob);

    res.json({ success: true, job: updatedJob });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/printers - List printers
router.get('/printers', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const printers = await prisma.printer.findMany({
      orderBy: { displayName: 'asc' },
    });
    res.json({ success: true, printers });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/printers - Add/update printer
router.post('/printers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      displayName: z.string().min(1),
      isDefault: z.boolean().optional().default(false),
    }).parse(req.body);

    if (body.isDefault) {
      // Unset other defaults
      await prisma.printer.updateMany({ data: { isDefault: false } });
    }

    const printer = await prisma.printer.upsert({
      where: { name: body.name },
      update: { displayName: body.displayName, isDefault: body.isDefault, isActive: true },
      create: { name: body.name, displayName: body.displayName, isDefault: body.isDefault },
    });

    res.json({ success: true, printer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(createError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Helper function to queue order for printing
async function queueOrderForPrinting(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return;

  // Find default printer
  const printer = await prisma.printer.findFirst({
    where: { isDefault: true, isActive: true },
  });

  // Create print job
  const printJob = await prisma.printJob.create({
    data: {
      orderId,
      printerId: printer?.id,
      status: 'QUEUED',
      queuedAt: new Date(),
    },
  });

  // Update order status to QUEUED
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'QUEUED' },
  });

  // Queue the print job via queue service
  await queuePrintJob(printJob.id);

  emitOrderUpdate(updatedOrder);
  emitPrintJobUpdate(printJob);
}

export default router;
