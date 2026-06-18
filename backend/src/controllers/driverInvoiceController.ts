import { Response } from 'express';
import { body, param, query, ValidationChain } from 'express-validator';
import { driverInvoiceService } from '../services/driverInvoiceService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services/auditService';

export const driverInvoiceListSchema: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('ma').optional().isString(),
  query('ten_tx').optional().isString(),
  query('ngay_from').optional().isString(),
  query('ngay_to').optional().isString(),
  query('so_xe').optional().isString(),
  query('noi_giao').optional().isString(),
  query('so_hoa_don').optional().isString(),
  query('ghi_chu').optional().isString(),
];

export const driverInvoiceDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const driverInvoiceUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('ma')
    .notEmpty().withMessage('Mã là bắt buộc')
    .isLength({ max: 50 }).withMessage('Mã tối đa 50 ký tự'),
  body('ten_tx')
    .notEmpty().withMessage('Tên tài xế là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên tài xế tối đa 255 ký tự'),
  body('ngay')
    .notEmpty().withMessage('Ngày là bắt buộc'),
  body('so_xe')
    .notEmpty().withMessage('Số xe là bắt buộc')
    .isLength({ max: 50 }).withMessage('Số xe tối đa 50 ký tự'),
  body('noi_giao')
    .notEmpty().withMessage('Nơi giao là bắt buộc')
    .isLength({ max: 255 }).withMessage('Nơi giao tối đa 255 ký tự'),
  body('ghi_chu').optional({ nullable: true }),
  body('so_hoa_don')
    .isArray().withMessage('so_hoa_don phải là mảng'),
];

export const driverInvoiceCreateSchema: ValidationChain[] = [
  body('ma')
    .notEmpty().withMessage('Mã là bắt buộc')
    .isLength({ max: 50 }).withMessage('Mã tối đa 50 ký tự'),
  body('ten_tx')
    .notEmpty().withMessage('Tên tài xế là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên tài xế tối đa 255 ký tự'),
  body('ngay')
    .notEmpty().withMessage('Ngày là bắt buộc'),
  body('so_xe')
    .notEmpty().withMessage('Số xe là bắt buộc')
    .isLength({ max: 50 }).withMessage('Số xe tối đa 50 ký tự'),
  body('noi_giao')
    .notEmpty().withMessage('Nơi giao là bắt buộc')
    .isLength({ max: 255 }).withMessage('Nơi giao tối đa 255 ký tự'),
  body('ghi_chu').optional({ nullable: true }),
  body('so_hoa_don')
    .isArray({ min: 1 }).withMessage('Cần ít nhất 1 số hóa đơn'),
];

export const driverInvoiceUploadSchema: ValidationChain[] = [
  body('rows').isArray({ min: 1 }).withMessage('Dữ liệu upload không được trống'),
  body('rows.*.ma')
    .notEmpty().withMessage('Mã là bắt buộc')
    .isLength({ max: 50 }).withMessage('Mã tối đa 50 ký tự'),
  body('rows.*.ten_tx')
    .notEmpty().withMessage('Tên tài xế là bắt buộc')
    .isLength({ max: 255 }).withMessage('Tên tài xế tối đa 255 ký tự'),
  body('rows.*.ngay')
    .notEmpty().withMessage('Ngày là bắt buộc'),
  body('rows.*.so_xe')
    .notEmpty().withMessage('Số xe là bắt buộc')
    .isLength({ max: 50 }).withMessage('Số xe tối đa 50 ký tự'),
  body('rows.*.noi_giao')
    .notEmpty().withMessage('Nơi giao là bắt buộc')
    .isLength({ max: 255 }).withMessage('Nơi giao tối đa 255 ký tự'),
  body('rows.*.ghi_chu')
    .optional({ nullable: true }),
  body('rows.*.so_hoa_don')
    .isArray().withMessage('so_hoa_don phải là mảng'),
  body('original_filename')
    .optional().isString(),
  body('skip_duplicates')
    .optional().isBoolean(),
];

