import { Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { weightAdjustmentService } from '../services/weightAdjustmentService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const weightAdjustmentCreateSchema: ValidationChain[] = [
  body('ma_hang')
    .notEmpty().withMessage('Mã hàng hóa là bắt buộc')
    .isLength({ max: 100 }).withMessage('Mã hàng hóa tối đa 100 ký tự'),
  body('ten_hang')
    .notEmpty().withMessage('Tên hàng hóa là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên hàng hóa tối đa 255 ký tự'),
  body('gia_tri_cu')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Giá trị cũ phải >= 0'),
  body('gia_tri_dieu_chinh')
    .notEmpty().withMessage('Giá trị điều chỉnh là bắt buộc')
    .isFloat({ min: 0 }).withMessage('Giá trị điều chỉnh phải >= 0'),
];

export const weightAdjustmentUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  ...weightAdjustmentCreateSchema,
];

export const weightAdjustmentDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const weightAdjustmentUploadSchema: ValidationChain[] = [
  body('rows').isArray({ min: 1 }).withMessage('Dữ liệu upload không được trống'),
  body('rows.*.ma_hang')
    .notEmpty().withMessage('Mã hàng hóa là bắt buộc')
    .isLength({ max: 100 }).withMessage('Mã hàng hóa tối đa 100 ký tự'),
  body('rows.*.ten_hang')
    .notEmpty().withMessage('Tên hàng hóa là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên hàng hóa tối đa 255 ký tự'),
  body('rows.*.gia_tri_cu')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Giá trị cũ phải >= 0'),
  body('rows.*.gia_tri_dieu_chinh')
    .notEmpty().withMessage('Giá trị điều chỉnh là bắt buộc')
    .isFloat({ min: 0 }).withMessage('Giá trị điều chỉnh phải >= 0'),
];

export const weightAdjustmentController = {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await weightAdjustmentService.list();
      sendSuccess(res, data, 'Danh sách điều chỉnh trọng lượng');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách điều chỉnh trọng lượng', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh } = req.body;
      const userId = req.user!.userId;
      const row = await weightAdjustmentService.create(
        { ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh },
        userId,
      );
      sendSuccess(res, row, 'Thêm điều chỉnh trọng lượng thành công', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; ma_hang?: string };
        if (e.code === 'DUPLICATE_MA_HANG') {
          sendError(res, `Mã hàng hóa '${e.ma_hang}' đã tồn tại`, 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm điều chỉnh trọng lượng', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh } = req.body;
      const userId = req.user!.userId;
      const newRow = await weightAdjustmentService.softUpdate(
        id,
        { ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh },
        userId,
      );
      sendSuccess(res, { newRow }, 'Cập nhật điều chỉnh trọng lượng thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; ma_hang?: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Bản ghi không tồn tại hoặc đã bị xóa', 404);
          return;
        }
        if (e.code === 'DUPLICATE_MA_HANG') {
          sendError(res, `Mã hàng hóa '${e.ma_hang}' đã tồn tại`, 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật điều chỉnh trọng lượng', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.userId;
      await weightAdjustmentService.softDelete(id, userId);
      sendSuccess(res, undefined, 'Đã xóa bản ghi');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Bản ghi không tồn tại hoặc đã bị xóa', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa bản ghi', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = req.body;
      const userId = req.user!.userId;
      const result = await weightAdjustmentService.uploadMany(rows, userId);
      sendSuccess(res, result, `Đã import ${result.inserted} bản ghi thành công`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; errors?: unknown[] };
        if (e.code === 'UPLOAD_ERRORS') {
          res.status(422).json({
            success: false,
            message: 'Upload thất bại — có lỗi dữ liệu',
            data: { errors: e.errors },
          });
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload dữ liệu', 500, error);
    }
  },
};
