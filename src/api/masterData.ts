import apiClient from './client';
import type { ApiResponse } from '@/types';

export interface SkuValidationError {
  rule: string;
  message: string;
  row: number;
  column: string;
  value: string;
}

export interface SkuListParams {
  page?: number;
  limit?: number;
  search?: string;
  factory?: string[];
  dvt?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface SkuPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface SkuItem {
  id: number;
  ma_hang_hoa: string;
  ten_hang_vn: string;
  ten_hang_en: string | null;
  ma_nha_cung_cap: string | null;
  factory: string;
  dvt: string | null;
  trong_luong_net: number;
  so_giao_dich: number | null;
  created_at: string;
  updated_at: string;
}

export interface SkuListResponse {
  items: SkuItem[];
  pagination: SkuPagination;
  filters: {
    available_dvt: string[];
  };
}

export interface CreateSkuInput {
  ma_hang_hoa: string;
  ten_hang_vn: string;
  ten_hang_en?: string | null;
  ma_nha_cung_cap?: string | null;
  factory: string;
  dvt?: string | null;
  trong_luong_net: number;
  so_giao_dich?: number | null;
}

export interface UpdateSkuInput {
  ten_hang_vn?: string;
  ten_hang_en?: string | null;
  ma_nha_cung_cap?: string | null;
  factory?: string;
  dvt?: string | null;
  trong_luong_net?: number;
  so_giao_dich?: number | null;
}

export interface SkuPreview {
  ma_hang_hoa: string;
  ten_hang_vn: string;
  factory: string;
  dvt: string;
  trong_luong_net: number;
}

export interface ExistingSkuPreview extends SkuPreview {
  current_in_db: Partial<SkuPreview>;
  new_value: Partial<SkuPreview>;
}

export interface UploadResponse {
  status: 'pending_confirm';
  summary: { total: number; new: number; existing: number };
  new_skus: SkuPreview[];
  existing_skus: ExistingSkuPreview[];
  session_token: string;
}

export interface ConfirmResponse {
  status: 'success';
  inserted: number;
  updated: number;
  skipped_new: number;
  skipped_existing: number;
  by_factory: Record<string, number>;
}

export const skuFactoryApi = {
  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<UploadResponse>>(
      '/master-data/sku-factory/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },

  confirmSkuFactory(data: {
    session_token: string;
    new_skus_action: 'insert' | 'skip';
    existing_skus_action: 'update' | 'skip';
  }) {
    return apiClient.post<ApiResponse<ConfirmResponse>>(
      '/master-data/sku-factory/confirm',
      data
    );
  },

  getSkuList(params: SkuListParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.factory) params.factory.forEach(f => searchParams.append('factory', f));
    if (params.dvt) searchParams.set('dvt', params.dvt);
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_dir) searchParams.set('sort_dir', params.sort_dir);
    const qs = searchParams.toString();
    return apiClient.get<ApiResponse<SkuListResponse>>(`/master-data/sku-factory${qs ? `?${qs}` : ''}`).then(r => r.data.data);
  },

  getSkuById(id: number) {
    return apiClient.get<ApiResponse<SkuItem>>(`/master-data/sku-factory/${id}`).then(r => r.data.data);
  },

  createSku(data: CreateSkuInput) {
    return apiClient.post<ApiResponse<SkuItem>>('/master-data/sku-factory', data).then(r => r.data.data);
  },

  updateSku(id: number, data: UpdateSkuInput) {
    return apiClient.put<ApiResponse<SkuItem>>(`/master-data/sku-factory/${id}`, data).then(r => r.data.data);
  },
};
