import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { vehicleService } from '../services/vehicleService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const vehicleDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const vehicleController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const data = await vehicleService.getAll(search, page, limit);
      sendSuccess(res, data, 'Danh sách xe');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe', 500, error);
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
};
