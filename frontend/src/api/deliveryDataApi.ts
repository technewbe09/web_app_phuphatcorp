import axiosClient from './axiosClient';

export interface ImportResult {
  batch_id: string;
  total_rows: number;
  total_invoices: number;
  matched_count: number;
  unmatched_count: number;
  min_date: string;
  max_date: string;
}

export interface BatchInfo {
  batch_id: string;
  original_filename: string;
  total_rows: number;
  total_invoices: number;
  matched_count: number;
  unmatched_count: number;
  min_date: string;
  max_date: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface DeleteBatchResult {
  deleted_rows: number;
  deleted_invoices: number;
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

export const deliveryDataApi = {
  importFile: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post<{ data: ImportResult }>(
      '/delivery-data/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data.data;
  },

  getBatches: async (page = 1, limit = 20): Promise<PaginatedData<BatchInfo>> => {
    const response = await axiosClient.get<{ data: PaginatedData<BatchInfo> }>(
      `/delivery-data/batches?page=${page}&limit=${limit}`,
    );
    return response.data.data;
  },

  getBatchStats: async (batchId: string): Promise<BatchInfo> => {
    const response = await axiosClient.get<{ data: BatchInfo }>(
      `/delivery-data/batches/${batchId}`,
    );
    return response.data.data;
  },

  deleteBatch: async (batchId: string): Promise<DeleteBatchResult> => {
    const response = await axiosClient.delete<{ data: DeleteBatchResult }>(
      `/delivery-data/batches/${batchId}`,
    );
    return response.data.data;
  },
};
