import { pool } from '../config/database';
import { DispatchSchedule } from './dispatchScheduleService';
import { DataScope } from '../types/dataScope';
import { workflowService } from './workflowService';
import { UserTicketPermissions } from '../types/workflow';
import { auditService } from './auditService';

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
  uploaded_at?: string;
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

export interface InvoiceTrackingTicketWithPermissions extends DispatchSchedule {
  user_permissions?: UserTicketPermissions;
}

export interface InvoiceTrackingHistoryItem {
  id: number;
  action: string;
  action_label: string;
  user_id: number | null;
  username: string | null;
  user_full_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface InvoiceTrackingStatisticsFilters {
  date_from?: string;
  date_to?: string;
  bien_so?: string;
  driver_id?: number;
  tai_xe?: string;
}

export interface InvoiceTrackingStatisticsSummary {
  total_tickets: number;
  created_count: number;
  pending_review_count: number;
  request_supplement_count: number;
  completed_count: number;
  completion_rate: number;
}

export interface DriverInvoiceStatistics {
  driver_id: number | null;
  driver_name: string;
  vehicles: string[];
  total_tickets: number;
  created_count: number;
  pending_review_count: number;
  request_supplement_count: number;
  completed_count: number;
  completion_rate: number;
}

export interface InvoiceTrackingStatisticsResult {
  summary: InvoiceTrackingStatisticsSummary;
  by_driver: DriverInvoiceStatistics[];
}

export const invoiceTrackingService = {
  async list(
    filters: InvoiceTrackingFilters,
    scope?: DataScope,
    currentUser?: { userId: number; role?: string; roleId?: number | null },
  ): Promise<{ data: InvoiceTrackingTicketWithPermissions[]; pagination: InvoiceTrackingPagination }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    // Early return if user has 'none' scope
    if (scope && scope.type === 'none') {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0,
        },
      };
    }

    const conditions: string[] = ['invoice_status IS NOT NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Apply data scope filter
    if (scope) {
      if (scope.type === 'owner') {
        // Owner scope: match by driver_id (user_id của tài xế) or created_by
        conditions.push(`(driver_id = $${paramIndex} OR (driver_id IS NULL AND created_by = $${paramIndex}))`);
        params.push(scope.userId);
        paramIndex++;
      } else if (scope.type === 'entity') {
        if (!scope.entityIds || scope.entityIds.length === 0) {
          return {
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              total_pages: 0,
            },
          };
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

    if (filters.search && filters.search.trim()) {
      conditions.push(
        `(bien_so ILIKE $${paramIndex} OR tai_xe ILIKE $${paramIndex} OR diem_nhan ILIKE $${paramIndex})`,
      );
      params.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countPromise = pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM dispatch_schedules ${whereClause}`,
      params,
    );

    const dataPromise = pool.query<DispatchSchedule>(
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

    const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Attach user_permissions for all tickets via optimized batch evaluation
    const items = await workflowService.attachUserPermissionsBulk(
      'invoice_tracking',
      dataResult.rows,
      currentUser,
    );

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  },

  async getById(
    id: number,
    scope?: DataScope,
    currentUser?: { userId: number; role?: string; roleId?: number | null },
  ): Promise<InvoiceTrackingTicketWithPermissions> {
    const conditions: string[] = ['id = $1'];
    const params: unknown[] = [id];
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

    const ticket = result.rows[0];

    // Compute dynamic permissions for current user if user info provided
    let user_permissions: UserTicketPermissions | undefined;
    if (currentUser) {
      user_permissions = await workflowService.getUserTicketPermissions(
        'invoice_tracking',
        ticket.invoice_status,
        currentUser,
        ticket,
      );
    }

    return {
      ...ticket,
      user_permissions,
    };
  },

  async uploadDocuments(
    id: number,
    files: DocumentFile[],
    driverNote?: string,
    scope?: DataScope,
    currentUser?: { userId: number; role?: string; roleId?: number | null },
  ): Promise<DispatchSchedule> {
    const ticket = await this.getById(id, scope);

    // Validate workflow authorization
    if (currentUser) {
      const authResult = await workflowService.authorizeAction(
        'invoice_tracking',
        ticket.invoice_status,
        'upload_document',
        currentUser,
        ticket,
      );
      if (!authResult.authorized) {
        throw new InvoiceTrackingError('FORBIDDEN', authResult.reason || 'Bạn không có quyền upload chứng từ ở bước này', 403);
      }
    } else if (ticket.invoice_status !== 'created' && ticket.invoice_status !== 'request_supplement') {
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

    const existingDocs: DocumentFile[] = Array.isArray(ticket.documents) ? ticket.documents : [];
    const newDocuments = [...existingDocs, ...documentsWithTimestamp];

    // Determine target status via workflow transition
    const nextStatus = await workflowService.getNextStatus(
      'invoice_tracking',
      ticket.invoice_status,
      'upload_document',
      'pending_review',
    );

    const result = await pool.query<DispatchSchedule>(
      `UPDATE dispatch_schedules
       SET documents = $1,
           driver_note = $2,
           invoice_status = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                 diem_nhan, tan, can, ghi_chu,
                 invoice_status, driver_id, dispatcher_id, documents,
                 supplement_note, driver_note, reviewed_at, completed_at,
                 created_by, created_at, updated_at`,
      [JSON.stringify(newDocuments), driverNote ?? null, nextStatus, id],
    );

    const updatedTicket = result.rows[0];

    // Log business audit
    if (currentUser) {
      const stepName = ticket.invoice_status === 'request_supplement' ? 'Bổ sung chứng từ' : 'Tải lên lần đầu';
      auditService.logAudit({
        userId: currentUser.userId,
        username: currentUser.role || 'user',
        action: 'UPLOAD_DOCUMENTS',
        entityType: 'dispatch_schedule',
        entityId: id,
        entityLabel: `Xe ${updatedTicket.bien_so} (${updatedTicket.ngay})`,
        details: {
          step: stepName,
          step_code: ticket.invoice_status,
          file_count: files.length,
          files: files.map((f) => ({
            file_name: f.file_name,
            mime_type: f.mime_type,
            note: f.note || null,
          })),
          driver_note: driverNote ?? null,
          prev_status: ticket.invoice_status,
          new_status: nextStatus,
        },
      });
    }

    return updatedTicket;
  },

  async review(
    id: number,
    action: 'finish' | 'request_supplement',
    dispatcherId: number,
    supplementNote?: string,
    currentUser?: { userId: number; role?: string; roleId?: number | null },
  ): Promise<DispatchSchedule> {
    const ticket = await this.getById(id);

    const actionCode = action === 'finish' ? 'review_finish' : 'request_supplement';

    // Validate workflow authorization
    if (currentUser) {
      const authResult = await workflowService.authorizeAction(
        'invoice_tracking',
        ticket.invoice_status,
        actionCode,
        currentUser,
        ticket,
      );
      if (!authResult.authorized) {
        throw new InvoiceTrackingError('FORBIDDEN', authResult.reason || 'Bạn không có quyền thực hiện hành động này ở bước hiện tại', 403);
      }
    } else if (ticket.invoice_status !== 'pending_review') {
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

      const nextStatus = await workflowService.getNextStatus(
        'invoice_tracking',
        ticket.invoice_status,
        'request_supplement',
        'request_supplement',
      );

      const result = await pool.query<DispatchSchedule>(
        `UPDATE dispatch_schedules
         SET invoice_status = $1,
             dispatcher_id = $2,
             supplement_note = $3,
             reviewed_at = NOW(),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                   diem_nhan, tan, can, ghi_chu,
                   invoice_status, driver_id, dispatcher_id, documents,
                   supplement_note, driver_note, reviewed_at, completed_at,
                   created_by, created_at, updated_at`,
        [nextStatus, dispatcherId, supplementNote.trim(), id],
      );

      const updatedTicket = result.rows[0];

      if (currentUser) {
        auditService.logAudit({
          userId: currentUser.userId,
          username: currentUser.role || 'dispatcher',
          action: 'REQUEST_SUPPLEMENT',
          entityType: 'dispatch_schedule',
          entityId: id,
          entityLabel: `Xe ${updatedTicket.bien_so} (${updatedTicket.ngay})`,
          details: {
            supplement_note: supplementNote.trim(),
            prev_status: ticket.invoice_status,
            new_status: nextStatus,
          },
        });
      }

      return updatedTicket;
    }

    if (action === 'finish') {
      const nextStatus = await workflowService.getNextStatus(
        'invoice_tracking',
        ticket.invoice_status,
        'review_finish',
        'completed',
      );

      const isCompleted = nextStatus === 'completed';

      const result = await pool.query<DispatchSchedule>(
        `UPDATE dispatch_schedules
         SET invoice_status = $1,
             dispatcher_id = $2,
             reviewed_at = NOW(),
             completed_at = CASE WHEN $3 = TRUE THEN NOW() ELSE completed_at END,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                   diem_nhan, tan, can, ghi_chu,
                   invoice_status, driver_id, dispatcher_id, documents,
                   supplement_note, driver_note, reviewed_at, completed_at,
                   created_by, created_at, updated_at`,
        [nextStatus, dispatcherId, isCompleted, id],
      );

      const updatedTicket = result.rows[0];

      if (currentUser) {
        auditService.logAudit({
          userId: currentUser.userId,
          username: currentUser.role || 'dispatcher',
          action: 'REVIEW_FINISH',
          entityType: 'dispatch_schedule',
          entityId: id,
          entityLabel: `Xe ${updatedTicket.bien_so} (${updatedTicket.ngay})`,
          details: {
            prev_status: ticket.invoice_status,
            new_status: nextStatus,
          },
        });
      }

      return updatedTicket;
    }

    throw new InvoiceTrackingError('INVALID_ACTION', 'Action không hợp lệ', 400);
  },

  async getHistory(
    id: number,
    scope?: DataScope,
  ): Promise<InvoiceTrackingHistoryItem[]> {
    // Check permission to view ticket first
    const ticket = await this.getById(id, scope);

    // Query audit logs
    const auditRes = await pool.query<{
      id: number;
      action: string;
      user_id: number | null;
      username: string | null;
      user_full_name: string | null;
      details: Record<string, unknown> | null;
      created_at: string;
    }>(
      `SELECT a.id, a.action, a.user_id, a.username, u.full_name as user_full_name, a.details, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.entity_type = 'dispatch_schedule' AND a.entity_id = $1
       ORDER BY a.created_at ASC`,
      [id],
    );

    const historyItems: InvoiceTrackingHistoryItem[] = auditRes.rows.map((row) => {
      let action_label = row.action;
      const details = row.details as Record<string, any> | null;

      if (row.action === 'CREATE' || row.action === 'CREATE_DISPATCH') {
        action_label = 'Tạo chuyến xe';
      } else if (row.action === 'UPLOAD_DOCUMENTS') {
        if (details?.step_code === 'request_supplement' || details?.prev_status === 'request_supplement') {
          action_label = 'Bổ sung chứng từ';
        } else {
          action_label = 'Tải lên chứng từ';
        }
      } else if (row.action === 'REQUEST_SUPPLEMENT') {
        action_label = 'Yêu cầu bổ sung';
      } else if (row.action === 'REVIEW_FINISH') {
        action_label = 'Duyệt hoàn thành';
      } else if (row.action === 'UPDATE') {
        action_label = 'Cập nhật chuyến xe';
      }

      return {
        ...row,
        action_label,
      };
    });

    // If no explicit CREATE audit log exists (e.g. legacy schedules), prepend a synthetic created event
    const hasCreateLog = historyItems.some((h) => h.action === 'CREATE' || h.action === 'CREATE_DISPATCH');
    if (!hasCreateLog && ticket.created_at) {
      let creatorName: string | null = null;
      if (ticket.created_by) {
        const creatorRes = await pool.query<{ full_name: string; username: string }>(
          `SELECT full_name, username FROM users WHERE id = $1`,
          [ticket.created_by],
        );
        if (creatorRes.rows[0]) {
          creatorName = creatorRes.rows[0].full_name || creatorRes.rows[0].username;
        }
      }

      historyItems.unshift({
        id: 0,
        action: 'CREATE',
        action_label: 'Tạo chuyến xe',
        user_id: ticket.created_by,
        username: null,
        user_full_name: creatorName,
        details: {
          bien_so: ticket.bien_so,
          loai_tuyen: ticket.loai_tuyen,
          loai_xe: ticket.loai_xe,
        },
        created_at: ticket.created_at,
      });
    }

    return historyItems;
  },

  async getStatistics(
    filters: InvoiceTrackingStatisticsFilters,
    scope?: DataScope,
  ): Promise<InvoiceTrackingStatisticsResult> {
    const emptyResult: InvoiceTrackingStatisticsResult = {
      summary: {
        total_tickets: 0,
        created_count: 0,
        pending_review_count: 0,
        request_supplement_count: 0,
        completed_count: 0,
        completion_rate: 0,
      },
      by_driver: [],
    };

    if (scope && scope.type === 'none') {
      return emptyResult;
    }

    const conditions: string[] = ['ds.invoice_status IS NOT NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Apply data scope
    if (scope) {
      if (scope.type === 'owner') {
        conditions.push(`(ds.driver_id = $${paramIndex} OR (ds.driver_id IS NULL AND ds.created_by = $${paramIndex}))`);
        params.push(scope.userId);
        paramIndex++;
      } else if (scope.type === 'entity') {
        if (!scope.entityIds || scope.entityIds.length === 0) {
          return emptyResult;
        }
        if (scope.entityType === 'vehicle') {
          conditions.push(`ds.vehicle_id = ANY($${paramIndex++})`);
          params.push(scope.entityIds);
        } else {
          conditions.push(`ds.driver_id = ANY($${paramIndex++})`);
          params.push(scope.entityIds);
        }
      }
    }

    // Filters
    if (filters.date_from) {
      conditions.push(`ds.ngay >= $${paramIndex++}`);
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`ds.ngay <= $${paramIndex++}`);
      params.push(filters.date_to);
    }

    if (filters.bien_so) {
      conditions.push(`ds.bien_so ILIKE $${paramIndex++}`);
      params.push(`%${filters.bien_so.trim()}%`);
    }

    if (filters.driver_id) {
      conditions.push(`ds.driver_id = $${paramIndex++}`);
      params.push(filters.driver_id);
    } else if (filters.tai_xe) {
      conditions.push(`(COALESCE(u.full_name, ds.tai_xe) ILIKE $${paramIndex++} OR ds.tai_xe ILIKE $${paramIndex - 1})`);
      params.push(`%${filters.tai_xe.trim()}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Query aggregated statistics by driver
    const query = `
      SELECT
        ds.driver_id,
        COALESCE(u.full_name, ds.tai_xe, 'Chưa gán tài xế') as driver_name,
        COALESCE(
          array_agg(DISTINCT ds.bien_so) FILTER (WHERE ds.bien_so IS NOT NULL AND ds.bien_so <> ''),
          '{}'
        ) as vehicles,
        COUNT(*)::int as total_tickets,
        COUNT(*) FILTER (WHERE ds.invoice_status = 'created')::int as created_count,
        COUNT(*) FILTER (WHERE ds.invoice_status = 'pending_review')::int as pending_review_count,
        COUNT(*) FILTER (WHERE ds.invoice_status = 'request_supplement')::int as request_supplement_count,
        COUNT(*) FILTER (WHERE ds.invoice_status = 'completed')::int as completed_count
      FROM dispatch_schedules ds
      LEFT JOIN users u ON u.id = ds.driver_id
      ${whereClause}
      GROUP BY ds.driver_id, COALESCE(u.full_name, ds.tai_xe, 'Chưa gán tài xế')
      ORDER BY total_tickets DESC, driver_name ASC
    `;

    const result = await pool.query<{
      driver_id: number | null;
      driver_name: string;
      vehicles: string[];
      total_tickets: number;
      created_count: number;
      pending_review_count: number;
      request_supplement_count: number;
      completed_count: number;
    }>(query, params);

    let total_tickets = 0;
    let created_count = 0;
    let pending_review_count = 0;
    let request_supplement_count = 0;
    let completed_count = 0;

    const by_driver: DriverInvoiceStatistics[] = result.rows.map((row) => {
      const rowTotal = row.total_tickets || 0;
      const rowCompleted = row.completed_count || 0;
      const rate = rowTotal > 0 ? Math.round((rowCompleted / rowTotal) * 1000) / 10 : 0;

      total_tickets += rowTotal;
      created_count += row.created_count || 0;
      pending_review_count += row.pending_review_count || 0;
      request_supplement_count += row.request_supplement_count || 0;
      completed_count += rowCompleted;

      return {
        driver_id: row.driver_id,
        driver_name: row.driver_name,
        vehicles: row.vehicles || [],
        total_tickets: rowTotal,
        created_count: row.created_count || 0,
        pending_review_count: row.pending_review_count || 0,
        request_supplement_count: row.request_supplement_count || 0,
        completed_count: rowCompleted,
        completion_rate: rate,
      };
    });

    const overallRate = total_tickets > 0 ? Math.round((completed_count / total_tickets) * 1000) / 10 : 0;

    return {
      summary: {
        total_tickets,
        created_count,
        pending_review_count,
        request_supplement_count,
        completed_count,
        completion_rate: overallRate,
      },
      by_driver,
    };
  },
};
