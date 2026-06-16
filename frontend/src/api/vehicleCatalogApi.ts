import axiosClient from './axiosClient';

export interface Vehicle {
  id: number;
  plate_number: string;
  driver_name: string;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

export interface VehicleUploadResult {
  imported: number;
  reactivated: number;
}

export interface VehicleUploadError {
  row: number;
  driver_name: string;
  plate_number: string;
  reason: string;
}

export const vehicleCatalogApi = {
  fetchAll: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<VehicleListResponse> => {
    const response = await axiosClient.get<{ data: VehicleListResponse }>(
      '/vehicles',
      { params },
    );
    return response.data.data;
  },

  upload: async (file: File): Promise<VehicleUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post<{ data: VehicleUploadResult }>(
      '/vehicles/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/vehicles/${id}`);
  },
};
