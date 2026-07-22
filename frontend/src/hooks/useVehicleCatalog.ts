import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleCatalogApi, type VehicleData, type VehicleUpdateData } from '../api/vehicleCatalogApi';

const QUERY_KEY = ['vehicles'];

export function useGetVehicles(search?: string, status?: string, vehicle_type?: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [...QUERY_KEY, { search, status, vehicle_type, page, limit }],
    queryFn: () => vehicleCatalogApi.fetchAll({ search, status, vehicle_type, page, limit }),
  });
}

export function useUploadVehicles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => vehicleCatalogApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleVehicleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleCatalogApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VehicleData) => vehicleCatalogApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VehicleUpdateData }) =>
      vehicleCatalogApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

const SUMMARY_KEY = ['vehicleSummary'];

export function useGetVehicleSummary(vehicleId: number) {
  return useQuery({
    queryKey: [...SUMMARY_KEY, vehicleId],
    queryFn: () => vehicleCatalogApi.getSummary(vehicleId),
    enabled: vehicleId > 0,
  });
}
