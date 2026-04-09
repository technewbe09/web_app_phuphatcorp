import axiosClient from './axiosClient';

export interface WeightAdjustment {
  id: number;
  ma_hang: string;
  ten_hang: string;
  gia_tri_cu: number | null;
  gia_tri_dieu_chinh: number;
  status: 'active' | 'deactive';
  version: number;
  start_date: string;
  end_date: string | null;
  action_type: 'create' | 'update' | 'delete' | 'upload';
  action_by: number | null;
  action_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWeightAdjustmentRequest {
  ma_hang: string;
  ten_hang: string;
  gia_tri_cu?: number | null;
  gia_tri_dieu_chinh: number;
}

export interface UploadWeightAdjustmentRow {
  ma_hang: string;
  ten_hang: string;
  gia_tri_cu?: number | null;
  gia_tri_dieu_chinh: number;
}

export interface WeightAdjustmentUploadError {
  row: number;
  ma_hang: string;
  reason: string;
}

export const weightAdjustmentApi = {
  fetchAll: async (): Promise<WeightAdjustment[]> => {
    const response = await axiosClient.get<{ data: WeightAdjustment[] }>('/weight-adjustments');
    return response.data.data;
  },

  create: async (data: CreateWeightAdjustmentRequest): Promise<WeightAdjustment> => {
    const response = await axiosClient.post<{ data: WeightAdjustment }>('/weight-adjustments', data);
    return response.data.data;
  },

  update: async (id: number, data: CreateWeightAdjustmentRequest): Promise<WeightAdjustment> => {
    const response = await axiosClient.put<{ data: { newRow: WeightAdjustment } }>(`/weight-adjustments/${id}`, data);
    return response.data.data.newRow;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/weight-adjustments/${id}`);
  },

  upload: async (rows: UploadWeightAdjustmentRow[]): Promise<{ inserted: number }> => {
    const response = await axiosClient.post<{ data: { inserted: number } }>('/weight-adjustments/upload', { rows });
    return response.data.data;
  },
};
