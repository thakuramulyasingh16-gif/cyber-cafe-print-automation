import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { emitPrintJobUpdate, emitOrderUpdate } from '../socket';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET /api/print/jobs - For print agent: get queued print jobs
router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Authenticate print agent with agent token
    const agentToken = req.headers['x-agent-token'];
    const expectedToken = process.env.PRINT_AGENT_TOKEN || 'print-agent-dev-token-change-in-production';
    
    if (agentToken !== expectedToken) {
      return next(createError('Invalid agent token', 401));
    }

    const jobs = await prisma.printJob.findMany({
      where: { status: 'QUEUED' },
      orderBy: { queuedAt: 'asc' },
      include: {
        order: {
          include: {
            document: true,
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

// GET /api/print/document/:documentId - Download document for printing (print agent only)
router.get('/document/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentToken = req.headers['x-agent-token'];
    const expectedToken = process.env.PRINT_AGENT_TOKEN || 'print-agent-dev-token-change-in-production';
    
    if (agentToken !== expectedToken) {
      return next(createError('Invalid agent token', 401));
    }

    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) return next(createError('Document not found', 404));

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, document.storedName);

    if (!fs.existsSync(filePath)) {
      return next(createError('Document file not found', 404));
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/print/jobs/:jobId/status - Update print job status (print agent)
router.patch('/jobs/:jobId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentToken = req.headers['x-agent-token'];
    const expectedToken = process.env.PRINT_AGENT_TOKEN || 'print-agent-dev-token-change-in-production';
    
    if (agentToken !== expectedToken) {
      return next(createError('Invalid agent token', 401));
    }

    const { status, error: errorMsg } = req.body;
    
    if (!['PRINTING', 'COMPLETED', 'FAILED'].includes(status)) {
      return next(createError('Invalid status', 400));
    }

    const job = await prisma.printJob.findUnique({
      where: { id: req.params.jobId },
    });

    if (!job) return next(createError('Print job not found', 404));

    const updateData: Record<string, unknown> = { status };
    if (status === 'PRINTING') updateData.startedAt = new Date();
    if (status === 'COMPLETED' || status === 'FAILED') updateData.completedAt = new Date();
    if (errorMsg) updateData.lastError = errorMsg;
    if (status === 'FAILED') updateData.attempts = job.attempts + 1;

    const updatedJob = await prisma.printJob.update({
      where: { id: job.id },
      data: updateData,
    });

    // Update order status
    let orderStatus = '';
    if (status === 'PRINTING') orderStatus = 'PRINTING';
    if (status === 'COMPLETED') orderStatus = 'COMPLETED';
    if (status === 'FAILED') orderStatus = 'PRINT_FAILED';

    if (orderStatus) {
      const updatedOrder = await prisma.order.update({
        where: { id: job.orderId },
        data: {
          status: orderStatus,
          ...(status === 'COMPLETED' && { completedAt: new Date() }),
        },
      });

      await prisma.auditLog.create({
        data: {
          orderId: job.orderId,
          action: `PRINT_${status}`,
          details: errorMsg ? JSON.stringify({ error: errorMsg }) : undefined,
        },
      });

      emitOrderUpdate(updatedOrder);
    }

    emitPrintJobUpdate(updatedJob);

    res.json({ success: true, job: updatedJob });
  } catch (error) {
    next(error);
  }
});

// GET /api/print/admin/jobs - Admin: view all print jobs
router.get('/admin/jobs', authenticate, requireAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await prisma.printJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
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

export default router;
