import axiosClient from './axiosClient';

export interface InsuranceRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  purchase_date: string;
  expiry_date: string;
  notes: string | null;
  status: 'active' | 'expired' | 'superseded' | 'deleted';
  images?: InsuranceImage[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceImage {
  id: number;
  insurance_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface InsuranceListResult {
  insurances: InsuranceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface VehicleInsuranceSummary {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  latest_insurance_id: number | null;
  latest_purchase_date: string | null;
  latest_expiry_date: string | null;
  latest_status: string | null;
  insurance_count: number;
}

export interface VehicleSummaryResult {
  vehicles: VehicleInsuranceSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInsuranceInput {
  vehicle_id: number;
  purchase_date: string;
  expiry_date: string;
  notes?: string;
}

export interface UpdateInsuranceInput {
  purchase_date?: string;
  expiry_date?: string;
  notes?: string;
}

export const vehicleInsuranceApi = {
  fetchAll: async (params?: {
    vehicle_id?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InsuranceListResult> => {
    const response = await axiosClient.get<{ data: InsuranceListResult }>(
      '/vehicle-insurances',
      { params },
    );
    return response.data.data;
  },

  fetchSummary: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<VehicleSummaryResult> => {
    const response = await axiosClient.get<{ data: VehicleSummaryResult }>(
      '/vehicle-insurances/summary',
      { params },
    );
    return response.data.data;
  },

  fetchById: async (id: number): Promise<InsuranceRecord> => {
    const response = await axiosClient.get<{ data: InsuranceRecord }>(
      `/vehicle-insurances/${id}`,
    );
    return response.data.data;
  },

  create: async (input: CreateInsuranceInput): Promise<InsuranceRecord> => {
    const response = await axiosClient.post<{ data: InsuranceRecord }>(
      '/vehicle-insurances',
      input,
    );
    return response.data.data;
  },

  update: async (id: number, input: UpdateInsuranceInput): Promise<InsuranceRecord> => {
    const response = await axiosClient.put<{ data: InsuranceRecord }>(
      `/vehicle-insurances/${id}`,
      input,
    );
    return response.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-insurances/${id}`);
  },

  fetchExpiring: async (days: number = 30): Promise<InsuranceRecord[]> => {
    const response = await axiosClient.get<{ data: { insurances: InsuranceRecord[] } }>(
      '/vehicle-insurances/expiring',
      { params: { days } },
    );
    return response.data.data.insurances;
  },

  uploadImage: async (insuranceId: number, file: File): Promise<InsuranceImage> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axiosClient.post<{ data: InsuranceImage }>(
      `/vehicle-insurances/${insuranceId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  deleteImage: async (insuranceId: number, imageId: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-insurances/${insuranceId}/images/${imageId}`);
  },
};
