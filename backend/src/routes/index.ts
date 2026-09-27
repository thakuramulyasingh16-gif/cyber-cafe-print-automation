import { Express } from 'express';
import authRouter from './auth';
import uploadRouter from './upload';
import orderRouter from './orders';
import adminRouter from './admin';
import pricingRouter from './pricing';
import printRouter from './print';
import settingsRouter from './settings';

export function setupRoutes(app: Express) {
  app.use('/api/auth', authRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/print', printRouter);
  app.use('/api/settings', settingsRouter);
}
