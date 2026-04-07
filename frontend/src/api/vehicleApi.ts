import axiosClient from './axiosClient';

export interface Vehicle {
  id: number;
  bien_so: string;
  loai: string;
  tai_xe: string[];
  status: 'active' | 'deactive';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleRequest {
  bien_so: string;
  loai: string;
  tai_xe?: string[];
}

export interface UploadVehicleRow {
  bien_so: string;
  loai: string;
  tai_xe?: string[];
}

export interface UploadVehicleError {
  row: number;
  bien_so: string;
  reason: string;
}

export const VEHICLE_LOAI = ['Xe lớn', 'Xe nhỏ'] as const;
export type VehicleLoai = typeof VEHICLE_LOAI[number];

export const vehicleApi = {
  fetchVehicles: async (): Promise<Vehicle[]> => {
    const response = await axiosClient.get<{ data: Vehicle[] }>('/vehicles');
    return response.data.data;
  },

  createVehicle: async (data: CreateVehicleRequest): Promise<Vehicle> => {
    const response = await axiosClient.post<{ data: Vehicle }>('/vehicles', data);
    return response.data.data;
  },

  updateVehicle: async (id: number, data: CreateVehicleRequest): Promise<Vehicle> => {
    const response = await axiosClient.put<{ data: { newVehicle: Vehicle } }>(`/vehicles/${id}`, data);
    return response.data.data.newVehicle;
  },

  deleteVehicle: async (id: number): Promise<void> => {
    await axiosClient.delete(`/vehicles/${id}`);
  },

  uploadVehicles: async (rows: UploadVehicleRow[]): Promise<{ inserted: number }> => {
    const response = await axiosClient.post<{ data: { inserted: number } }>('/vehicles/upload', { rows });
    return response.data.data;
  },
};
