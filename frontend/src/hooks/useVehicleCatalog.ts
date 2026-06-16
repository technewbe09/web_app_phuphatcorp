import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleCatalogApi } from '../api/vehicleCatalogApi';

const QUERY_KEY = ['vehicles'];

export function useGetVehicles(search?: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [...QUERY_KEY, { search, page, limit }],
    queryFn: () => vehicleCatalogApi.fetchAll({ search, page, limit }),
  });
}

export function useUploadVehicles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => vehicleCatalogApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleCatalogApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
