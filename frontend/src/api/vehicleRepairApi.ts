import axiosClient from './axiosClient';

export interface RepairItem {
  id: number;
  repair_id: number;
  item_name: string;
  parts_cost: number;
  labor_cost: number;
  created_at: string;
}

export interface RepairRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  repair_date: string;
  garage_name: string;
  total_amount: number;
  notes: string | null;
  status: 'active' | 'deleted';
  items?: RepairItem[];
  images?: RepairImage[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface RepairImage {
  id: number;
  repair_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface VehicleRepairSummary {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  latest_repair_id: number | null;
  latest_repair_date: string | null;
  latest_garage_name: string | null;
  repair_count: number;
  total_repair_amount: string;
}

export interface VehicleSummaryResult {
  vehicles: VehicleRepairSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface RepairListResult {
  repairs: RepairRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRepairInput {
  vehicle_id: number;
  repair_date: string;
  garage_name: string;
  notes?: string;
  items: {
    item_name: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

export interface UploadBillRow {
  plate_number: string;
  repair_date: string;
  garage_name: string;
  notes?: string;
  items: {
    item_name: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

export interface UpdateRepairInput {
  repair_date?: string;
  garage_name?: string;
  notes?: string;
  items?: {
    item_name: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

export interface UploadResult {
  inserted: number;
}

export interface UploadError {
  row: number;
  plate_number: string;
  reason: string;
}

export const vehicleRepairApi = {
  fetchSummary: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<VehicleSummaryResult> => {
    const response = await axiosClient.get<{ data: VehicleSummaryResult }>(
      '/vehicle-repairs/summary',
      { params },
    );
    return response.data.data;
  },

  fetchByVehicle: async (vehicleId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<RepairListResult> => {
    const response = await axiosClient.get<{ data: RepairListResult }>(
      `/vehicle-repairs/vehicle/${vehicleId}`,
      { params },
    );
    return response.data.data;
  },

  fetchById: async (id: number): Promise<RepairRecord> => {
    const response = await axiosClient.get<{ data: RepairRecord }>(
      `/vehicle-repairs/${id}`,
    );
    return response.data.data;
  },

  create: async (input: CreateRepairInput): Promise<RepairRecord> => {
    const response = await axiosClient.post<{ data: RepairRecord }>(
      '/vehicle-repairs',
      input,
    );
    return response.data.data;
  },

  update: async (id: number, input: UpdateRepairInput): Promise<RepairRecord> => {
    const response = await axiosClient.put<{ data: RepairRecord }>(
      `/vehicle-repairs/${id}`,
      input,
    );
    return response.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-repairs/${id}`);
  },

  uploadImage: async (repairId: number, file: File): Promise<RepairImage> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axiosClient.post<{ data: RepairImage }>(
      `/vehicle-repairs/${repairId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  deleteImage: async (repairId: number, imageId: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-repairs/${repairId}/images/${imageId}`);
  },

  uploadMany: async (bills: UploadBillRow[]): Promise<UploadResult> => {
    const response = await axiosClient.post<{ data: UploadResult }>(
      '/vehicle-repairs/upload',
      { bills },
    );
    return response.data.data;
  },
};
