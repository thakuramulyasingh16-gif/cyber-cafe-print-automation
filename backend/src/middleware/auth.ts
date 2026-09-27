import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('No token provided', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    return next(createError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(createError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return next(createError('Admin access required', 403, 'FORBIDDEN'));
  }
  next();
}
