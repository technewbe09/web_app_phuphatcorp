import { Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { supplierService } from '../services/supplierService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const supplierCreateSchema: ValidationChain[] = [
  body('supplier_code')
    .notEmpty().withMessage('Mã NCC là bắt buộc')
    .isLength({ max: 20 }).withMessage('Mã NCC tối đa 20 ký tự'),
  body('name')
    .notEmpty().withMessage('Tên nhà máy là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên nhà máy tối đa 255 ký tự'),
  body('notes')
    .optional({ nullable: true }),
];

export const supplierUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  ...supplierCreateSchema,
];

export const supplierDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const supplierUploadSchema: ValidationChain[] = [
  body('rows').isArray({ min: 1 }).withMessage('Dữ liệu upload không được trống'),
  body('rows.*.supplier_code')
    .notEmpty().withMessage('Mã NCC là bắt buộc')
    .isLength({ max: 20 }).withMessage('Mã NCC tối đa 20 ký tự'),
  body('rows.*.name')
    .notEmpty().withMessage('Tên nhà máy là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên nhà máy tối đa 255 ký tự'),
];

export const supplierController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await supplierService.list(search, page, limit);
      sendSuccess(res, data, 'Danh sách nhà cung cấp');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách nhà cung cấp', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { supplier_code, name, notes } = req.body;

      const existing = await supplierService.findByCode(supplier_code);
      if (existing) {
        sendError(res, 'Mã NCC đã tồn tại', 409);
        return;
      }

      const row = await supplierService.create({ supplier_code, name, notes: notes ?? null });
      sendSuccess(res, row, 'Thêm nhà cung cấp thành công', 201);
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm nhà cung cấp', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { supplier_code, name, notes } = req.body;

      const duplicate = await supplierService.findByCode(supplier_code, id);
      if (duplicate) {
        sendError(res, 'Mã NCC đã tồn tại', 409);
        return;
      }

      const row = await supplierService.update(id, { supplier_code, name, notes: notes ?? null });
      sendSuccess(res, row, 'Cập nhật nhà cung cấp thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy nhà cung cấp', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật nhà cung cấp', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await supplierService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa nhà cung cấp');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy nhà cung cấp', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa nhà cung cấp', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = req.body;
      const result = await supplierService.uploadMany(rows);
      sendSuccess(res, result, `Đã import ${result.inserted} nhà cung cấp thành công`, 201);
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
