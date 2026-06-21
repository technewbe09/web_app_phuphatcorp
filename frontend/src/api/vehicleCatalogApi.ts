import axiosClient from './axiosClient';

export interface Vehicle {
  id: number;
  plate_number: string;
  driver_name: string;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface VehicleData {
  driver_name: string;
  plate_number: string;
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
    status?: string;
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

  toggleStatus: async (id: number): Promise<Vehicle> => {
    const response = await axiosClient.patch<{ data: Vehicle }>(`/vehicles/${id}/toggle`);
    return response.data.data;
  },

  create: async (data: VehicleData): Promise<Vehicle> => {
    const response = await axiosClient.post<{ data: Vehicle }>('/vehicles', data);
    return response.data.data;
  },

  update: async (id: number, data: { driver_name: string }): Promise<Vehicle> => {
    const response = await axiosClient.put<{ data: Vehicle }>(`/vehicles/${id}`, data);
    return response.data.data;
  },
};
