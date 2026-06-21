import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vehicleOilChangeApi,
  type CreateOilChangeInput,
  type UpdateOilChangeInput,
} from '../api/vehicleOilChangeApi';

const QUERY_KEY = ['oilChanges'];
const DUE_KEY = ['oilChanges', 'due'];

export function useGetOilChanges(params?: {
  vehicle_id?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => vehicleOilChangeApi.fetchAll(params),
  });
}

export function useGetOilChange(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => vehicleOilChangeApi.fetchById(id),
  });
}

export function useGetDueVehicles() {
  return useQuery({
    queryKey: DUE_KEY,
    queryFn: () => vehicleOilChangeApi.fetchDue(),
  });
}

export function useCreateOilChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOilChangeInput) => vehicleOilChangeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}

export function useUpdateOilChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOilChangeInput }) =>
      vehicleOilChangeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}

export function useDeleteOilChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleOilChangeApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}

export function useUpdateOilInterval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, intervalKm }: { vehicleId: number; intervalKm: number }) =>
      vehicleOilChangeApi.updateInterval(vehicleId, intervalKm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}
