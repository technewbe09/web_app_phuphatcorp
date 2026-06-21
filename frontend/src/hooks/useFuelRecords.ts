import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fuelRecordApi } from '../api/fuelRecordApi';
import type { FuelListParams, FuelStatsParams } from '../api/fuelRecordApi';

const QUERY_KEY = ['fuel-records'];

export function useGetFuelRecords(params?: FuelListParams) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => fuelRecordApi.fetchAll(params),
  });
}

export function useGetFuelRecordById(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, { id }],
    queryFn: () => fuelRecordApi.fetchById(id),
    enabled: id > 0,
  });
}

export function useCreateFuelRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fuelRecordApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateFuelRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof fuelRecordApi.update>[1] }) =>
      fuelRecordApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteFuelRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fuelRecordApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadFuelExcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fuelRecordApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useGetFuelStatistics(params?: FuelStatsParams) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'statistics', params],
    queryFn: () => fuelRecordApi.fetchStatistics(params),
  });
}

export function useGetFuelMonths() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'months'],
    queryFn: () => fuelRecordApi.fetchMonths(),
  });
}

export function useGetFuelBatches() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'batches'],
    queryFn: () => fuelRecordApi.fetchBatches(),
  });
}

export function useDeleteFuelBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fuelRecordApi.deleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useGetFuelMonitoring(threshold: number = 10) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'monitoring', { threshold }],
    queryFn: () => fuelRecordApi.fetchMonitoring(threshold),
  });
}
