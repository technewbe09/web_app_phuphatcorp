import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { skuFactoryApi } from '@/api/masterData';
import type { SkuListParams, CreateSkuInput, UpdateSkuInput } from '@/api/masterData';

export function useSkuFactoryUpload() {
  return useMutation({
    mutationFn: (file: File) => skuFactoryApi.uploadFile(file),
  });
}

interface ConfirmData {
  session_token: string;
  new_skus_action: 'insert' | 'skip';
  existing_skus_action: 'update' | 'skip';
}

export function useSkuFactoryConfirm() {
  return useMutation({
    mutationFn: (data: ConfirmData) => skuFactoryApi.confirmSkuFactory(data),
  });
}

export function useSkuFactoryList(params: SkuListParams = {}) {
  return useQuery({
    queryKey: ['sku-factory', 'list', params],
    queryFn: () => skuFactoryApi.getSkuList(params),
    placeholderData: (prev) => prev,
  });
}

export function useSkuById(id: number | null) {
  return useQuery({
    queryKey: ['sku-factory', id],
    queryFn: () => skuFactoryApi.getSkuById(id!),
    enabled: id !== null,
  });
}

export function useCreateSku() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSkuInput) => skuFactoryApi.createSku(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sku-factory', 'list'] });
    },
  });
}

export function useUpdateSku() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSkuInput }) =>
      skuFactoryApi.updateSku(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sku-factory'] });
    },
  });
}
