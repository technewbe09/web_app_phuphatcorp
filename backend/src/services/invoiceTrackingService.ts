import { pool } from '../config/database';
import { DispatchSchedule } from './dispatchScheduleService';
import { DataScope } from '../types/dataScope';

export class InvoiceTrackingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'InvoiceTrackingError';
  }
}

export interface DocumentFile {
  file_name: string;
  mime_type: string;
  file_data: string;
  note?: string;
}

export interface InvoiceTrackingFilters {
  status?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceTrackingPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const invoiceTrackingService = {
  async list(
    filters: InvoiceTrackingFilters,
    scope?: DataScope,
  ): Promise<{ data: DispatchSchedule[]; pagination: InvoiceTrackingPagination }> {
    const conditions: string[] = ['invoice_status IS NOT NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    // Apply data scope filter
    if (scope) {
      if (scope.type === 'none') {
        conditions.push('1=0');
      } else if (scope.type === 'owner') {
        // Owner scope: match by driver_id (user_id của tài xế) or created_by
        conditions.push(`(driver_id = $${paramIndex} OR (driver_id IS NULL AND created_by = $${paramIndex}))`);
        params.push(scope.userId);
        paramIndex++;
      } else if (scope.type === 'entity') {
        if (!scope.entityIds || scope.entityIds.length === 0) {
          conditions.push('1=0');
        } else if (scope.entityType === 'vehicle') {
          conditions.push(`vehicle_id = ANY($${paramIndex++})`);
          params.push(scope.entityIds);
        } else {
          // driver entity scope
          conditions.push(`driver_id = ANY($${paramIndex++})`);
          params.push(scope.entityIds);
        }
      }
      // 'all' -> no additional WHERE filter
    }

    if (filters.status && filters.status.length > 0) {
      const placeholders = filters.status.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`invoice_status IN (${placeholders})`);
      params.push(...filters.status);
    }

    if (filters.date_from) {
      conditions.push(`ngay >= $${paramIndex++}`);
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`ngay <= $${paramIndex++}`);
      params.push(filters.date_to);
    }

    if (filters.search) {
      conditions.push(
        `(bien_so ILIKE $${paramIndex} OR tai_xe ILIKE $${paramIndex} OR ma_chuyen ILIKE $${paramIndex})`,
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM dispatch_schedules ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query<DispatchSchedule>(
      `SELECT id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
              diem_nhan, tan, can, ghi_chu,
              invoice_status, driver_id, dispatcher_id, documents,
              supplement_note, driver_note, reviewed_at, completed_at,
              created_by, created_at, updated_at
       FROM dispatch_schedules
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset],
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: number, scope?: DataScope): Promise<DispatchSchedule> {
    const conditions: string[] = ['id = $1'];
    const params: any[] = [id];
    let paramIndex = 2;

    if (scope) {
      if (scope.type === 'none') {
        conditions.push('1=0');
      } else if (scope.type === 'owner') {
        conditions.push(`(driver_id = $${paramIndex} OR (driver_id IS NULL AND created_by = $${paramIndex}))`);
        params.push(scope.userId);
        paramIndex++;
      } else if (scope.type === 'entity') {
        if (!scope.entityIds || scope.entityIds.length === 0) {
          conditions.push('1=0');
        } else if (scope.entityType === 'vehicle') {
          conditions.push(`vehicle_id = ANY($${paramIndex++})`);
          params.push(scope.entityIds);
        } else {
          conditions.push(`driver_id = ANY($${paramIndex++})`);
          params.push(scope.entityIds);
        }
      }
    }

    const result = await pool.query<DispatchSchedule>(
      `SELECT id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
              diem_nhan, tan, can, ghi_chu,
              invoice_status, driver_id, dispatcher_id, documents,
              supplement_note, driver_note, reviewed_at, completed_at,
              created_by, created_at, updated_at
       FROM dispatch_schedules
       WHERE ${conditions.join(' AND ')}`,
      params,
    );

    if (!result.rows[0]) {
      throw new InvoiceTrackingError('NOT_FOUND', 'Không tìm thấy ticket hoặc bạn không có quyền truy cập', 404);
    }

    return result.rows[0];
  },

  async uploadDocuments(
    id: number,
    files: DocumentFile[],
    driverNote?: string,
    scope?: DataScope,
  ): Promise<DispatchSchedule> {
    const ticket = await this.getById(id, scope);

    if (ticket.invoice_status !== 'created' && ticket.invoice_status !== 'request_supplement') {
      throw new InvoiceTrackingError(
        'INVALID_STATUS',
        'Không thể upload khi ticket đã hoàn thành hoặc đang chờ duyệt',
        400,
      );
    }

    if (files.length === 0) {
      throw new InvoiceTrackingError('NO_FILES', 'Phải có ít nhất 1 file', 400);
    }

    if (files.length > 10) {
      throw new InvoiceTrackingError('TOO_MANY_FILES', 'Tối đa 10 files mỗi lần upload', 400);
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    for (const file of files) {
      if (!allowedMimes.includes(file.mime_type)) {
        throw new InvoiceTrackingError(
          'INVALID_MIME_TYPE',
          `File "${file.file_name}" không đúng định dạng (chỉ chấp nhận JPG, PNG, PDF)`,
          400,
        );
      }

      const sizeInBytes = Buffer.from(file.file_data, 'base64').length;
      if (sizeInBytes > 5 * 1024 * 1024) {
        throw new InvoiceTrackingError(
          'FILE_TOO_LARGE',
          `File "${file.file_name}" vượt quá kích thước tối đa 5MB`,
          400,
        );
      }
    }

    const documentsWithTimestamp = files.map((f) => ({
      ...f,
      uploaded_at: new Date().toISOString(),
    }));

    const newDocuments = [...ticket.documents, ...documentsWithTimestamp];

    const result = await pool.query<DispatchSchedule>(
      `UPDATE dispatch_schedules
       SET documents = $1,
           driver_note = $2,
           invoice_status = 'pending_review',
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                 diem_nhan, tan, can, ghi_chu,
                 invoice_status, driver_id, dispatcher_id, documents,
                 supplement_note, driver_note, reviewed_at, completed_at,
                 created_by, created_at, updated_at`,
      [JSON.stringify(newDocuments), driverNote ?? null, id],
    );

    return result.rows[0];
  },

  async review(
    id: number,
    action: 'finish' | 'request_supplement',
    dispatcherId: number,
    supplementNote?: string,
  ): Promise<DispatchSchedule> {
    const ticket = await this.getById(id);

    if (ticket.invoice_status !== 'pending_review') {
      throw new InvoiceTrackingError(
        'INVALID_STATUS',
        'Chỉ có thể duyệt khi ticket ở trạng thái Chờ duyệt',
        400,
      );
    }

    if (action === 'request_supplement') {
      if (!supplementNote || supplementNote.trim().length < 5) {
        throw new InvoiceTrackingError(
          'SUPPLEMENT_NOTE_REQUIRED',
          'Ghi chú bổ sung là bắt buộc (tối thiểu 5 ký tự)',
          400,
        );
      }

      const result = await pool.query<DispatchSchedule>(
        `UPDATE dispatch_schedules
         SET invoice_status = 'request_supplement',
             dispatcher_id = $1,
             supplement_note = $2,
             reviewed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                   diem_nhan, tan, can, ghi_chu,
                   invoice_status, driver_id, dispatcher_id, documents,
                   supplement_note, driver_note, reviewed_at, completed_at,
                   created_by, created_at, updated_at`,
        [dispatcherId, supplementNote.trim(), id],
      );

      return result.rows[0];
    }

    if (action === 'finish') {
      const result = await pool.query<DispatchSchedule>(
        `UPDATE dispatch_schedules
         SET invoice_status = 'completed',
             dispatcher_id = $1,
             reviewed_at = NOW(),
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                   diem_nhan, tan, can, ghi_chu,
                   invoice_status, driver_id, dispatcher_id, documents,
                   supplement_note, driver_note, reviewed_at, completed_at,
                   created_by, created_at, updated_at`,
        [dispatcherId, id],
      );

      return result.rows[0];
    }

    throw new InvoiceTrackingError('INVALID_ACTION', 'Action không hợp lệ', 400);
  },
};
