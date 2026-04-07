import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/rolesApi';
import type { CreateRolePayload, UpdateRolePayload } from '../api/rolesApi';

export const ROLES_KEY = ['roles'] as const;

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => {
      const res = await rolesApi.getRoles();
      return res.data.data.roles;
    },
  });
}

export function useRoleById(id: number | null) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const res = await rolesApi.getRoleById(id!);
      return res.data.data.role;
    },
    enabled: id !== null,
  });
}

export function useRoleUsers(id: number | null) {
  return useQuery({
    queryKey: ['roles', id, 'users'],
    queryFn: async () => {
      const res = await rolesApi.getRoleUsers(id!);
      return res.data.data;
    },
    enabled: id !== null,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => rolesApi.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRolePayload }) =>
      rolesApi.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
}

export function useToggleRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      rolesApi.toggleRole(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
}
