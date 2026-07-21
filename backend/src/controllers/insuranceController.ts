import { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { insuranceService } from '../services/insuranceService';
import { storageService } from '../services/storageService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const insuranceCreateSchema = [
  body('vehicle_id')
    .isInt({ min: 1 }).withMessage('Vui lòng chọn xe'),
  body('purchase_date')
    .notEmpty().withMessage('Vui lòng chọn ngày mua bảo hiểm')
    .isISO8601().withMessage('Ngày không hợp lệ'),
  body('expiry_date')
    .notEmpty().withMessage('Vui lòng chọn ngày hết hạn')
    .isISO8601().withMessage('Ngày không hợp lệ')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.purchase_date)) {
        throw new Error('Ngày hết hạn phải sau ngày mua');
      }
      return true;
    }),
  body('notes').optional().isString(),
];

export const insuranceUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('purchase_date').optional().isISO8601().withMessage('Ngày không hợp lệ'),
  body('expiry_date').optional().isISO8601().withMessage('Ngày không hợp lệ'),
  body('notes').optional().isString(),
];

export const insuranceDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const insuranceImageDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  param('imageId').isInt({ min: 1 }).withMessage('Image ID không hợp lệ'),
];

export const insuranceController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = req.query.vehicle_id ? parseInt(req.query.vehicle_id as string, 10) : undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await insuranceService.listAll({ vehicle_id: vehicleId, status, search, page, limit });
      sendSuccess(res, data, 'Danh sách bảo hiểm');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách bảo hiểm', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const insurance = await insuranceService.getById(id);
      if (!insurance) {
        sendError(res, 'Không tìm thấy bản ghi bảo hiểm', 404);
        return;
      }
      sendSuccess(res, insurance, 'Chi tiết bảo hiểm');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải chi tiết bảo hiểm', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { vehicle_id, purchase_date, expiry_date, notes } = req.body;
      const insurance = await insuranceService.create(
        { vehicle_id, purchase_date, expiry_date, notes },
        req.user!.userId,
      );
      sendSuccess(res, insurance, 'Đã thêm bảo hiểm', 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'insurance',
        entityId: insurance.id,
        entityLabel: `Insurance #${insurance.id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message?: string };
        if (e.code === 'VALIDATION_ERROR') {
          sendError(res, e.message || 'Dữ liệu không hợp lệ', 400);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm bảo hiểm', 500, error);
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
      const { purchase_date, expiry_date, notes } = req.body;

      if (purchase_date && expiry_date && new Date(expiry_date) <= new Date(purchase_date)) {
        sendError(res, 'Ngày hết hạn phải sau ngày mua', 400);
        return;
      }

      const insurance = await insuranceService.update(id, { purchase_date, expiry_date, notes });
      sendSuccess(res, insurance, 'Đã cập nhật bảo hiểm');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'insurance',
        entityId: id,
        entityLabel: `Insurance #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi bảo hiểm', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật bảo hiểm', 500, error);
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
      await insuranceService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa bảo hiểm');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'insurance',
        entityId: id,
        entityLabel: `Insurance #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi bảo hiểm', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa bảo hiểm', 500, error);
    }
  },

  async getExpiring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const insurances = await insuranceService.getExpiring(days);
      sendSuccess(res, { insurances }, 'Danh sách bảo hiểm sắp hết hạn');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách', 500, error);
    }
  },

  async getVehicleSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await insuranceService.getVehicleSummary({ search, status, page, limit });
      sendSuccess(res, data, 'Danh sách xe');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe', 500, error);
    }
  },

  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file', 400);
        return;
      }

      const image = await insuranceService.addImage(id, req.file);
      sendSuccess(res, image, 'Đã upload file', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi bảo hiểm', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload file', 500, error);
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
      await insuranceService.deleteImage(imageId);
      sendSuccess(res, undefined, 'Đã xóa file');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy file', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa file', 500, error);
    }
  },

  async serveFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const url = await storageService.getPublicUrl(filename);
      res.redirect(302, url);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NoSuchKey' || e.code === 'NotFound') {
          sendError(res, 'Không tìm thấy file', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải file', 500, error);
    }
  },
};
