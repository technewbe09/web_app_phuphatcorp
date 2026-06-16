import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  driverInvoiceApi,
  type DriverInvoiceFilters,
  type DriverInvoiceRow,
  type DriverInvoice,
} from '../api/driverInvoiceApi';

const QUERY_KEY = 'driver-invoices';

export function useGetDriverInvoices(filters: DriverInvoiceFilters = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => driverInvoiceApi.fetchList(filters),
    placeholderData: (prev) => prev,
  });
}

export function useUploadDriverInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      originalFilename,
      skipDuplicates,
    }: {
      rows: DriverInvoiceRow[];
      originalFilename: string;
      skipDuplicates: boolean;
    }) => driverInvoiceApi.upload(rows, originalFilename, skipDuplicates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useCreateDriverInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DriverInvoiceRow) => driverInvoiceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteDriverInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => driverInvoiceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateDriverInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DriverInvoiceRow> }) =>
      driverInvoiceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
