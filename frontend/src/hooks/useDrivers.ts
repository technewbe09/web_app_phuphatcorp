import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi, type CreateDriverRequest } from '../api/driverApi';

export function useGetDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: driverApi.fetchDrivers,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDriverRequest) => driverApi.createDriver(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateDriverRequest }) => driverApi.updateDriver(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => driverApi.deleteDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
}
