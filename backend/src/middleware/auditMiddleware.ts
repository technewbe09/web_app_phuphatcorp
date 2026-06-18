import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { auditService } from '../services/auditService';

const LOGGED_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export function auditMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  if (!LOGGED_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    const responseTimeMs = Date.now() - startTime;
    const userId = req.user?.userId;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;

    auditService.logAccess({
      userId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      ipAddress,
      userAgent: req.headers['user-agent']?.slice(0, 500),
      responseTimeMs,
    });
  });

  next();
}
