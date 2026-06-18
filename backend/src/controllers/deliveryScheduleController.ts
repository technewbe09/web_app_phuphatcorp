import { Response } from 'express';
import { body, query, ValidationChain } from 'express-validator';
import { deliveryScheduleService } from '../services/deliveryScheduleService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const deliveryScheduleUploadSchema: ValidationChain[] = [
  body('from_date')
    .notEmpty()
    .withMessage('From date là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('From date phải có định dạng YYYY-MM-DD'),
  body('to_date')
    .notEmpty()
    .withMessage('To date là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('To date phải có định dạng YYYY-MM-DD')
    .custom((value, { req }) => {
      if (req.body.from_date && value < req.body.from_date) {
        throw new Error('To date phải >= From date');
      }
      return true;
    }),
];

export const deliveryScheduleListSchema: ValidationChain[] = [
  query('from_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('From date phải có định dạng YYYY-MM-DD'),
  query('to_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('To date phải có định dạng YYYY-MM-DD'),
  query('search').optional().isString().withMessage('Search phải là chuỗi'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page phải >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải trong khoảng 1-100'),
];

export const deliveryScheduleStatisticsSchema: ValidationChain[] = [
  query('fromDate')
    .notEmpty()
    .withMessage('fromDate là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('fromDate phải có định dạng YYYY-MM-DD'),
  query('toDate')
    .notEmpty()
    .withMessage('toDate là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('toDate phải có định dạng YYYY-MM-DD')
    .custom((value, { req }) => {
      const fromDate = req.query?.fromDate as string;
      if (fromDate && value < fromDate) {
        throw new Error('toDate phải >= fromDate');
      }
      const today = new Date().toISOString().split('T')[0];
      if (value > today) {
        throw new Error('toDate không được lớn hơn hôm nay');
      }
      return true;
    }),
];

export const deliveryScheduleDeleteSchema: ValidationChain[] = [
  body('from_date')
    .notEmpty()
    .withMessage('From date là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('From date phải có định dạng YYYY-MM-DD'),
  body('to_date')
    .notEmpty()
    .withMessage('To date là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('To date phải có định dạng YYYY-MM-DD'),
];

export const deliveryScheduleUpdateSchema: ValidationChain[] = [
  body('ngay')
    .notEmpty().withMessage('Ngày là bắt buộc')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Ngày phải có định dạng YYYY-MM-DD'),
  body('stt')
    .notEmpty().withMessage('STT là bắt buộc')
    .isInt({ min: 1 }).withMessage('STT phải là số nguyên dương'),
  body('noi_giao').optional({ nullable: true }).isString(),
  body('tan').optional({ nullable: true }).isFloat().withMessage('Tấn phải là số'),
  body('so_xe').optional({ nullable: true }).isString(),
  body('can_info').optional({ nullable: true }).isString(),
  body('ghi_chu').optional({ nullable: true }).isString(),
  body('loai').optional({ nullable: true }).isIn(['Giá tấn', 'Giá chuyến']).withMessage('Loại phải là Giá tấn hoặc Giá chuyến'),
];

export const deliveryScheduleController = {
  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file Excel', 400);
        return;
      }

      const { from_date, to_date } = req.body;
      const userId = req.user!.userId;

      const result = await deliveryScheduleService.upload(
        req.file.path,
        from_date,
        to_date,
        userId
      );

      sendSuccess(
        res,
        {
          total_sheets_processed: result.total_sheets_processed,
          total_rows_inserted: result.total_rows_inserted,
          date_range: {
            from: from_date,
            to: to_date
          }
        },
        'Upload thành công',
        200
      );
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPLOAD',
        entityType: 'delivery_schedule',
        entityLabel: req.file?.originalname || 'Excel file',
        ipAddress: req.ip,
        details: { fromDate: from_date, toDate: to_date, rowCount: result.total_rows_inserted },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; errors?: any[] };
        if (e.code === 'VALIDATION_ERRORS' && e.errors) {
          res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: 'Có lỗi trong dữ liệu',
            details: e.errors
          });
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload file', 500, error);
    }
  },

  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters = {
        from_date: req.query.from_date as string | undefined,
        to_date: req.query.to_date as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const result = await deliveryScheduleService.list(filters);

      sendSuccess(
        res,
        {
          schedules: result.schedules,
          meta: result.meta
        },
        'Lấy danh sách thành công',
        200
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách lịch đi hàng', 500, error);
    }
  },

  async getStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;

      const result = await deliveryScheduleService.getStatistics(fromDate, toDate);

      sendSuccess(res, result, 'Lấy thống kê thành công', 200);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải thống kê', 500, error);
    }
  },

  async deleteByDateRange(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { from_date, to_date } = req.body;

      const deletedCount = await deliveryScheduleService.deleteByDateRange(
        from_date,
        to_date
      );

      sendSuccess(
        res,
        { deleted_count: deletedCount },
        'Xóa thành công',
        200
      );
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'delivery_schedule',
        entityLabel: `Date range: ${from_date} - ${to_date}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa dữ liệu', 500, error);
    }
  },

  async deleteById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendError(res, 'ID không hợp lệ', 400);
        return;
      }
      const deleted = await deliveryScheduleService.deleteById(id);
      if (!deleted) {
        sendError(res, 'Không tìm thấy bản ghi', 404);
        return;
      }
      sendSuccess(res, { id }, 'Xóa thành công', 200);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'delivery_schedule',
        entityId: id,
        entityLabel: `#${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa bản ghi', 500, error);
    }
  },

  async updateById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendError(res, 'ID không hợp lệ', 400);
        return;
      }
      const { ngay, stt, noi_giao, tan, so_xe, can_info, ghi_chu, loai } = req.body;
      const updated = await deliveryScheduleService.updateById(id, {
        ngay,
        stt: parseInt(stt, 10),
        noi_giao: noi_giao ?? null,
        tan: tan != null && tan !== '' ? parseFloat(tan) : null,
        so_xe: so_xe ?? null,
        can_info: can_info ?? null,
        ghi_chu: ghi_chu ?? null,
        loai: loai ?? null,
      });
      if (!updated) {
        sendError(res, 'Không tìm thấy bản ghi', 404);
        return;
      }
      sendSuccess(res, updated, 'Cập nhật thành công', 200);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'delivery_schedule',
        entityId: id,
        entityLabel: `#${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật bản ghi', 500, error);
    }
  },
};
