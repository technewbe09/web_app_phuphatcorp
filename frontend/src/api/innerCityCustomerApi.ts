import axiosClient from './axiosClient';

export interface InnerCityCustomer {
  id: number;
  customer_name: string;
  customer_code: string;
  status: 'active' | 'deactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InnerCityCustomerData {
  customer_name: string;
  customer_code: string;
  notes?: string | null;
}

export interface InnerCityCustomerListResponse {
  customers: InnerCityCustomer[];
  total: number;
  page: number;
  limit: number;
}

export const innerCityCustomerApi = {
  fetchAll: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InnerCityCustomerListResponse> => {
    const response = await axiosClient.get<{ data: InnerCityCustomerListResponse }>(
      '/inner-city-customers',
      { params },
    );
    return response.data.data;
  },

  create: async (data: InnerCityCustomerData): Promise<InnerCityCustomer> => {
    const response = await axiosClient.post<{ data: InnerCityCustomer }>(
      '/inner-city-customers',
      data,
    );
    return response.data.data;
  },

  update: async (id: number, data: InnerCityCustomerData): Promise<InnerCityCustomer> => {
    const response = await axiosClient.put<{ data: InnerCityCustomer }>(
      `/inner-city-customers/${id}`,
      data,
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/inner-city-customers/${id}`);
  },
};
