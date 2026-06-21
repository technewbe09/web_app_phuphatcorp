import axiosClient from './axiosClient';

export interface InspectionRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  inspection_date: string;
  expiry_date: string;
  notes: string | null;
  status: 'active' | 'expired' | 'superseded' | 'deleted';
  images?: InspectionImage[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionImage {
  id: number;
  inspection_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface InspectionListResult {
  inspections: InspectionRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInspectionInput {
  vehicle_id: number;
  inspection_date: string;
  expiry_date: string;
  notes?: string;
}

export interface UpdateInspectionInput {
  inspection_date?: string;
  expiry_date?: string;
  notes?: string;
}

export const vehicleInspectionApi = {
  fetchAll: async (params?: {
    vehicle_id?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InspectionListResult> => {
    const response = await axiosClient.get<{ data: InspectionListResult }>(
      '/vehicle-inspections',
      { params },
    );
    return response.data.data;
  },

  fetchById: async (id: number): Promise<InspectionRecord> => {
    const response = await axiosClient.get<{ data: InspectionRecord }>(
      `/vehicle-inspections/${id}`,
    );
    return response.data.data;
  },

  create: async (input: CreateInspectionInput): Promise<InspectionRecord> => {
    const response = await axiosClient.post<{ data: InspectionRecord }>(
      '/vehicle-inspections',
      input,
    );
    return response.data.data;
  },

  update: async (id: number, input: UpdateInspectionInput): Promise<InspectionRecord> => {
    const response = await axiosClient.put<{ data: InspectionRecord }>(
      `/vehicle-inspections/${id}`,
      input,
    );
    return response.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-inspections/${id}`);
  },

  fetchExpiring: async (days: number = 30): Promise<InspectionRecord[]> => {
    const response = await axiosClient.get<{ data: { inspections: InspectionRecord[] } }>(
      '/vehicle-inspections/expiring',
      { params: { days } },
    );
    return response.data.data.inspections;
  },

  uploadImage: async (inspectionId: number, file: File): Promise<InspectionImage> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axiosClient.post<{ data: InspectionImage }>(
      `/vehicle-inspections/${inspectionId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  deleteImage: async (inspectionId: number, imageId: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-inspections/${inspectionId}/images/${imageId}`);
  },
};
