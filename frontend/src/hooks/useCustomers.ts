import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type CustomerData, type UploadCustomerRow } from '../api/customersApi';

const QUERY_KEY = ['customers'];

export function useGetCustomers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => customersApi.fetchAll(),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerData) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerData }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUploadCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: UploadCustomerRow[]) => customersApi.upload(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
