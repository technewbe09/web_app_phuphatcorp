import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { vehicleService } from '../services/vehicleService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const vehicleDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const vehicleCreateSchema = [
  body('driver_name')
    .notEmpty().withMessage('Tên tài xế là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên tài xế tối đa 255 ký tự'),
  body('plate_number')
    .notEmpty().withMessage('Biển số là bắt buộc')
    .isLength({ max: 20 }).withMessage('Biển số tối đa 20 ký tự'),
  body('vehicle_type')
    .optional()
    .isIn(['Xe nhà', 'Xe ngoài']).withMessage('Phân loại không hợp lệ'),
];

export const vehicleUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('driver_name')
    .notEmpty().withMessage('Tên tài xế là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên tài xế tối đa 255 ký tự'),
  body('vehicle_type')
    .optional()
    .isIn(['Xe nhà', 'Xe ngoài']).withMessage('Phân loại không hợp lệ'),
];

export const oilIntervalSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('oil_change_interval_km')
    .isInt({ min: 0 }).withMessage('Ngưỡng km phải là số nguyên >= 0'),
];

export const vehicleController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const vehicle_type = req.query.vehicle_type as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await vehicleService.getAll(search, status, vehicle_type, page, limit);
      sendSuccess(res, data, 'Danh sách xe');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { driver_name, plate_number, vehicle_type } = req.body;
      const vehicle = await vehicleService.create({ driver_name, plate_number, vehicle_type });
      sendSuccess(res, vehicle, 'Thêm xe thành công', 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'vehicle',
        entityId: vehicle.id,
        entityLabel: vehicle.plate_number,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message?: string };
        if (e.code === 'INVALID_PLATE') {
          sendError(res, e.message || 'Biển số không đúng định dạng', 400);
          return;
        }
        if (e.code === 'DUPLICATE_PLATE') {
          sendError(res, e.message || 'Biển số đã tồn tại', 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm xe', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file Excel', 400);
        return;
      }

      const { result, errors } = await vehicleService.uploadFromExcel(req.file.buffer);

      if (errors) {
        res.status(422).json({
          success: false,
          message: `Có ${errors.length} lỗi — không có dữ liệu nào được lưu:`,
          data: { errors },
        });
        return;
      }

      if (!result) {
        sendError(res, 'Không có dữ liệu để import', 400);
        return;
      }

      const msg = result.reactivated > 0
        ? `Đã import ${result.imported} xe, kích hoạt lại ${result.reactivated} xe`
        : `Đã import ${result.imported} xe`;

      sendSuccess(res, result, msg, 201);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPLOAD',
        entityType: 'vehicle',
        entityLabel: 'Batch upload',
        ipAddress: req.ip,
        details: { imported: result.imported, reactivated: result.reactivated },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload dữ liệu', 500, error);
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
      await vehicleService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa xe');
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'vehicle',
        entityId: id,
        entityLabel: `Vehicle #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa xe', 500, error);
    }
  },

  async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id, 10);
      const vehicle = await vehicleService.toggleStatus(id);
      const label = vehicle.status === 'active' ? 'kích hoạt' : 'vô hiệu hóa';
      sendSuccess(res, vehicle, `Đã ${label} xe ${vehicle.plate_number}`);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: vehicle.status === 'active' ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'vehicle',
        entityId: id,
        entityLabel: vehicle.plate_number,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật trạng thái xe', 500, error);
    }
  },

  async updateOilInterval(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id, 10);
      const { oil_change_interval_km } = req.body;
      const vehicle = await vehicleService.updateOilInterval(id, oil_change_interval_km);
      sendSuccess(res, vehicle, `Đã cập nhật ngưỡng thay nhớt cho xe ${vehicle.plate_number}`);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'vehicle',
        entityId: id,
        entityLabel: vehicle.plate_number,
        ipAddress: req.ip,
        details: { oil_change_interval_km },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật ngưỡng thay nhớt', 500, error);
    }
  },

  async summary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await vehicleService.getSummary(id);
      sendSuccess(res, data, 'Thông tin tổng hợp xe');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải thông tin tổng hợp', 500, error);
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
      const { driver_name, vehicle_type } = req.body;
      const vehicle = await vehicleService.update(id, { driver_name, vehicle_type });
      sendSuccess(res, vehicle, `Đã cập nhật xe ${vehicle.plate_number}`);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'vehicle',
        entityId: id,
        entityLabel: vehicle.plate_number,
        ipAddress: req.ip,
        details: { driver_name },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy xe', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật xe', 500, error);
    }
  },
};
