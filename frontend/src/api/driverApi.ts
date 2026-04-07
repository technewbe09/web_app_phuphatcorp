import axiosClient from './axiosClient';

export interface Driver {
  id: number;
  ten_ky_hieu: string;
  ho_ten: string | null;
  lien_he: string | null;
  cccd: string | null;
  ghi_chu: string | null;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface DriverDocumentMeta {
  id: number;
  driver_id: number;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface DriverDocument extends DriverDocumentMeta {
  file_data: string;
}

export interface CreateDriverRequest {
  ten_ky_hieu: string;
  ho_ten?: string | null;
  lien_he?: string | null;
  cccd?: string | null;
  ghi_chu?: string | null;
}

export interface UploadDocumentRequest {
  file_name: string;
  mime_type?: string | null;
  file_data: string;
  file_size?: number | null;
}

export const driverApi = {
  fetchDrivers: async (): Promise<Driver[]> => {
    const response = await axiosClient.get<{ data: Driver[] }>('/drivers');
    return response.data.data;
  },

  createDriver: async (data: CreateDriverRequest): Promise<Driver> => {
    const response = await axiosClient.post<{ data: Driver }>('/drivers', data);
    return response.data.data;
  },

  updateDriver: async (id: number, data: CreateDriverRequest): Promise<Driver> => {
    const response = await axiosClient.put<{ data: Driver }>(`/drivers/${id}`, data);
    return response.data.data;
  },

  deleteDriver: async (id: number): Promise<void> => {
    await axiosClient.delete(`/drivers/${id}`);
  },

  getDocuments: async (driverId: number): Promise<DriverDocumentMeta[]> => {
    const response = await axiosClient.get<{ data: DriverDocumentMeta[] }>(`/drivers/${driverId}/documents`);
    return response.data.data;
  },

  uploadDocument: async (driverId: number, data: UploadDocumentRequest): Promise<DriverDocumentMeta> => {
    const response = await axiosClient.post<{ data: DriverDocumentMeta }>(`/drivers/${driverId}/documents`, data);
    return response.data.data;
  },

  deleteDocument: async (driverId: number, docId: number): Promise<void> => {
    await axiosClient.delete(`/drivers/${driverId}/documents/${docId}`);
  },

  downloadDocument: async (driverId: number, docId: number): Promise<DriverDocument> => {
    const response = await axiosClient.get<{ data: DriverDocument }>(`/drivers/${driverId}/documents/${docId}`);
    return response.data.data;
  },
};
