import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripCodeApi, type CreateTripCodeRequest, type UploadTripCodeRow } from '../api/tripCodeApi';

export function useGetTripCodes() {
  return useQuery({
    queryKey: ['trip-codes'],
    queryFn: () => tripCodeApi.fetchTripCodes(),
  });
}

export function useCreateTripCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTripCodeRequest) => tripCodeApi.createTripCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-codes'] });
    },
  });
}

export function useUpdateTripCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTripCodeRequest }) =>
      tripCodeApi.updateTripCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-codes'] });
    },
  });
}

export function useDeleteTripCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tripCodeApi.deleteTripCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-codes'] });
    },
  });
}

export function useUploadTripCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: UploadTripCodeRow[]) => tripCodeApi.uploadTripCodes(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-codes'] });
    },
  });
}
