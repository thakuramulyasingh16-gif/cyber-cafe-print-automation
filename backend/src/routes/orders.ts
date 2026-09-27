import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { emitOrderUpdate } from '../socket';

const router = Router();

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CC-${timestamp}-${random}`;
}

const createOrderSchema = z.object({
  documentId: z.string().uuid(),
  paperSize: z.enum(['A4', 'A3', 'LETTER']),
  colorMode: z.enum(['BW', 'COLOR']),
  copies: z.number().int().min(1).max(100),
  pageRangeStart: z.number().int().min(1).optional(),
  pageRangeEnd: z.number().int().min(1).optional(),
  duplex: z.boolean().optional().default(false),
  paymentMode: z.enum(['CASH', 'ONLINE']),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
});

// POST /api/orders - Create a new order
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createOrderSchema.parse(req.body);

    // Fetch document
    const document = await prisma.document.findUnique({
      where: { id: body.documentId },
    });

    if (!document) {
      return next(createError('Document not found', 404));
    }

    // Fetch pricing from backend (authoritative)
    const pricingRule = await prisma.pricingRule.findUnique({
      where: { paperSize_colorMode: { paperSize: body.paperSize, colorMode: body.colorMode } },
    });

    if (!pricingRule || !pricingRule.isActive) {
      return next(createError('Pricing not configured for this combination', 400, 'PRICING_ERROR'));
    }

    // Calculate pages
    const totalDocPages = document.pageCount || 1;
    const pageStart = body.pageRangeStart || 1;
    const pageEnd = body.pageRangeEnd || totalDocPages;
    const pagesPerCopy = pageEnd - pageStart + 1;
    
    // For duplex, pages are rounded up to even number
    const effectivePages = body.duplex ? Math.ceil(pagesPerCopy / 2) * 2 : pagesPerCopy;
    const totalPages = effectivePages * body.copies;
    const totalAmount = totalPages * pricingRule.pricePerPage;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        documentId: document.id,
        paperSize: body.paperSize,
        colorMode: body.colorMode,
        copies: body.copies,
        pageRangeStart: body.pageRangeStart,
        pageRangeEnd: body.pageRangeEnd,
        duplex: body.duplex || false,
        pricePerPage: pricingRule.pricePerPage,
        totalPages,
        totalAmount,
        paymentMode: body.paymentMode,
        paymentStatus: 'PENDING',
        status: body.paymentMode === 'CASH' ? 'PAYMENT_PENDING' : 'PAYMENT_PENDING',
        customerName: body.customerName,
        customerPhone: body.customerPhone,
      },
      include: { document: true },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: body.paymentMode,
        amount: totalAmount,
        status: 'PENDING',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        action: 'ORDER_CREATED',
        details: JSON.stringify({ paymentMode: body.paymentMode, totalAmount }),
      },
    });

    // Emit realtime update
    emitOrderUpdate(order);

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        totalPages: order.totalPages,
        copies: order.copies,
        paymentMode: order.paymentMode,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(createError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }
    next(error);
  }
});

// GET /api/orders/:orderId - Get order details (public - for status checking)
router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        document: {
          select: { originalName: true, pageCount: true },
        },
        printJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return next(createError('Order not found', 404));
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/number/:orderNumber - Get order by order number
router.get('/number/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: {
        document: {
          select: { originalName: true, pageCount: true },
        },
        printJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return next(createError('Order not found', 404));
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:orderId/price-estimate - Calculate price before creating order
router.post('/price-estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = z.object({
      documentId: z.string().uuid(),
      paperSize: z.enum(['A4', 'A3', 'LETTER']),
      colorMode: z.enum(['BW', 'COLOR']),
      copies: z.number().int().min(1).max(100),
      pageRangeStart: z.number().int().min(1).optional(),
      pageRangeEnd: z.number().int().min(1).optional(),
      duplex: z.boolean().optional().default(false),
    }).parse(req.body);

    const document = await prisma.document.findUnique({
      where: { id: body.documentId },
    });

    if (!document) return next(createError('Document not found', 404));

    const pricingRule = await prisma.pricingRule.findUnique({
      where: { paperSize_colorMode: { paperSize: body.paperSize, colorMode: body.colorMode } },
    });

    if (!pricingRule || !pricingRule.isActive) {
      return next(createError('Pricing not configured', 400));
    }

    const totalDocPages = document.pageCount || 1;
    const pageStart = body.pageRangeStart || 1;
    const pageEnd = body.pageRangeEnd || totalDocPages;
    const pagesPerCopy = pageEnd - pageStart + 1;
    const effectivePages = body.duplex ? Math.ceil(pagesPerCopy / 2) * 2 : pagesPerCopy;
    const totalPages = effectivePages * body.copies;
    const totalAmount = totalPages * pricingRule.pricePerPage;

    res.json({
      success: true,
      estimate: {
        pricePerPage: pricingRule.pricePerPage,
        pagesPerCopy,
        copies: body.copies,
        totalPages,
        totalAmount,
        duplex: body.duplex,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(createError(error.errors[0].message, 400));
    }
    next(error);
  }
});

export default router;
