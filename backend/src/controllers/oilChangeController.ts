import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { oilChangeService } from '../services/oilChangeService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const oilChangeCreateSchema = [
  body('vehicle_id')
    .isInt({ min: 1 }).withMessage('Vui lòng chọn xe'),
  body('change_date')
    .notEmpty().withMessage('Vui lòng chọn ngày thay')
    .isISO8601().withMessage('Ngày không hợp lệ'),
  body('odometer_at')
    .notEmpty().withMessage('Vui lòng nhập số km')
    .isFloat({ min: 0 }).withMessage('Số km không hợp lệ'),
  body('oil_type').optional().isString(),
  body('notes').optional().isString(),
];

export const oilChangeUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('change_date').optional().isISO8601().withMessage('Ngày không hợp lệ'),
  body('odometer_at').optional().isFloat({ min: 0 }).withMessage('Số km không hợp lệ'),
  body('oil_type').optional().isString(),
  body('notes').optional().isString(),
];

export const oilChangeDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const oilChangeController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = req.query.vehicle_id ? parseInt(req.query.vehicle_id as string, 10) : undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await oilChangeService.listAll({ vehicle_id: vehicleId, page, limit });
      sendSuccess(res, data, 'Danh sách thay nhớt');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách thay nhớt', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const record = await oilChangeService.getById(id);
      if (!record) {
        sendError(res, 'Không tìm thấy bản ghi thay nhớt', 404);
        return;
      }
      sendSuccess(res, record, 'Chi tiết thay nhớt');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải chi tiết', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { vehicle_id, change_date, odometer_at, oil_type, notes } = req.body;
      const record = await oilChangeService.create(
        { vehicle_id, change_date, odometer_at, oil_type, notes },
        req.user!.userId,
      );
      sendSuccess(res, record, 'Đã thêm thay nhớt', 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'oil_change',
        entityId: record.id,
        entityLabel: `OilChange #${record.id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm thay nhớt', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id, 10);
      const { change_date, odometer_at, oil_type, notes } = req.body;
      const record = await oilChangeService.update(id, { change_date, odometer_at, oil_type, notes });
      sendSuccess(res, record, 'Đã cập nhật thay nhớt');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'oil_change',
        entityId: id,
        entityLabel: `OilChange #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi thay nhớt', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật thay nhớt', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id, 10);
      await oilChangeService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa thay nhớt');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'oil_change',
        entityId: id,
        entityLabel: `OilChange #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi thay nhớt', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa thay nhớt', 500, error);
    }
  },

  async getDue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicles = await oilChangeService.getDueVehicles();
      sendSuccess(res, { vehicles }, 'Danh sách xe cần thay nhớt');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe cần thay nhớt', 500, error);
    }
  },
};
