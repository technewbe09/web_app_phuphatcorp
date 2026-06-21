import { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { inspectionService } from '../services/inspectionService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const inspectionCreateSchema = [
  body('vehicle_id')
    .isInt({ min: 1 }).withMessage('Vui lòng chọn xe'),
  body('inspection_date')
    .notEmpty().withMessage('Vui lòng chọn ngày đăng kiểm')
    .isISO8601().withMessage('Ngày không hợp lệ'),
  body('expiry_date')
    .notEmpty().withMessage('Vui lòng chọn ngày hết hạn')
    .isISO8601().withMessage('Ngày không hợp lệ')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.inspection_date)) {
        throw new Error('Ngày hết hạn phải sau ngày đăng kiểm');
      }
      return true;
    }),
  body('notes').optional().isString(),
];

export const inspectionUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('inspection_date').optional().isISO8601().withMessage('Ngày không hợp lệ'),
  body('expiry_date').optional().isISO8601().withMessage('Ngày không hợp lệ'),
  body('notes').optional().isString(),
];

export const inspectionDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const inspectionImageDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  param('imageId').isInt({ min: 1 }).withMessage('Image ID không hợp lệ'),
];

export const inspectionController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = req.query.vehicle_id ? parseInt(req.query.vehicle_id as string, 10) : undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await inspectionService.listAll({ vehicle_id: vehicleId, status, search, page, limit });
      sendSuccess(res, data, 'Danh sách đăng kiểm');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách đăng kiểm', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const inspection = await inspectionService.getById(id);
      if (!inspection) {
        sendError(res, 'Không tìm thấy bản ghi đăng kiểm', 404);
        return;
      }
      sendSuccess(res, inspection, 'Chi tiết đăng kiểm');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải chi tiết đăng kiểm', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { vehicle_id, inspection_date, expiry_date, notes } = req.body;
      const inspection = await inspectionService.create(
        { vehicle_id, inspection_date, expiry_date, notes },
        req.user!.userId,
      );
      sendSuccess(res, inspection, 'Đã thêm đăng kiểm', 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'inspection',
        entityId: inspection.id,
        entityLabel: `Inspection #${inspection.id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm đăng kiểm', 500, error);
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
      const { inspection_date, expiry_date, notes } = req.body;

      if (inspection_date && expiry_date && new Date(expiry_date) <= new Date(inspection_date)) {
        sendError(res, 'Ngày hết hạn phải sau ngày đăng kiểm', 400);
        return;
      }

      const inspection = await inspectionService.update(id, { inspection_date, expiry_date, notes });
      sendSuccess(res, inspection, 'Đã cập nhật đăng kiểm');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'inspection',
        entityId: id,
        entityLabel: `Inspection #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi đăng kiểm', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật đăng kiểm', 500, error);
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
      await inspectionService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa đăng kiểm');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'inspection',
        entityId: id,
        entityLabel: `Inspection #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi đăng kiểm', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa đăng kiểm', 500, error);
    }
  },

  async getExpiring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const inspections = await inspectionService.getExpiring(days);
      sendSuccess(res, { inspections }, 'Danh sách đăng kiểm sắp hết hạn');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách', 500, error);
    }
  },

  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file ảnh', 400);
        return;
      }

      const image = await inspectionService.addImage(id, req.file);
      sendSuccess(res, image, 'Đã upload ảnh', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi đăng kiểm', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload ảnh', 500, error);
    }
  },

  async deleteImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const imageId = parseInt(req.params.imageId, 10);
      await inspectionService.deleteImage(imageId);
      sendSuccess(res, undefined, 'Đã xóa ảnh');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy ảnh', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa ảnh', 500, error);
    }
  },
};
