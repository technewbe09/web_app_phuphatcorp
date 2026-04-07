import { Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { vehicleService } from '../services/vehicleService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const vehicleCreateSchema: ValidationChain[] = [
  body('bien_so').notEmpty().withMessage('Biển số là bắt buộc').isLength({ max: 50 }).withMessage('Biển số tối đa 50 ký tự'),
  body('loai').notEmpty().withMessage('Loại xe là bắt buộc').isIn(['Xe lớn', 'Xe nhỏ']).withMessage("Loại phải là 'Xe lớn' hoặc 'Xe nhỏ'"),
  body('tai_xe').optional({ nullable: true }).isArray().withMessage('Tài xế phải là mảng'),
  body('tai_xe.*').optional().isString().isLength({ max: 100 }).withMessage('Tên tài xế tối đa 100 ký tự'),
];

export const vehicleUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  ...vehicleCreateSchema,
];

export const vehicleDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const vehicleUploadSchema: ValidationChain[] = [
  body('rows').isArray({ min: 1 }).withMessage('Dữ liệu upload không được trống'),
  body('rows.*.bien_so').notEmpty().withMessage('Biển số là bắt buộc').isLength({ max: 50 }).withMessage('Biển số tối đa 50 ký tự'),
  body('rows.*.loai').notEmpty().withMessage('Loại xe là bắt buộc'),
  body('rows.*.tai_xe').optional({ nullable: true }).isArray().withMessage('Tài xế phải là mảng'),
];

export const vehicleController = {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await vehicleService.list();
      sendSuccess(res, data, 'Danh sách xe');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { bien_so, loai, tai_xe } = req.body;
      const vehicle = await vehicleService.create({ bien_so, loai, tai_xe });
      sendSuccess(res, vehicle, 'Tạo xe thành công', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; bien_so?: string; loai?: string };
        if (e.code === 'DUPLICATE_BIEN_SO') {
          sendError(res, `Biển số '${e.bien_so}' đã tồn tại`, 409);
          return;
        }
        if (e.code === 'INVALID_LOAI') {
          sendError(res, `Loại '${e.loai}' không hợp lệ`, 400);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tạo xe', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { bien_so, loai, tai_xe } = req.body;
      const newVehicle = await vehicleService.softUpdate(id, { bien_so, loai, tai_xe });
      sendSuccess(res, { newVehicle }, 'Cập nhật xe thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; bien_so?: string; loai?: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Xe không tồn tại hoặc đã bị xóa', 404);
          return;
        }
        if (e.code === 'DUPLICATE_BIEN_SO') {
          sendError(res, `Biển số '${e.bien_so}' đã tồn tại`, 409);
          return;
        }
        if (e.code === 'INVALID_LOAI') {
          sendError(res, `Loại '${e.loai}' không hợp lệ`, 400);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật xe', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await vehicleService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa xe');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Xe không tồn tại hoặc đã bị xóa', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa xe', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = req.body;
      const result = await vehicleService.uploadMany(rows);
      sendSuccess(res, result, `Đã upload ${result.inserted} xe thành công`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; errors?: unknown[] };
        if (e.code === 'UPLOAD_ERRORS') {
          res.status(422).json({ success: false, message: 'Có lỗi khi upload', data: { errors: e.errors } });
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload dữ liệu', 500, error);
    }
  },
};
