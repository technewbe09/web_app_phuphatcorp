import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { innerCityCustomerApi, type InnerCityCustomerData } from '../api/innerCityCustomerApi';

const QUERY_KEY = ['inner-city-customers'];

export function useGetInnerCityCustomers(search?: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [...QUERY_KEY, { search, page, limit }],
    queryFn: () => innerCityCustomerApi.fetchAll({ search, page, limit }),
  });
}

export function useCreateInnerCityCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InnerCityCustomerData) => innerCityCustomerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateInnerCityCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InnerCityCustomerData }) =>
      innerCityCustomerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteInnerCityCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => innerCityCustomerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
