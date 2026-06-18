import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services/auditService';
import { sendSuccess, sendError } from '../utils/response';

export const auditController = {
  async getAccessLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        userId,
        method,
        path,
        statusCode,
        dateFrom,
        dateTo,
        page,
        limit,
      } = req.query;

      const result = await auditService.getAccessLogs({
        userId: userId ? parseInt(userId as string, 10) : undefined,
        method: method as string | undefined,
        path: path as string | undefined,
        statusCode: statusCode ? parseInt(statusCode as string, 10) : undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to fetch access logs', 500, error);
    }
  },

  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        dateFrom,
        dateTo,
        page,
        limit,
      } = req.query;

      const result = await auditService.getAuditLogs({
        userId: userId ? parseInt(userId as string, 10) : undefined,
        action: action as string | undefined,
        entityType: entityType as string | undefined,
        entityId: entityId ? parseInt(entityId as string, 10) : undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to fetch audit logs', 500, error);
    }
  },
};
