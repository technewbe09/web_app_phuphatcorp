import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  vehicleRepairApi,
  type CreateRepairInput,
  type UpdateRepairInput,
  type UploadBillRow,
} from '../api/vehicleRepairApi';

const QUERY_KEY = ['repairs'];

export function useGetRepairSummary(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'summary', params],
    queryFn: () => vehicleRepairApi.fetchSummary(params),
  });
}

export function useGetVehicleRepairs(vehicleId: number, params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'vehicle', vehicleId, params],
    queryFn: () => vehicleRepairApi.fetchByVehicle(vehicleId, params),
    enabled: vehicleId > 0,
    placeholderData: keepPreviousData,
  });
}

export function useGetRepair(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => vehicleRepairApi.fetchById(id),
    enabled: id > 0,
  });
}

export function useCreateRepair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRepairInput) => vehicleRepairApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateRepair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRepairInput }) =>
      vehicleRepairApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteRepair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleRepairApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadRepairImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, file }: { repairId: number; file: File }) =>
      vehicleRepairApi.uploadImage(repairId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteRepairImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, imageId }: { repairId: number; imageId: number }) =>
      vehicleRepairApi.deleteImage(repairId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadRepairs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bills: UploadBillRow[]) => vehicleRepairApi.uploadMany(bills),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
