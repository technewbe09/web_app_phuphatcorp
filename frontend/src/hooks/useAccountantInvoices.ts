import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountantInvoiceApi,
  type AccountantInvoiceFilters,
} from '../api/accountantInvoiceApi';

const QUERY_KEY = 'accountant-invoices';

export function useGetAccountantInvoices(filters: AccountantInvoiceFilters = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => accountantInvoiceApi.fetchList(filters),
    placeholderData: (prev) => prev,
  });
}

export function useGetMissingSummary(batchId?: string, inCatalog?: boolean) {
  return useQuery({
    queryKey: [QUERY_KEY, 'missing', batchId, inCatalog],
    queryFn: () => accountantInvoiceApi.getMissingSummary(batchId, inCatalog),
  });
}

export function useUpdateAccountantInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { trang_thai: string; ghi_chu?: string | null } }) =>
      accountantInvoiceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
