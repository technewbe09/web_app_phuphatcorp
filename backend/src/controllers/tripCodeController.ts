import { Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { tripCodeService } from '../services/tripCodeService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const tripCodeCreateSchema: ValidationChain[] = [
  body('ma').notEmpty().withMessage('Mã là bắt buộc').isLength({ max: 100 }).withMessage('Mã tối đa 100 ký tự'),
  body('tuyen').notEmpty().withMessage('Tuyến là bắt buộc').isLength({ max: 255 }).withMessage('Tuyến tối đa 255 ký tự'),
  body('so_tien').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Số tiền không được âm'),
  body('so_luot').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Số lượt phải >= 1'),
  body('boc_xep').optional({ nullable: true }).isIn(['yes', 'no']).withMessage("Bốc xếp phải là 'yes' hoặc 'no'"),
  body('ghi_chu').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('Ghi chú tối đa 1000 ký tự'),
];

export const tripCodeUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  ...tripCodeCreateSchema,
];

export const tripCodeDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const tripCodeUploadSchema: ValidationChain[] = [
  body('rows').isArray({ min: 1 }).withMessage('Dữ liệu upload không được trống'),
  body('rows.*.ma').notEmpty().withMessage('Mã là bắt buộc').isLength({ max: 100 }).withMessage('Mã tối đa 100 ký tự'),
  body('rows.*.tuyen').notEmpty().withMessage('Tuyến là bắt buộc').isLength({ max: 255 }).withMessage('Tuyến tối đa 255 ký tự'),
  body('rows.*.so_tien').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Số tiền không được âm'),
  body('rows.*.so_luot').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Số lượt phải >= 1'),
];

export const tripCodeController = {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await tripCodeService.list();
      sendSuccess(res, data, 'Danh sách mã chuyến');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách mã chuyến', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu } = req.body;
      const row = await tripCodeService.create({ ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu });
      sendSuccess(res, row, 'Tạo mã chuyến thành công', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; ma?: string };
        if (e.code === 'DUPLICATE_MA') {
          sendError(res, `Mã '${e.ma}' đã tồn tại`, 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tạo mã chuyến', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu } = req.body;
      const newRow = await tripCodeService.softUpdate(id, { ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu });
      sendSuccess(res, { newRow }, 'Cập nhật mã chuyến thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; ma?: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Mã chuyến không tồn tại hoặc đã bị xóa', 404);
          return;
        }
        if (e.code === 'DUPLICATE_MA') {
          sendError(res, `Mã '${e.ma}' đã tồn tại`, 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật mã chuyến', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await tripCodeService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa mã chuyến');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Mã chuyến không tồn tại hoặc đã bị xóa', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa mã chuyến', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = req.body;
      const result = await tripCodeService.uploadMany(rows);
      sendSuccess(res, result, `Đã upload ${result.inserted} dòng thành công`);
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
