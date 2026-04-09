import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weightAdjustmentApi, type CreateWeightAdjustmentRequest, type UploadWeightAdjustmentRow } from '../api/weightAdjustmentApi';

const QUERY_KEY = ['weight-adjustments'];

export function useGetWeightAdjustments() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => weightAdjustmentApi.fetchAll(),
  });
}

export function useCreateWeightAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWeightAdjustmentRequest) => weightAdjustmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateWeightAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateWeightAdjustmentRequest }) =>
      weightAdjustmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteWeightAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => weightAdjustmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadWeightAdjustments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: UploadWeightAdjustmentRow[]) => weightAdjustmentApi.upload(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
