import { Response } from 'express';
import { body, param, query, ValidationChain } from 'express-validator';
import { invoiceTrackingService } from '../services/invoiceTrackingService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const invoiceTrackingListSchema: ValidationChain[] = [
  query('status')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const statuses = value.split(',').map((s) => s.trim());
        const allowed = ['created', 'pending_review', 'completed', 'request_supplement'];
        const invalid = statuses.filter((s) => !allowed.includes(s));
        if (invalid.length > 0) {
          throw new Error(`Status không hợp lệ: ${invalid.join(', ')}`);
        }
      }
      return true;
    }),
  query('date_from')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date_from phải có định dạng YYYY-MM-DD'),
  query('date_to')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date_to phải có định dạng YYYY-MM-DD'),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }).withMessage('page phải là số nguyên dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phải từ 1 đến 100'),
];

export const invoiceTrackingDetailSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const invoiceTrackingUploadSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('files')
    .isArray({ min: 1, max: 10 })
    .withMessage('files phải là array từ 1 đến 10 phần tử'),
  body('files.*.file_name').notEmpty().withMessage('file_name là bắt buộc').isString(),
  body('files.*.mime_type')
    .notEmpty()
    .withMessage('mime_type là bắt buộc')
    .isIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    .withMessage('mime_type phải là image/jpeg, image/png, image/webp hoặc application/pdf'),
  body('files.*.file_data').notEmpty().withMessage('file_data là bắt buộc').isString(),
  body('files.*.note').optional().isString(),
  body('driver_note').optional().isString(),
];

export const invoiceTrackingReviewSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('action')
    .notEmpty()
    .withMessage('action là bắt buộc')
    .isIn(['finish', 'request_supplement'])
    .withMessage("action phải là 'finish' hoặc 'request_supplement'"),
  body('supplement_note')
    .if(body('action').equals('request_supplement'))
    .notEmpty()
    .withMessage('supplement_note là bắt buộc khi action là request_supplement')
    .isLength({ min: 5 })
    .withMessage('supplement_note phải có ít nhất 5 ký tự'),
];

export const invoiceTrackingController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const statusParam = req.query.status as string | undefined;
      const status = statusParam ? statusParam.split(',').map((s) => s.trim()) : undefined;

      const filters = {
        status,
        date_from: req.query.date_from as string | undefined,
        date_to: req.query.date_to as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await invoiceTrackingService.list(filters, req.dataScope);
      sendSuccess(res, { items: result.data, pagination: result.pagination }, 'Danh sách ticket theo dõi hóa đơn');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách ticket', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const ticket = await invoiceTrackingService.getById(id, req.dataScope);
      sendSuccess(res, ticket, 'Chi tiết ticket');
    } catch (err) {
      if (err instanceof Error && err.name === 'InvoiceTrackingError') {
        const statusCode = (err as any).statusCode || 400;
        sendError(res, err.message, statusCode);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải chi tiết ticket', 500, error);
    }
  },

  async uploadDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { files, driver_note } = req.body;
      const ticket = await invoiceTrackingService.uploadDocuments(id, files, driver_note, req.dataScope);
      sendSuccess(res, ticket, 'Đã upload chứng từ thành công');
    } catch (err) {
      if (err instanceof Error && err.name === 'InvoiceTrackingError') {
        const statusCode = (err as any).statusCode || 400;
        sendError(res, err.message, statusCode);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload chứng từ', 500, error);
    }
  },

  async review(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { action, supplement_note } = req.body;
      const dispatcherId = req.user!.userId;
      const ticket = await invoiceTrackingService.review(id, action, dispatcherId, supplement_note);
      sendSuccess(res, ticket, 'Đã duyệt ticket thành công');
    } catch (err) {
      if (err instanceof Error && err.name === 'InvoiceTrackingError') {
        const statusCode = (err as any).statusCode || 400;
        sendError(res, err.message, statusCode);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể duyệt ticket', 500, error);
    }
  },
};
