import axiosClient from './axiosClient';

export interface OilChangeRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  change_date: string;
  odometer_at: number;
  oil_type: string | null;
  notes: string | null;
  status: 'active' | 'deleted';
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface OilChangeDueVehicle {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  last_oil_change_date: string | null;
  last_oil_change_km: number | null;
  current_km: number | null;
  interval_km: number;
  km_since_change: number | null;
  km_overdue: number | null;
  status: 'overdue' | 'due_soon' | 'ok' | 'no_data';
}

export interface OilChangeListResult {
  records: OilChangeRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateOilChangeInput {
  vehicle_id: number;
  change_date: string;
  odometer_at: number;
  oil_type?: string;
  notes?: string;
}

export interface UpdateOilChangeInput {
  change_date?: string;
  odometer_at?: number;
  oil_type?: string;
  notes?: string;
}

export const vehicleOilChangeApi = {
  fetchAll: async (params?: {
    vehicle_id?: number;
    page?: number;
    limit?: number;
  }): Promise<OilChangeListResult> => {
    const response = await axiosClient.get<{ data: OilChangeListResult }>(
      '/vehicle-oil-changes',
      { params },
    );
    return response.data.data;
  },

  fetchById: async (id: number): Promise<OilChangeRecord> => {
    const response = await axiosClient.get<{ data: OilChangeRecord }>(
      `/vehicle-oil-changes/${id}`,
    );
    return response.data.data;
  },

  create: async (input: CreateOilChangeInput): Promise<OilChangeRecord> => {
    const response = await axiosClient.post<{ data: OilChangeRecord }>(
      '/vehicle-oil-changes',
      input,
    );
    return response.data.data;
  },

  update: async (id: number, input: UpdateOilChangeInput): Promise<OilChangeRecord> => {
    const response = await axiosClient.put<{ data: OilChangeRecord }>(
      `/vehicle-oil-changes/${id}`,
      input,
    );
    return response.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/vehicle-oil-changes/${id}`);
  },

  fetchDue: async (): Promise<OilChangeDueVehicle[]> => {
    const response = await axiosClient.get<{ data: { vehicles: OilChangeDueVehicle[] } }>(
      '/vehicle-oil-changes/due',
    );
    return response.data.data.vehicles;
  },

  updateInterval: async (vehicleId: number, intervalKm: number): Promise<void> => {
    await axiosClient.put(`/vehicles/${vehicleId}/oil-interval`, {
      oil_change_interval_km: intervalKm,
    });
  },
};
