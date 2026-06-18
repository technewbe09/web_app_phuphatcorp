import { Response } from 'express';
import { body, query, ValidationChain } from 'express-validator';
import { reconcileJobService } from '../services/reconcileJobService';
import { schedulerService } from '../services/schedulerService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const createConfigSchema: ValidationChain[] = [
  body('name').optional().isString().isLength({ min: 1 }).withMessage('Tên job không được để trống'),
  body('lookback_days').optional().isInt({ min: 1 }).withMessage('Số ngày quét phải >= 1'),
  body('schedule_hours')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Vui lòng chọn ít nhất 1 giờ'),
  body('schedule_hours.*').optional().isInt({ min: 0, max: 23 }).withMessage('Giờ phải từ 0 đến 23'),
  body('is_active').optional().isBoolean(),
];

export const updateConfigSchema: ValidationChain[] = [
  body('name').optional().isString().isLength({ min: 1 }).withMessage('Tên job không được để trống'),
  body('lookback_days').optional().isInt({ min: 1 }).withMessage('Số ngày quét phải >= 1'),
  body('schedule_hours')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Vui lòng chọn ít nhất 1 giờ'),
  body('schedule_hours.*').optional().isInt({ min: 0, max: 23 }).withMessage('Giờ phải từ 0 đến 23'),
  body('is_active').optional().isBoolean(),
];

export const getLogsSchema: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('config_id').optional().isInt().withMessage('config_id must be integer'),
  query('status').optional().isIn(['running', 'success', 'failed']).withMessage('Invalid status'),
];

export const reconcileJobController = {
  async listConfigs(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const configs = await reconcileJobService.listConfigs();
      sendSuccess(res, configs, 'Danh sách cấu hình job');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách cấu hình job', 500, error);
    }
  },

  async createConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const config = await reconcileJobService.createConfig(req.body, req.user!.userId);
      if (config.is_active) {
        await schedulerService.refreshConfig(config.id);
      }
      sendSuccess(res, config, 'Đã tạo cấu hình job', 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'job',
        entityId: config.id,
        entityLabel: config.name,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tạo cấu hình job', 500, error);
    }
  },

  async updateConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const config = await reconcileJobService.updateConfig(id, req.body, req.user!.userId);
      if (!config) {
        sendError(res, 'Không tìm thấy cấu hình job', 404);
        return;
      }
      await schedulerService.refreshConfig(config.id);
      sendSuccess(res, config, 'Đã cập nhật cấu hình job');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'job',
        entityId: id,
        entityLabel: config.name,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật cấu hình job', 500, error);
    }
  },

  async deleteConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      schedulerService.reschedule(id);
      const deleted = await reconcileJobService.deleteConfig(id);
      if (!deleted) {
        sendError(res, 'Không tìm thấy cấu hình job', 404);
        return;
      }
      sendSuccess(res, { id }, 'Đã xóa cấu hình job');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'job',
        entityId: id,
        entityLabel: `Job #${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa cấu hình job', 500, error);
    }
  },

  async toggleConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const config = await reconcileJobService.toggleConfig(id);
      if (!config) {
        sendError(res, 'Không tìm thấy cấu hình job', 404);
        return;
      }
      await schedulerService.refreshConfig(config.id);
      const msg = config.is_active ? 'Đã bật job' : 'Đã tắt job';
      sendSuccess(res, { id: config.id, is_active: config.is_active }, msg);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'TOGGLE',
        entityType: 'job',
        entityId: id,
        entityLabel: `Job #${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thay đổi trạng thái job', 500, error);
    }
  },

  async triggerReconcile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { config_id, lookback_days } = req.body as {
        config_id?: number;
        lookback_days?: number;
      };

      let lookbackDays = lookback_days ?? 180;
      let configId = config_id ?? null;

      let configName: string | undefined;
      if (configId) {
        const config = await reconcileJobService.getConfigById(configId);
        if (!config) {
          sendError(res, 'Không tìm thấy cấu hình job', 404);
          return;
        }
        configName = config.name;
        if (!lookback_days) {
          lookbackDays = config.lookback_days;
        }
      }

      const logId = await reconcileJobService.createLog(
        configId,
        'manual',
        lookbackDays,
      );

      try {
        const result = await reconcileJobService.executeReconcile(lookbackDays);

        await reconcileJobService.updateLogSuccess(
          logId,
          result.scanned_count,
          result.matched_count,
          result.matched_invoices,
        );

        if (configId) {
          await reconcileJobService.updateConfigLastRun(configId);
        }

        sendSuccess(
          res,
          {
            log_id: logId,
            scanned_count: result.scanned_count,
            matched_count: result.matched_count,
            matched_invoices: result.matched_invoices,
            status: 'success',
          },
          `Đối chiếu hoàn tất: ${result.matched_count}/${result.scanned_count} hóa đơn đã khớp`,
        );
        auditService.logAudit({
          userId: req.user!.userId,
          username: req.user!.email,
          action: 'TRIGGER',
          entityType: 'job',
          entityLabel: configName || 'Manual trigger',
          ipAddress: req.ip,
          details: { scanned: result.scanned_count, matched: result.matched_count },
        });
      } catch (execErr) {
        const errorMsg =
          execErr instanceof Error ? execErr.message : 'Unknown error';
        await reconcileJobService.updateLogFailed(logId, errorMsg);
        sendError(res, `Đối chiếu thất bại: ${errorMsg}`, 500, errorMsg);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể chạy đối chiếu', 500, error);
    }
  },

  async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        config_id: req.query.config_id
          ? parseInt(req.query.config_id as string, 10)
          : undefined,
        status: req.query.status as string | undefined,
      };
      const result = await reconcileJobService.getLogs(filters);
      sendSuccess(res, result, 'Lịch sử chạy job');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải lịch sử chạy job', 500, error);
    }
  },
};