export const driverInvoiceController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        ma: req.query.ma as string | undefined,
        ten_tx: req.query.ten_tx as string | undefined,
        ngay_from: req.query.ngay_from as string | undefined,
        ngay_to: req.query.ngay_to as string | undefined,
        so_xe: req.query.so_xe as string | undefined,
        noi_giao: req.query.noi_giao as string | undefined,
        so_hoa_don: req.query.so_hoa_don as string | undefined,
        ghi_chu: req.query.ghi_chu as string | undefined,
      };
      const result = await driverInvoiceService.list(filters);
      sendSuccess(res, result, 'Danh sách hóa đơn tài xế');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách hóa đơn tài xế', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ma, ten_tx, ngay, so_xe, noi_giao, ghi_chu, so_hoa_don } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const result = await driverInvoiceService.create(
        { ma, ten_tx, ngay, so_xe, noi_giao, ghi_chu: ghi_chu ?? null, so_hoa_don },
        userId,
      );

      const message = result.reconciled_count && result.reconciled_count > 0
        ? `Đã tạo hóa đơn, cập nhật ${result.reconciled_count} hóa đơn đối chiếu`
        : 'Đã tạo hóa đơn tài xế';

      sendSuccess(res, result, message, 201);

      auditService.logAudit({
        userId,
        username: req.user?.email || 'unknown',
        action: 'CREATE',
        entityType: 'driver_invoice',
        entityId: result.id,
        entityLabel: `Invoice #${result.id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tạo hóa đơn tài xế', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const record = await driverInvoiceService.findById(id);
      if (!record) {
        sendError(res, 'Không tìm thấy hóa đơn', 404);
        return;
      }
      sendSuccess(res, record);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải chi tiết hóa đơn', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows, original_filename, skip_duplicates } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const result = await driverInvoiceService.uploadMany(
        rows,
        original_filename || '',
        userId,
        skip_duplicates === true,
      );

      if (result.duplicates.length > 0 && !skip_duplicates) {
        res.status(409).json({
          success: false,
          message: `Phát hiện ${result.duplicates.length} dòng trùng lặp`,
          data: {
            duplicates: result.duplicates,
            new_count: rows.length - result.duplicates.length,
            duplicate_count: result.duplicates.length,
          },
          error_code: 'DUPLICATE_INVOICES',
        });
        return;
      }

      const message = result.duplicates.length > 0
        ? `Đã import ${result.inserted} bản ghi, bỏ qua ${result.duplicates.length} dòng trùng`
        : `Đã import ${result.inserted} bản ghi`;

      sendSuccess(res, result, message, 201);

      auditService.logAudit({
        userId,
        username: req.user?.email || 'unknown',
        action: 'UPLOAD',
        entityType: 'driver_invoice',
        entityLabel: original_filename || 'Batch upload',
        details: { inserted: result.inserted, duplicates: result.duplicates.length },
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload dữ liệu', 500, error);
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await driverInvoiceService.delete(id);
      sendSuccess(res, undefined, 'Đã xóa hóa đơn');

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'driver_invoice',
        entityId: id,
        entityLabel: `Invoice #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy hóa đơn', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa hóa đơn', 500, error);
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { ma, ten_tx, ngay, so_xe, noi_giao, ghi_chu, so_hoa_don } = req.body;
      const row = await driverInvoiceService.update(id, {
        ma,
        ten_tx,
        ngay,
        so_xe,
        noi_giao,
        ghi_chu: ghi_chu ?? null,
        so_hoa_don,
      });
      const message = row.reconciled_count && row.reconciled_count > 0
        ? `Cập nhật thành công, cập nhật ${row.reconciled_count} hóa đơn đối chiếu`
        : 'Cập nhật hóa đơn thành công';
      sendSuccess(res, row, message);

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'driver_invoice',
        entityId: id,
        entityLabel: `Invoice #${id}`,
        ipAddress: req.ip,
      });

    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy hóa đơn', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật hóa đơn', 500, error);
    }
  },
};
