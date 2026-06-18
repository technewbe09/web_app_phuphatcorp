import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryDataApi, type BatchInfo, type BatchRowsResponse, type ImportResult } from '../api/deliveryDataApi';

const DELIVERY_DATA_KEY = 'delivery-data';
const BATCHES_KEY = 'delivery-data-batches';

export function useImportDeliveryData() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: (file: File) => deliveryDataApi.importFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BATCHES_KEY] });
    },
  });
}

export function useGetBatches(page = 1, limit = 20) {
  return useQuery({
    queryKey: [BATCHES_KEY, page, limit],
    queryFn: () => deliveryDataApi.getBatches(page, limit),
    placeholderData: (prev) => prev,
  });
}

export function useGetBatchStats(batchId: string) {
  return useQuery<BatchInfo>({
    queryKey: [DELIVERY_DATA_KEY, 'batch', batchId],
    queryFn: () => deliveryDataApi.getBatchStats(batchId),
    enabled: !!batchId,
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => deliveryDataApi.deleteBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BATCHES_KEY] });
    },
  });
}

export function useGetBatchRows() {
  return useMutation<BatchRowsResponse, Error, string[]>({
    mutationFn: (batchIds: string[]) => deliveryDataApi.getBatchRows(batchIds),
  });
}
