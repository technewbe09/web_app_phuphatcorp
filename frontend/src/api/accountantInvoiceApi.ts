import axiosClient from './axiosClient';
import type { PaginatedData } from './deliveryDataApi';

export interface AccountantInvoice {
  id: number;
  batch_id: string;
  ngay: string;
  so_xe: string;
  so_hoa_don: string;
  trang_thai: string;
  created_at: string;
}

export interface AccountantInvoiceFilters {
  page?: number;
  limit?: number;
  batch_id?: string;
  ngay_from?: string;
  ngay_to?: string;
  so_xe?: string;
  so_hoa_don?: string;
  trang_thai?: string;
}

export interface MissingDateGroup {
  ngay: string;
  so_hoa_don: string[];
}

export interface MissingVehicle {
  so_xe: string;
  missing_count: number;
  in_catalog: boolean;
  dates: MissingDateGroup[];
}

export const accountantInvoiceApi = {
  fetchList: async (
    filters: AccountantInvoiceFilters = {},
  ): Promise<PaginatedData<AccountantInvoice>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.batch_id) params.set('batch_id', filters.batch_id);
    if (filters.ngay_from) params.set('ngay_from', filters.ngay_from);
    if (filters.ngay_to) params.set('ngay_to', filters.ngay_to);
    if (filters.so_xe) params.set('so_xe', filters.so_xe);
    if (filters.so_hoa_don) params.set('so_hoa_don', filters.so_hoa_don);
    if (filters.trang_thai) params.set('trang_thai', filters.trang_thai);

    const response = await axiosClient.get<{ data: PaginatedData<AccountantInvoice> }>(
      `/accountant-invoices?${params.toString()}`,
    );
    return response.data.data;
  },

  getMissingSummary: async (batchId?: string, inCatalog?: boolean): Promise<MissingVehicle[]> => {
    const params = new URLSearchParams();
    if (batchId) params.set('batch_id', batchId);
    if (inCatalog !== undefined) params.set('in_catalog', String(inCatalog));
    const response = await axiosClient.get<{ data: MissingVehicle[] }>(
      `/accountant-invoices/missing-summary?${params.toString()}`,
    );
    return response.data.data;
  },
};
