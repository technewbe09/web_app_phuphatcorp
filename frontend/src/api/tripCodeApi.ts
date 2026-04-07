import axiosClient from './axiosClient';

export interface TripCode {
  id: number;
  ma: string;
  tuyen: string;
  so_tien: number | null;
  so_luot: number;
  status: 'active' | 'deactive';
  start_date: string;
  end_date: string | null;
  boc_xep: string | null;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTripCodeRequest {
  ma: string;
  tuyen: string;
  so_tien?: number | null;
  so_luot?: number | null;
  boc_xep?: string | null;
  ghi_chu?: string | null;
}

export interface UploadTripCodeRow {
  ma: string;
  tuyen: string;
  so_tien?: number | null;
  so_luot?: number | null;
  boc_xep?: string | null;
  ghi_chu?: string | null;
}

export interface UploadError {
  row: number;
  ma: string;
  reason: string;
}

export const tripCodeApi = {
  fetchTripCodes: async (): Promise<TripCode[]> => {
    const response = await axiosClient.get<{ data: TripCode[] }>('/trip-codes');
    return response.data.data;
  },

  createTripCode: async (data: CreateTripCodeRequest): Promise<TripCode> => {
    const response = await axiosClient.post<{ data: TripCode }>('/trip-codes', data);
    return response.data.data;
  },

  updateTripCode: async (id: number, data: CreateTripCodeRequest): Promise<TripCode> => {
    const response = await axiosClient.put<{ data: { newRow: TripCode } }>(`/trip-codes/${id}`, data);
    return response.data.data.newRow;
  },

  deleteTripCode: async (id: number): Promise<void> => {
    await axiosClient.delete(`/trip-codes/${id}`);
  },

  uploadTripCodes: async (rows: UploadTripCodeRow[]): Promise<{ inserted: number }> => {
    const response = await axiosClient.post<{ data: { inserted: number } }>('/trip-codes/upload', { rows });
    return response.data.data;
  },
};
