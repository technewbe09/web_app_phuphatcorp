import axiosClient from './axiosClient';

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

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

export const auditLogApi = {
  async getAccessLogs(filters: AccessLogFilters = {}): Promise<PaginatedResponse<AccessLog>> {
    const params: Record<string, string | number> = {};
    if (filters.userId) params.userId = filters.userId;
    if (filters.method) params.method = filters.method;
    if (filters.path) params.path = filters.path;
    if (filters.statusCode) params.statusCode = filters.statusCode;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const { data } = await axiosClient.get('/logs/access', { params });
    return data;
  },

  async getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    const params: Record<string, string | number> = {};
    if (filters.userId) params.userId = filters.userId;
    if (filters.action) params.action = filters.action;
    if (filters.entityType) params.entityType = filters.entityType;
    if (filters.entityId) params.entityId = filters.entityId;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const { data } = await axiosClient.get('/logs/audit', { params });
    return data;
  },
};
