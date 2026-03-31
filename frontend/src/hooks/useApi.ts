import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';

export function useApi<TData, TVariables>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  url: string,
  options?: {
    queryOptions?: UseQueryOptions<TData>;
    mutationOptions?: Parameters<typeof useMutation<TData, Error, TVariables>>[0]['options'];
  }
) {
  const queryKey = [method, url];

  const queryFn = async () => {
    const response = await axiosClient.request<TData>({ method, url });
    return response.data;
  };

  const queryResult = useQuery<TData>({
    queryKey,
    queryFn,
    enabled: method === 'get',
    ...options?.queryOptions,
  });

  const mutationResult = useMutation<TData, Error, TVariables>({
    mutationFn: (variables) =>
      axiosClient.request<TData>({ method, url, data: variables }),
    ...options?.mutationOptions,
  });

  return method === 'get' ? queryResult : mutationResult;
}
