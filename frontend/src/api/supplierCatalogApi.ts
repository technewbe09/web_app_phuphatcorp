import axiosClient from './axiosClient';

export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  notes: string | null;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface SupplierData {
  supplier_code: string;
  name: string;
  notes?: string | null;
}

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadSupplierRow {
  supplier_code: string;
  name: string;
  notes?: string | null;
}

export interface SupplierUploadError {
  row: number;
  supplier_code: string;
  reason: string;
}

export const supplierCatalogApi = {
  fetchAll: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SupplierListResponse> => {
    const response = await axiosClient.get<{ data: SupplierListResponse }>(
      '/suppliers',
      { params },
    );
    return response.data.data;
  },

  create: async (data: SupplierData): Promise<Supplier> => {
    const response = await axiosClient.post<{ data: Supplier }>('/suppliers', data);
    return response.data.data;
  },

  update: async (id: number, data: SupplierData): Promise<Supplier> => {
    const response = await axiosClient.put<{ data: Supplier }>(`/suppliers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/suppliers/${id}`);
  },

  upload: async (rows: UploadSupplierRow[]): Promise<{ inserted: number }> => {
    const response = await axiosClient.post<{ data: { inserted: number } }>(
      '/suppliers/upload',
      { rows },
    );
    return response.data.data;
  },
};
