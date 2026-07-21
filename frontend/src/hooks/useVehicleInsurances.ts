import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vehicleInsuranceApi,
  type CreateInsuranceInput,
  type UpdateInsuranceInput,
} from '../api/vehicleInsuranceApi';

const QUERY_KEY = ['insurances'];

export function useGetInsurances(params?: {
  vehicle_id?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => vehicleInsuranceApi.fetchAll(params),
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
    queryFn: () => vehicleInsuranceApi.fetchSummary(params),
  });
}

export function useGetInsurance(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => vehicleInsuranceApi.fetchById(id),
  });
}

export function useGetExpiringInsurances(days: number = 30) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'expiring', days],
    queryFn: () => vehicleInsuranceApi.fetchExpiring(days),
  });
}

export function useCreateInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInsuranceInput) => vehicleInsuranceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInsuranceInput }) =>
      vehicleInsuranceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleInsuranceApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadInsuranceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ insuranceId, file }: { insuranceId: number; file: File }) =>
      vehicleInsuranceApi.uploadImage(insuranceId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteInsuranceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ insuranceId, imageId }: { insuranceId: number; imageId: number }) =>
      vehicleInsuranceApi.deleteImage(insuranceId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
