import { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { repairService } from '../services/repairService';
import { storageService } from '../services/storageService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const repairCreateSchema = [
  body('vehicle_id')
    .isInt({ min: 1 }).withMessage('Vui lòng chọn xe'),
  body('repair_date')
    .notEmpty().withMessage('Vui lòng chọn ngày sửa')
    .isISO8601().withMessage('Ngày không hợp lệ'),
  body('garage_name')
    .notEmpty().withMessage('Vui lòng nhập tên gara')
    .isString(),
  body('items')
    .isArray({ min: 1 }).withMessage('Phải có ít nhất 1 hạng mục'),
  body('items.*.item_name')
    .notEmpty().withMessage('Vui lòng nhập tên hạng mục')
    .isString(),
  body('items.*.parts_cost')
    .isInt({ min: 0 }).withMessage('Tiền phụ tùng không được âm'),
  body('items.*.labor_cost')
    .isInt({ min: 0 }).withMessage('Tiền công không được âm'),
  body('notes').optional().isString(),
];

export const repairUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('repair_date').optional().isISO8601().withMessage('Ngày không hợp lệ'),
  body('garage_name').optional().isString(),
  body('items').optional().isArray({ min: 1 }).withMessage('Phải có ít nhất 1 hạng mục'),
  body('items.*.item_name').optional().isString(),
  body('items.*.parts_cost').optional().isInt({ min: 0 }),
  body('items.*.labor_cost').optional().isInt({ min: 0 }),
  body('notes').optional().isString(),
];

export const repairDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const repairImageDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  param('imageId').isInt({ min: 1 }).withMessage('Image ID không hợp lệ'),
];

export const repairController = {
  async summary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await repairService.getSummary({ search, page, limit });
      sendSuccess(res, data, 'Danh sách lịch sử sửa xe');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách', 500, error);
    }
  },

  async listByVehicle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = parseInt(req.params.vehicleId, 10);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await repairService.listByVehicle(vehicleId, { page, limit });
      sendSuccess(res, data, 'Lịch sử sửa xe');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải lịch sử', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const repair = await repairService.getById(id);
      if (!repair) {
        sendError(res, 'Không tìm thấy bill sửa xe', 404);
        return;
      }
      sendSuccess(res, repair, 'Chi tiết sửa xe');
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

      const { vehicle_id, repair_date, garage_name, notes, items } = req.body;
      const repair = await repairService.create(
        { vehicle_id, repair_date, garage_name, notes, items },
        req.user!.userId,
      );
      sendSuccess(res, repair, 'Đã thêm bill sửa xe', 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'repair',
        entityId: repair.id,
        entityLabel: `Repair #${repair.id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm bill sửa xe', 500, error);
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
      const { repair_date, garage_name, notes, items } = req.body;

      const repair = await repairService.update(id, {
        repair_date,
        garage_name,
        notes,
        items,
      });
      sendSuccess(res, repair, 'Đã cập nhật bill sửa xe');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'repair',
        entityId: id,
        entityLabel: `Repair #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bill sửa xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật bill sửa xe', 500, error);
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
      await repairService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa bill sửa xe');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'repair',
        entityId: id,
        entityLabel: `Repair #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bill sửa xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa bill sửa xe', 500, error);
    }
  },

  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file ảnh', 400);
        return;
      }

      const image = await repairService.addImage(id, req.file);
      sendSuccess(res, image, 'Đã upload ảnh', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bill sửa xe', 404);
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
      await repairService.deleteImage(imageId);
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
