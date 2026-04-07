import { Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { driverService } from '../services/driverService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const driverCreateSchema: ValidationChain[] = [
  body('ten_ky_hieu')
    .notEmpty().withMessage('Tên ký hiệu là bắt buộc')
    .isLength({ max: 100 }).withMessage('Tên ký hiệu tối đa 100 ký tự'),
  body('ho_ten').optional({ nullable: true }).isLength({ max: 255 }).withMessage('Họ tên tối đa 255 ký tự'),
  body('lien_he').optional({ nullable: true }).isLength({ max: 100 }).withMessage('Liên hệ tối đa 100 ký tự'),
  body('cccd').optional({ nullable: true }).isLength({ max: 50 }).withMessage('CCCD tối đa 50 ký tự'),
  body('ghi_chu').optional({ nullable: true }).isString(),
];

export const driverUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  ...driverCreateSchema,
];

export const driverDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const driverDocParamSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const driverDocDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  param('docId').isInt({ min: 1 }).withMessage('Doc ID không hợp lệ'),
];

export const driverUploadDocSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('file_name').notEmpty().withMessage('Tên file là bắt buộc').isLength({ max: 255 }),
  body('mime_type').optional({ nullable: true }).isString(),
  body('file_data').notEmpty().withMessage('Dữ liệu file là bắt buộc').isString(),
  body('file_size').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Kích thước file không hợp lệ'),
];

export const driverController = {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await driverService.list();
      sendSuccess(res, data, 'Danh sách tài xế');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách tài xế', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu } = req.body;
      const driver = await driverService.create({ ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu });
      sendSuccess(res, driver, 'Tạo tài xế thành công', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; ten_ky_hieu?: string };
        if (e.code === 'DUPLICATE_TEN_KY_HIEU') {
          sendError(res, `Tên ký hiệu '${e.ten_ky_hieu}' đã tồn tại`, 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tạo tài xế', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu } = req.body;
      const driver = await driverService.update(id, { ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu });
      sendSuccess(res, driver, 'Cập nhật tài xế thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; ten_ky_hieu?: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Tài xế không tồn tại', 404);
          return;
        }
        if (e.code === 'DUPLICATE_TEN_KY_HIEU') {
          sendError(res, `Tên ký hiệu '${e.ten_ky_hieu}' đã tồn tại`, 409);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật tài xế', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await driverService.softDelete(id);
      sendSuccess(res, undefined, 'Đã xóa tài xế');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Tài xế không tồn tại', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa tài xế', 500, error);
    }
  },

  async getDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const driverId = parseInt(req.params.id, 10);
      const docs = await driverService.getDocuments(driverId);
      sendSuccess(res, docs, 'Danh sách tài liệu');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Tài xế không tồn tại', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách tài liệu', 500, error);
    }
  },

  async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const driverId = parseInt(req.params.id, 10);
      const { file_name, mime_type, file_data, file_size } = req.body;
      const doc = await driverService.uploadDocument(driverId, { file_name, mime_type, file_data, file_size });
      sendSuccess(res, doc, 'Upload tài liệu thành công', 201);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Tài xế không tồn tại', 404);
          return;
        }
        if (e.code === 'FILE_TOO_LARGE') {
          sendError(res, 'File không được vượt quá 5MB', 400);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload tài liệu', 500, error);
    }
  },

  async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const driverId = parseInt(req.params.id, 10);
      const docId = parseInt(req.params.docId, 10);
      await driverService.deleteDocument(driverId, docId);
      sendSuccess(res, undefined, 'Đã xóa tài liệu');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Tài liệu không tồn tại', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa tài liệu', 500, error);
    }
  },

  async downloadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const driverId = parseInt(req.params.id, 10);
      const docId = parseInt(req.params.docId, 10);
      const doc = await driverService.downloadDocument(driverId, docId);
      sendSuccess(res, doc, 'Tải tài liệu thành công');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Tài liệu không tồn tại', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải tài liệu', 500, error);
    }
  },
};
