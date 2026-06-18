import axiosClient from './axiosClient';

export interface ReconcileJobConfig {
  id: number;
  name: string;
  lookback_days: number;
  schedule_hours: number[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MatchedInvoice {
  id: number;
  so_hoa_don: string;
  so_xe: string;
  ngay: string;
}

export interface ReconcileJobLog {
  id: number;
  config_id: number | null;
  config_name: string | null;
  trigger_type: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  lookback_days: number | null;
  scanned_count: number;
  matched_count: number;
  error_message: string | null;
  matched_invoices: MatchedInvoice[];
  created_at: string;
}

export interface CreateConfigInput {
  name?: string;
  lookback_days?: number;
  schedule_hours?: number[];
  is_active?: boolean;
}

export interface UpdateConfigInput {
  name?: string;
  lookback_days?: number;
  schedule_hours?: number[];
  is_active?: boolean;
}

export interface LogFilters {
  page?: number;
  limit?: number;
  config_id?: number;
  status?: string;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TriggerResult {
  log_id: number;
  scanned_count: number;
  matched_count: number;
  matched_invoices: MatchedInvoice[];
  status: string;
}

export const reconcileJobApi = {
  fetchConfigs: async (): Promise<ReconcileJobConfig[]> => {
    const response = await axiosClient.get<{ data: ReconcileJobConfig[] }>(
      '/reconcile-jobs/configs',
    );
    return response.data.data;
  },

  createConfig: async (input: CreateConfigInput): Promise<ReconcileJobConfig> => {
    const response = await axiosClient.post<{ data: ReconcileJobConfig }>(
      '/reconcile-jobs/configs',
      input,
    );
    return response.data.data;
  },

  updateConfig: async (id: number, input: UpdateConfigInput): Promise<ReconcileJobConfig> => {
    const response = await axiosClient.put<{ data: ReconcileJobConfig }>(
      `/reconcile-jobs/configs/${id}`,
      input,
    );
    return response.data.data;
  },

  deleteConfig: async (id: number): Promise<void> => {
    await axiosClient.delete(`/reconcile-jobs/configs/${id}`);
  },

  toggleConfig: async (id: number): Promise<{ id: number; is_active: boolean }> => {
    const response = await axiosClient.patch<{ data: { id: number; is_active: boolean } }>(
      `/reconcile-jobs/configs/${id}/toggle`,
    );
    return response.data.data;
  },

  triggerReconcile: async (input: {
    config_id?: number;
    lookback_days?: number;
  }): Promise<TriggerResult> => {
    const response = await axiosClient.post<{ data: TriggerResult }>(
      '/reconcile-jobs/trigger',
      input,
    );
    return response.data.data;
  },

  fetchLogs: async (filters: LogFilters = {}): Promise<PaginatedData<ReconcileJobLog>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.config_id !== undefined) params.set('config_id', String(filters.config_id));
    if (filters.status) params.set('status', filters.status);

    const response = await axiosClient.get<{ data: PaginatedData<ReconcileJobLog> }>(
      `/reconcile-jobs/logs?${params.toString()}`,
    );
    return response.data.data;
  },
};
