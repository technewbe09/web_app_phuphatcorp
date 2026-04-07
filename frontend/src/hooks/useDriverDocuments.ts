import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi, type UploadDocumentRequest } from '../api/driverApi';

export function useGetDriverDocuments(driverId: number | null) {
  return useQuery({
    queryKey: ['driver-documents', driverId],
    queryFn: () => driverApi.getDocuments(driverId!),
    enabled: driverId !== null,
  });
}

export function useUploadDocument(driverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UploadDocumentRequest) => driverApi.uploadDocument(driverId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] }),
  });
}

export function useDeleteDocument(driverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: number) => driverApi.deleteDocument(driverId, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] }),
  });
}
