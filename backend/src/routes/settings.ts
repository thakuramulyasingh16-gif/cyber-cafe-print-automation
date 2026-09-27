import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/settings - Public: get public settings (cafe name, portal URL)
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    
    // Only expose public settings
    const publicSettings = {
      cafeName: settingsMap.cafeName || 'Cyber Cafe',
      portalUrl: settingsMap.portalUrl || process.env.PORTAL_BASE_URL || 'http://localhost:5173',
      accentColor: settingsMap.accentColor || '#6366f1',
    };

    res.json({ success: true, settings: publicSettings });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/all - Admin: get all settings
router.get('/all', authenticate, requireAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({ success: true, settings: settingsMap });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Admin: update settings
router.put('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = z.record(z.string()).parse(req.body);

    const updates = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await Promise.all(updates);

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/qrcode - Generate QR code for customer portal
router.get('/qrcode', async (_req, res: Response, next: NextFunction) => {
  try {
    const portalUrlSetting = await prisma.setting.findUnique({ where: { key: 'portalUrl' } });
    const portalUrl = portalUrlSetting?.value || process.env.PORTAL_BASE_URL || 'http://localhost:5173';

    const qrDataUrl = await QRCode.toDataURL(portalUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.json({ success: true, qrCode: qrDataUrl, url: portalUrl });
  } catch (error) {
    next(error);
  }
});

export default router;
