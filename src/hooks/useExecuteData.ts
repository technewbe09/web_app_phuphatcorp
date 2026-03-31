import { useMutation } from '@tanstack/react-query';
import { executeDataApi } from '@/api/executeData';

export function useExecuteData() {
  return useMutation({
    mutationFn: (file: File) => executeDataApi.processFile(file),
  });
}
