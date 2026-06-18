import { pool } from '../config/database';

export interface AccessLogData {
  userId?: number;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  responseTimeMs: number;
}

export interface AuditLogData {
  userId: number;
  username: string;
  action: string;
  entityType: string;
  entityId?: number;
  entityLabel?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AccessLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  method: string;
  path: string;
  status_code: number;
  ip_address: string | null;
  user_agent: string | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AccessLogFilters {
  userId?: number;
  method?: string;
  path?: string;
  statusCode?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogFilters {
  userId?: number;
  action?: string;
  entityType?: string;
  entityId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function logAccess(data: AccessLogData): void {
  setImmediate(() => {
    pool
      .query(
        `INSERT INTO access_logs (user_id, method, path, status_code, ip_address, user_agent, response_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.userId ?? null,
          data.method,
          data.path,
          data.statusCode,
          data.ipAddress ?? null,
          data.userAgent ?? null,
          data.responseTimeMs,
        ],
      )
      .catch((err) => {
        console.error('[auditService] Failed to log access:', err.message);
      });
  });
}

function logAudit(data: AuditLogData): void {
  setImmediate(() => {
    pool
      .query(
        `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, entity_label, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.userId,
          data.username,
          data.action,
          data.entityType,
          data.entityId ?? null,
          data.entityLabel ?? null,
          data.details ? JSON.stringify(data.details) : null,
          data.ipAddress ?? null,
        ],
      )
      .catch((err) => {
        console.error('[auditService] Failed to log audit:', err.message);
      });
  });
}

async function getAccessLogs(filters: AccessLogFilters): Promise<PaginatedResult<AccessLog>> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const condParams: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push(`a.user_id = $${paramIndex++}`);
    condParams.push(filters.userId);
  }
  if (filters.method) {
    conditions.push(`a.method = $${paramIndex++}`);
    condParams.push(filters.method.toUpperCase());
  }
  if (filters.path) {
    conditions.push(`a.path ILIKE $${paramIndex++}`);
    condParams.push(`%${filters.path}%`);
  }
  if (filters.statusCode) {
    conditions.push(`a.status_code = $${paramIndex++}`);
    condParams.push(filters.statusCode);
  }
  if (filters.dateFrom) {
    conditions.push(`a.created_at >= $${paramIndex++}`);
    condParams.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`a.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
    condParams.push(filters.dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM access_logs a ${whereClause}`;
  const dataQuery = `
    SELECT a.*, u.full_name as user_name
    FROM access_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  const dataParams = [...condParams, limit, offset];

  const countResult = await pool.query<{ count: string }>(countQuery, condParams);
  const dataResult = await pool.query<AccessLog>(dataQuery, dataParams);

  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getAuditLogs(filters: AuditLogFilters): Promise<PaginatedResult<AuditLog>> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const condParams: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push(`a.user_id = $${paramIndex++}`);
    condParams.push(filters.userId);
  }
  if (filters.action) {
    conditions.push(`a.action = $${paramIndex++}`);
    condParams.push(filters.action.toUpperCase());
  }
  if (filters.entityType) {
    conditions.push(`a.entity_type = $${paramIndex++}`);
    condParams.push(filters.entityType);
  }
  if (filters.entityId) {
    conditions.push(`a.entity_id = $${paramIndex++}`);
    condParams.push(filters.entityId);
  }
  if (filters.dateFrom) {
    conditions.push(`a.created_at >= $${paramIndex++}`);
    condParams.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`a.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
    condParams.push(filters.dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM audit_logs a ${whereClause}`;
  const dataQuery = `
    SELECT * FROM audit_logs a
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  const dataParams = [...condParams, limit, offset];

  const countResult = await pool.query<{ count: string }>(countQuery, condParams);
  const dataResult = await pool.query<AuditLog>(dataQuery, dataParams);

  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export const auditService = {
  logAccess,
  logAudit,
  getAccessLogs,
  getAuditLogs,
};
