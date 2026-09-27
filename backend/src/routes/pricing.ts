import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/pricing - Public route to get current pricing
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      where: { isActive: true },
      orderBy: [{ paperSize: 'asc' }, { colorMode: 'asc' }],
    });

    res.json({ success: true, rules });
  } catch (error) {
    next(error);
  }
});

// PUT /api/pricing - Admin: Update pricing rules
router.put('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = z.object({
      rules: z.array(z.object({
        paperSize: z.enum(['A4', 'A3', 'LETTER']),
        colorMode: z.enum(['BW', 'COLOR']),
        pricePerPage: z.number().min(0),
        isActive: z.boolean().optional().default(true),
      })),
    }).parse(req.body);

    // Upsert each pricing rule
    const updated = await Promise.all(
      body.rules.map(rule =>
        prisma.pricingRule.upsert({
          where: { paperSize_colorMode: { paperSize: rule.paperSize, colorMode: rule.colorMode } },
          update: { pricePerPage: rule.pricePerPage, isActive: rule.isActive ?? true },
          create: {
            paperSize: rule.paperSize,
            colorMode: rule.colorMode,
            pricePerPage: rule.pricePerPage,
            isActive: rule.isActive ?? true,
          },
        })
      )
    );

    res.json({ success: true, rules: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(createError(error.errors[0].message, 400));
    }
    next(error);
  }
});

export default router;
