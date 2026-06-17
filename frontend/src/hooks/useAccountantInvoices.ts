import { useQuery } from '@tanstack/react-query';
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
