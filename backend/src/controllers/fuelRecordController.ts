import { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { fuelRecordService } from '../services/fuelRecordService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';
import { AuthRequest } from '../middleware/auth';

export const fuelRecordCreateSchema = [
  body('vehicle_id').isInt({ min: 1 }).withMessage('ID xe không hợp lệ'),
  body('record_date').isDate().withMessage('Ngày không hợp lệ'),
  body('odometer_old').isFloat({ min: 0 }).withMessage('Số KM cũ không hợp lệ'),
  body('odometer_new').isFloat({ min: 0 }).withMessage('Số KM đổ không hợp lệ'),
  body('liters').isFloat({ min: 0 }).withMessage('Số lít không hợp lệ'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Đơn giá không hợp lệ'),
  body('gps_old').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('gps_new').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('gps_liters').optional({ values: 'null' }).isFloat({ min: 0 }),
];

export const fuelRecordUpdateSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
  body('vehicle_id').optional().isInt({ min: 1 }),
  body('record_date').optional().isDate(),
  body('odometer_old').optional().isFloat({ min: 0 }),
  body('odometer_new').optional().isFloat({ min: 0 }),
  body('liters').optional().isFloat({ min: 0 }),
  body('unit_price').optional().isFloat({ min: 0 }),
  body('gps_old').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('gps_new').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('gps_liters').optional({ values: 'null' }).isFloat({ min: 0 }),
];

export const fuelRecordDeleteSchema = [
  param('id').isInt({ min: 1 }).withMessage('ID không hợp lệ'),
];

export const fuelRecordController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { vehicle_id, month, date_from, date_to, search, page, limit } = req.query;
      const data = await fuelRecordService.list({
        vehicle_id: vehicle_id ? parseInt(vehicle_id as string, 10) : undefined,
        month: month as string | undefined,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      sendSuccess(res, data, 'Danh sách dữ liệu dầu');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải dữ liệu dầu', 500, error);
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const record = await fuelRecordService.getById(id);
      if (!record) {
        sendError(res, 'Không tìm thấy bản ghi', 404);
        return;
      }
      sendSuccess(res, record, 'Chi tiết bản ghi');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải chi tiết', 500, error);
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const record = await fuelRecordService.create(req.body, req.user!.userId);
      sendSuccess(res, record, 'Đã tạo bản ghi dầu', 201);

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'fuel_record',
        entityId: record.id,
        entityLabel: `Fuel record #${record.id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tạo bản ghi', 500, error);
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
      const record = await fuelRecordService.update(id, req.body);
      sendSuccess(res, record, 'Đã cập nhật bản ghi');

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'fuel_record',
        entityId: id,
        entityLabel: `Fuel record #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể cập nhật bản ghi', 500, error);
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
      await fuelRecordService.delete(id);
      sendSuccess(res, undefined, 'Đã xóa bản ghi');

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'fuel_record',
        entityId: id,
        entityLabel: `Fuel record #${id}`,
        ipAddress: req.ip,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string };
        if (e.code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy bản ghi', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa bản ghi', 500, error);
    }
  },

  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file Excel', 400);
        return;
      }

      const result = await fuelRecordService.uploadFromExcel(
        req.file.buffer,
        req.user!.userId,
      );

      if (result.errors > 0 && result.imported === 0) {
        res.status(422).json({
          success: false,
          message: `Có ${result.errors} lỗi — không có dữ liệu nào được import`,
          data: result,
        });
        return;
      }

      const msg = result.errors > 0
        ? `Đã import ${result.imported} bản ghi, ${result.errors} lỗi`
        : `Đã import ${result.imported} bản ghi`;

      sendSuccess(res, result, msg, 201);

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPLOAD',
        entityType: 'fuel_record',
        entityLabel: 'Batch upload',
        ipAddress: req.ip,
        details: { imported: result.imported, errors: result.errors },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload dữ liệu', 500, error);
    }
  },

  async statistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { month, vehicle_id, date_from, date_to } = req.query;
      const data = await fuelRecordService.getStatistics({
        month: month as string | undefined,
        vehicle_id: vehicle_id ? parseInt(vehicle_id as string, 10) : undefined,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
      });
      sendSuccess(res, data, 'Thống kê dữ liệu dầu');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải thống kê', 500, error);
    }
  },

  async statisticsByLocation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { month } = req.query;
      const data = await fuelRecordService.getStatisticsByLocation({
        month: month as string | undefined,
      });
      sendSuccess(res, data, 'Thống kê theo vị trí');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải thống kê theo vị trí', 500, error);
    }
  },

  async months(req: AuthRequest, res: Response): Promise<void> {
    try {
      const months = await fuelRecordService.getDistinctMonths();
      sendSuccess(res, months, 'Danh sách tháng có dữ liệu');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách tháng', 500, error);
    }
  },

  async batches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await fuelRecordService.getBatches();
      sendSuccess(res, data, 'Danh sách batch');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách batch', 500, error);
    }
  },

  async deleteBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const count = await fuelRecordService.deleteByBatch(batchId);
      sendSuccess(res, { deleted: count }, `Đã xóa ${count} bản ghi`);

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'DELETE_BATCH',
        entityType: 'fuel_record',
        entityLabel: `Batch ${batchId}`,
        ipAddress: req.ip,
        details: { batchId, deleted: count },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa batch', 500, error);
    }
  },

  async latestOdometer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = parseInt(req.params.vehicleId, 10);
      const odometer = await fuelRecordService.getLatestOdometer(vehicleId);
      sendSuccess(res, { odometer_new: odometer });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải số KM mới nhất', 500, error);
    }
  },

  async monitoring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 10;
      const data = await fuelRecordService.getVehiclesNeedingMonitoring(threshold);
      sendSuccess(res, data, 'Danh sách xe cần theo dõi');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe cần theo dõi', 500, error);
    }
  },

  // ── Images ──

  async getImages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const recordId = parseInt(req.params.id, 10);
      const images = await fuelRecordService.getImages(recordId);
      sendSuccess(res, images);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải ảnh', 500, error);
    }
  },

  async withoutFuel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const data = await fuelRecordService.getVehiclesWithoutFuel(days);
      sendSuccess(res, data, 'Danh sách xe chưa đổ dầu');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể tải danh sách xe chưa đổ dầu', 500, error);
    }
  },

  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const recordId = parseInt(req.params.id, 10);
      if (!req.file) {
        sendError(res, 'Vui lòng chọn file ảnh', 400);
        return;
      }
      const image = await fuelRecordService.addImage(recordId, req.file);
      sendSuccess(res, image, 'Đã upload ảnh', 201);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể upload ảnh', 500, error);
    }
  },

  async deleteImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const imageId = parseInt(req.params.imageId, 10);
      const filePath = await fuelRecordService.deleteImage(imageId);
      const fs = await import('fs');
      fs.unlink(filePath, () => {});
      sendSuccess(res, undefined, 'Đã xóa ảnh');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        if ((err as { code: string }).code === 'NOT_FOUND') {
          sendError(res, 'Không tìm thấy ảnh', 404);
          return;
        }
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Không thể xóa ảnh', 500, error);
    }
  },
};
