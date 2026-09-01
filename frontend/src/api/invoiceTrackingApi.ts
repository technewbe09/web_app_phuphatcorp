import axiosClient from './axiosClient';

export interface DocumentFile {
  file_name: string;
  mime_type: string;
  file_data: string;
  note?: string;
  uploaded_at?: string;
}

export interface InvoiceTrackingTicket {
  id: number;
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  bien_so: string;
  tai_xe: string | null;
  vehicle_id: number | null;
  diem_nhan: string;
  tan: string | null;
  can: string | null;
  ghi_chu: string | null;
  invoice_status: 'created' | 'pending_review' | 'completed' | 'request_supplement';
  driver_id: number | null;
  dispatcher_id: number | null;
  documents: DocumentFile[];
  supplement_note: string | null;
  driver_note: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTrackingFilters {
  status?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceTrackingPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface InvoiceTrackingListResponse {
  items: InvoiceTrackingTicket[];
  pagination: InvoiceTrackingPagination;
}

export interface UploadDocumentsRequest {
  files: Omit<DocumentFile, 'uploaded_at'>[];
  driver_note?: string;
}

export interface ReviewRequest {
  action: 'finish' | 'request_supplement';
  supplement_note?: string;
}

export const invoiceTrackingApi = {
  list: async (filters: InvoiceTrackingFilters): Promise<InvoiceTrackingListResponse> => {
    const params = new URLSearchParams();
    if (filters.status && filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());

    const res = await axiosClient.get<{ success: boolean; data: InvoiceTrackingListResponse }>(
      `/invoice-tracking?${params.toString()}`,
    );
    return res.data.data;
  },

  getById: async (id: number): Promise<InvoiceTrackingTicket> => {
    const res = await axiosClient.get<{ success: boolean; data: InvoiceTrackingTicket }>(
      `/invoice-tracking/${id}`,
    );
    return res.data.data;
  },

  uploadDocuments: async (id: number, data: UploadDocumentsRequest): Promise<InvoiceTrackingTicket> => {
    const res = await axiosClient.post<{ success: boolean; data: InvoiceTrackingTicket }>(
      `/invoice-tracking/${id}/documents`,
      data,
    );
    return res.data.data;
  },

  review: async (id: number, data: ReviewRequest): Promise<InvoiceTrackingTicket> => {
    const res = await axiosClient.put<{ success: boolean; data: InvoiceTrackingTicket }>(
      `/invoice-tracking/${id}/review`,
      data,
    );
    return res.data.data;
  },
};
