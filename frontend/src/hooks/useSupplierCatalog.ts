import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierCatalogApi, type SupplierData, type UploadSupplierRow } from '../api/supplierCatalogApi';

const QUERY_KEY = ['suppliers'];

export function useGetSuppliers(search?: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [...QUERY_KEY, { search, page, limit }],
    queryFn: () => supplierCatalogApi.fetchAll({ search, page, limit }),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierData) => supplierCatalogApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SupplierData }) =>
      supplierCatalogApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supplierCatalogApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadSuppliers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: UploadSupplierRow[]) => supplierCatalogApi.upload(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
