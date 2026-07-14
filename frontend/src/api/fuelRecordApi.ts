import axiosClient from './axiosClient';
import type {
  FuelRecord,
  FuelRecordListResult,
  FuelStatisticsResult,
  UploadResult,
  CreateFuelRecordInput,
  UpdateFuelRecordInput,
  BatchInfo,
  MonitoringVehicle,
  LocationFuelStat,
  FuelRecordImage,
  WithoutFuelVehicle,
} from '../types/fuelRecord';

export interface FuelListParams {
  vehicle_id?: number;
  month?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FuelStatsParams {
  month?: string;
  vehicle_id?: number;
  date_from?: string;
  date_to?: string;
}

export const fuelRecordApi = {
  fetchAll: async (params?: FuelListParams): Promise<FuelRecordListResult> => {
    const response = await axiosClient.get<{ data: FuelRecordListResult }>(
      '/fuel-records',
      { params },
    );
    return response.data.data;
  },

  fetchById: async (id: number): Promise<FuelRecord> => {
    const response = await axiosClient.get<{ data: FuelRecord }>(
      `/fuel-records/${id}`,
    );
    return response.data.data;
  },

  create: async (input: CreateFuelRecordInput): Promise<FuelRecord> => {
    const response = await axiosClient.post<{ data: FuelRecord }>(
      '/fuel-records',
      input,
    );
    return response.data.data;
  },

  update: async (id: number, input: UpdateFuelRecordInput): Promise<FuelRecord> => {
    const response = await axiosClient.put<{ data: FuelRecord }>(
      `/fuel-records/${id}`,
      input,
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/fuel-records/${id}`);
  },

  upload: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post<{ data: UploadResult }>(
      '/fuel-records/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  fetchStatistics: async (params?: FuelStatsParams): Promise<FuelStatisticsResult> => {
    const response = await axiosClient.get<{ data: FuelStatisticsResult }>(
      '/fuel-records/statistics',
      { params },
    );
    return response.data.data;
  },

  fetchStatisticsByLocation: async (params?: { month?: string }): Promise<{ byLocation: LocationFuelStat[] }> => {
    const response = await axiosClient.get<{ data: { byLocation: LocationFuelStat[] } }>(
      '/fuel-records/statistics/by-location',
      { params },
    );
    return response.data.data;
  },

  fetchMonths: async (): Promise<string[]> => {
    const response = await axiosClient.get<{ data: string[] }>(
      '/fuel-records/months',
    );
    return response.data.data;
  },

  fetchBatches: async (): Promise<BatchInfo[]> => {
    const response = await axiosClient.get<{ data: BatchInfo[] }>(
      '/fuel-records/batches',
    );
    return response.data.data;
  },

  deleteBatch: async (batchId: string): Promise<{ deleted: number }> => {
    const response = await axiosClient.delete<{ data: { deleted: number } }>(
      `/fuel-records/batches/${batchId}`,
    );
    return response.data.data;
  },

  fetchLatestOdometer: async (vehicleId: number): Promise<number | null> => {
    const response = await axiosClient.get<{ data: { odometer_new: number | null } }>(
      `/fuel-records/latest-odometer/${vehicleId}`,
    );
    return response.data.data.odometer_new;
  },

  fetchMonitoring: async (threshold: number = 10): Promise<MonitoringVehicle[]> => {
    const response = await axiosClient.get<{ data: MonitoringVehicle[] }>(
      '/fuel-records/monitoring',
      { params: { threshold } },
    );
    return response.data.data;
  },

  // ── Images ──

  fetchImages: async (recordId: number): Promise<FuelRecordImage[]> => {
    const response = await axiosClient.get<{ data: FuelRecordImage[] }>(
      `/fuel-records/${recordId}/images`,
    );
    return response.data.data;
  },

  fetchWithoutFuel: async (days: number = 30): Promise<WithoutFuelVehicle[]> => {
    const response = await axiosClient.get<{ data: WithoutFuelVehicle[] }>(
      '/fuel-records/without-fuel',
      { params: { days } },
    );
    return response.data.data;
  },

  uploadImage: async (recordId: number, file: File): Promise<FuelRecordImage> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axiosClient.post<{ data: FuelRecordImage }>(
      `/fuel-records/${recordId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  deleteImage: async (recordId: number, imageId: number): Promise<void> => {
    await axiosClient.delete(`/fuel-records/${recordId}/images/${imageId}`);
  },
};
