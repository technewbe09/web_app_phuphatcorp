import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vehicleInspectionApi,
  type CreateInspectionInput,
  type UpdateInspectionInput,
} from '../api/vehicleInspectionApi';

const QUERY_KEY = ['inspections'];

export function useGetInspections(params?: {
  vehicle_id?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => vehicleInspectionApi.fetchAll(params),
  });
}

export function useGetVehicleSummary(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'summary', params],
    queryFn: () => vehicleInspectionApi.fetchSummary(params),
  });
}

export function useGetInspection(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => vehicleInspectionApi.fetchById(id),
  });
}

export function useGetExpiringInspections(days: number = 30) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'expiring', days],
    queryFn: () => vehicleInspectionApi.fetchExpiring(days),
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInspectionInput) => vehicleInspectionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInspectionInput }) =>
      vehicleInspectionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleInspectionApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadInspectionImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, file }: { inspectionId: number; file: File }) =>
      vehicleInspectionApi.uploadImage(inspectionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteInspectionImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, imageId }: { inspectionId: number; imageId: number }) =>
      vehicleInspectionApi.deleteImage(inspectionId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
