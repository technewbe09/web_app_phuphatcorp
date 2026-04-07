import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi, type CreateVehicleRequest, type UploadVehicleRow } from '../api/vehicleApi';

export function useGetVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleApi.fetchVehicles(),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleRequest) => vehicleApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateVehicleRequest }) =>
      vehicleApi.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleApi.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUploadVehicles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: UploadVehicleRow[]) => vehicleApi.uploadVehicles(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
