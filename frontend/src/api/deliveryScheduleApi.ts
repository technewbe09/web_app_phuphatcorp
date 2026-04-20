import axiosClient from './axiosClient';

export interface DeliverySchedule {
  id: number;
  ngay: string;
  stt: number;
  noi_giao: string | null;
  tan: number | null;
  so_xe: string | null;
  can_info: string | null;
  ghi_chu: string | null;
  loai: 'Giá tấn' | 'Giá chuyến' | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_user: {
    id: number;
    full_name: string;
  };
}

export interface ListFilters {
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListResult {
  schedules: DeliverySchedule[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface UploadResult {
  total_sheets_processed: number;
  total_rows_inserted: number;
  date_range: { from: string; to: string };
}

export interface UploadError {
  sheet: string;
  row: number;
  ngay: string;
  field: string;
  value: unknown;
  reason: string;
}

export interface StatisticsSummary {
  totalDays: number;
  totalTrips: number;
  giaTanTrips: number;
  giaChuyenTrips: number;
  fromDate: string;
  toDate: string;
}

export interface DailyBreakdown {
  ngay: string;
  tripCount: number;
  giaTanCount: number;
  giaChuyenCount: number;
}

export interface StatisticsResult {
  summary: StatisticsSummary;
  dailyBreakdown: DailyBreakdown[];
}

export interface UpdateSchedulePayload {
  ngay: string;
  stt: number;
  noi_giao?: string | null;
  tan?: number | null;
  so_xe?: string | null;
  can_info?: string | null;
  ghi_chu?: string | null;
  loai?: 'Giá tấn' | 'Giá chuyến' | null;
}

export const deliveryScheduleApi = {
  upload: async (formData: FormData): Promise<UploadResult> => {
    const response = await axiosClient.post<{ data: UploadResult }>(
      '/delivery-schedules/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  },

  getList: async (filters: ListFilters): Promise<ListResult> => {
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await axiosClient.get<{ data: ListResult }>(
      `/delivery-schedules?${params.toString()}`
    );
    return response.data.data;
  },

  deleteByDateRange: async (fromDate: string, toDate: string): Promise<{ deleted_count: number }> => {
    const response = await axiosClient.delete<{ data: { deleted_count: number } }>(
      '/delivery-schedules/by-date-range',
      { data: { from_date: fromDate, to_date: toDate } }
    );
    return response.data.data;
  },

  deleteById: async (id: number): Promise<void> => {
    await axiosClient.delete(`/delivery-schedules/${id}`);
  },

  updateById: async (id: number, payload: UpdateSchedulePayload): Promise<DeliverySchedule> => {
    const response = await axiosClient.put<{ data: DeliverySchedule }>(
      `/delivery-schedules/${id}`,
      payload
    );
    return response.data.data;
  },

  getStatistics: async (fromDate: string, toDate: string): Promise<StatisticsResult> => {
    const params = new URLSearchParams({ fromDate, toDate });
    const response = await axiosClient.get<{ data: StatisticsResult }>(
      `/delivery-schedules/statistics?${params.toString()}`
    );
    return response.data.data;
  },
};
