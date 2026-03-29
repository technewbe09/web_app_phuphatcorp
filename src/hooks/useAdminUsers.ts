import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/api/adminUsers';
import type { UserCreate, UserUpdate, UserFilters } from '@/types';

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['adminUsers', 'list', filters],
    queryFn: () => adminUsersApi.listUsers(filters),
    enabled: !!localStorage.getItem('accessToken'),
  });
}

export function useUserById(id: string | undefined) {
  return useQuery({
    queryKey: ['adminUsers', 'detail', id],
    queryFn: () => adminUsersApi.getUserById(id!),
    enabled: !!id && !!localStorage.getItem('accessToken'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCreate) => adminUsersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers', 'list'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) =>
      adminUsersApi.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers', 'detail', id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminUsersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers', 'list'] });
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminUsersApi.resetUserPassword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers', 'list'] });
    },
  });
}
