import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../api/permissionsApi';

const MATRIX_KEY = ['permissions', 'matrix'] as const;

export function usePermissionMatrix() {
  return useQuery({
    queryKey: MATRIX_KEY,
    queryFn: async () => {
      const res = await permissionsApi.getPermissionMatrix();
      return res.data.data;
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permission_ids }: { roleId: number; permission_ids: number[] }) =>
      permissionsApi.updateRolePermissions(roleId, permission_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATRIX_KEY });
    },
  });
}
