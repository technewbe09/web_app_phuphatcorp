import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invoiceTrackingApi,
  type InvoiceTrackingFilters,
  type UploadDocumentsRequest,
  type ReviewRequest,
} from '../api/invoiceTrackingApi';

export function useInvoiceTracking(filters: InvoiceTrackingFilters) {
  return useQuery({
    queryKey: ['invoice-tracking', filters],
    queryFn: () => invoiceTrackingApi.list(filters),
  });
}

export function useInvoiceTrackingDetail(id: number | null) {
  return useQuery({
    queryKey: ['invoice-tracking', id],
    queryFn: () => invoiceTrackingApi.getById(id!),
    enabled: id !== null,
  });
}

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UploadDocumentsRequest }) =>
      invoiceTrackingApi.uploadDocuments(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking'] });
    },
  });
}

export function useReviewTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewRequest }) =>
      invoiceTrackingApi.review(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking'] });
    },
  });
}
