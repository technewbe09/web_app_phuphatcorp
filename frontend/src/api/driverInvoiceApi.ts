import axiosClient from './axiosClient';

export interface InvoiceNumber {
  so: string;
  ghi_chu: string;
}

export interface DriverInvoice {
  id: number;
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string | null;
  so_hoa_don: InvoiceNumber[];
  original_filename: string | null;
  uploaded_by: number | null;
  uploaded_at: string;
  reconciled_count?: number;
}

export interface DriverInvoiceFilters {
  page?: number;
  limit?: number;
  ma?: string;
  ten_tx?: string;
  ngay_from?: string;
  ngay_to?: string;
  so_xe?: string;
  noi_giao?: string;
  so_hoa_don?: string;
  ghi_chu?: string;
}

export interface DriverInvoiceRow {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string | null;
  so_hoa_don: InvoiceNumber[];
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

export interface DuplicateInfo {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  ghi_chu: string | null;
}

export interface UploadResponse {
  inserted: number;
  duplicates: DuplicateInfo[];
}

export interface UploadErrorData {
  duplicates: DuplicateInfo[];
  new_count: number;
  duplicate_count: number;
}

export const driverInvoiceApi = {
  fetchList: async (filters: DriverInvoiceFilters = {}): Promise<PaginatedData<DriverInvoice>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.ma) params.set('ma', filters.ma);
    if (filters.ten_tx) params.set('ten_tx', filters.ten_tx);
    if (filters.ngay_from) params.set('ngay_from', filters.ngay_from);
    if (filters.ngay_to) params.set('ngay_to', filters.ngay_to);
    if (filters.so_xe) params.set('so_xe', filters.so_xe);
    if (filters.noi_giao) params.set('noi_giao', filters.noi_giao);
    if (filters.so_hoa_don) params.set('so_hoa_don', filters.so_hoa_don);
    if (filters.ghi_chu) params.set('ghi_chu', filters.ghi_chu);

    const response = await axiosClient.get<{ data: PaginatedData<DriverInvoice> }>(
      `/driver-invoices?${params.toString()}`,
    );
    return response.data.data;
  },

  upload: async (
    rows: DriverInvoiceRow[],
    originalFilename: string,
    skipDuplicates: boolean,
  ): Promise<UploadResponse> => {
    const response = await axiosClient.post<{ data: UploadResponse }>('/driver-invoices/upload', {
      rows,
      original_filename: originalFilename,
      skip_duplicates: skipDuplicates,
    });
    return response.data.data;
  },

  create: async (data: DriverInvoiceRow): Promise<DriverInvoice> => {
    const response = await axiosClient.post<{ data: DriverInvoice }>('/driver-invoices', data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/driver-invoices/${id}`);
  },

  update: async (id: number, data: Partial<DriverInvoiceRow>): Promise<DriverInvoice> => {
    const response = await axiosClient.put<{ data: DriverInvoice }>(`/driver-invoices/${id}`, data);
    return response.data.data;
  },
};
