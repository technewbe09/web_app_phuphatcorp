import { Response } from 'express';
import { body, param, query, ValidationChain } from 'express-validator';
import { deliveryDataService } from '../services/deliveryDataService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const importFileSchema: ValidationChain[] = [];

export const listBatchesSchema: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
];

export const getBatchRowsSchema: ValidationChain[] = [
  body('batch_ids').isArray({ min: 1 }).withMessage('Cần ít nhất 1 batch ID'),
  body('batch_ids.*').isString().withMessage('Mỗi batch ID phải là string'),
];

export const deleteBatchSchema: ValidationChain[] = [
  param('batchId').notEmpty().withMessage('Batch ID là bắt buộc'),
];

export const deliveryDataController = {
  async importFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        sendError(res, 'Vui lòng chọn file để upload', 400);
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const originalFilename = file.originalname || 'unknown.xlsx';

      const result = await deliveryDataService.importFromExcel(
        file.buffer,
        originalFilename,
        userId,
      );

      sendSuccess(res, result, 'Import hoàn tất', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message?: string };
        if (e.code === 'EMPTY_FILE') {
          sendError(res, e.message || 'File không có dữ liệu', 400);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể import dữ liệu', 500, error);
    }
  },

  async listBatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await deliveryDataService.listBatches(page, limit);
      sendSuccess(res, result, 'Danh sách batch');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách batch', 500, error);
    }
  },

  async getBatchStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const result = await deliveryDataService.getBatchStats(batchId);
      if (!result) {
        sendError(res, 'Không tìm thấy batch', 404);
        return;
      }
      sendSuccess(res, result);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải thông tin batch', 500, error);
    }
  },

  async deleteBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const result = await deliveryDataService.deleteBatch(batchId);
      sendSuccess(res, result, 'Đã xóa batch và dữ liệu liên quan');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa batch', 500, error);
    }
  },

  async getBatchRows(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { batch_ids } = req.body as { batch_ids: string[] };
      const result = await deliveryDataService.getBatchRows(batch_ids);
      sendSuccess(res, result, `Đã tải dữ liệu từ ${result.batch_ids.length} batch`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message?: string };
        if (e.code === 'NO_DATA') {
          sendError(res, e.message || 'Batch không có dữ liệu', 400);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải dữ liệu batch', 500, error);
    }
  },
};
