import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invoiceTrackingApi,
  type InvoiceTrackingFilters,
  type InvoiceTrackingStatisticsFilters,
  type UploadDocumentsRequest,
  type ReviewRequest,
} from '../api/invoiceTrackingApi';

export function useInvoiceTracking(filters: InvoiceTrackingFilters) {
  return useQuery({
    queryKey: ['invoice-tracking', 'list', filters],
    queryFn: () => invoiceTrackingApi.list(filters),
  });
}

export function useInvoiceTrackingStatistics(filters: InvoiceTrackingStatisticsFilters) {
  return useQuery({
    queryKey: ['invoice-tracking', 'statistics', filters],
    queryFn: () => invoiceTrackingApi.getStatistics(filters),
  });
}

export function useInvoiceTrackingDetail(id: number | null) {
  return useQuery({
    queryKey: ['invoice-tracking', 'detail', id],
    queryFn: () => invoiceTrackingApi.getById(id!),
    enabled: id !== null && !isNaN(id),
  });
}

export function useInvoiceTrackingHistory(id: number | null) {
  return useQuery({
    queryKey: ['invoice-tracking', 'history', id],
    queryFn: () => invoiceTrackingApi.getHistory(id!),
    enabled: id !== null && !isNaN(id),
  });
}

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UploadDocumentsRequest }) =>
      invoiceTrackingApi.uploadDocuments(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking', 'history', variables.id] });
    },
  });
}

export function useReviewTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewRequest }) =>
      invoiceTrackingApi.review(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-tracking', 'history', variables.id] });
    },
  });
}
