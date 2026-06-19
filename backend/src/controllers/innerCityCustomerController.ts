import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { innerCityCustomerService } from '../services/innerCityCustomerService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const innerCityCustomerCreateSchema = [
  body('customer_name')
    .notEmpty().withMessage('Tên khách hàng là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên khách hàng tối đa 255 ký tự'),
  body('customer_code')
    .notEmpty().withMessage('Mã khách hàng là bắt buộc')
    .isLength({ max: 100 }).withMessage('Mã khách hàng tối đa 100 ký tự'),
  body('notes')
    .optional({ nullable: true }),
];

export const innerCityCustomerUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  ...innerCityCustomerCreateSchema,
];

export const innerCityCustomerDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const innerCityCustomerController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const data = await innerCityCustomerService.getAll(search, page, limit);
      sendSuccess(res, data, 'Danh sách khách hàng nội thành');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { customer_name, customer_code, notes } = req.body;
      const row = await innerCityCustomerService.create({ customer_name, customer_code, notes });
      sendSuccess(res, row, 'Thêm khách hàng thành công', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'DUPLICATE_CODE') {
          sendError(res, 'Mã khách hàng đã tồn tại', 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể thêm khách hàng', 500, error);
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
      const { customer_name, customer_code, notes } = req.body;
      const row = await innerCityCustomerService.update(id, { customer_name, customer_code, notes });
      sendSuccess(res, row, 'Cập nhật khách hàng thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy khách hàng', 404);
          return;
        }
        if (e.code === 'DUPLICATE_CODE') {
          sendError(res, 'Mã khách hàng đã tồn tại', 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật khách hàng', 500, error);
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
      await innerCityCustomerService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa khách hàng');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy khách hàng', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa khách hàng', 500, error);
    }
  },
};
