import apiClient from './client';
import type {
  ApiResponse,
  User,
  UserCreate,
  UserUpdate,
  UserFilters,
  UserListResponse,
} from '@/types';

export const adminUsersApi = {
  listUsers: (filters?: UserFilters) =>
    apiClient.get<ApiResponse<UserListResponse>>('/admin/users', { params: filters }).then(r => r.data.data),

  createUser: (data: UserCreate) =>
    apiClient.post<ApiResponse<{ user: User }>>('/admin/users', data).then(r => r.data.data),

  getUserById: (id: string) =>
    apiClient.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`).then(r => r.data.data),

  updateUser: (id: string, data: UserUpdate) =>
    apiClient.put<ApiResponse<{ user: User }>>(`/admin/users/${id}`, data).then(r => r.data.data),

  deleteUser: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/admin/users/${id}`).then(r => r.data.data),

  resetUserPassword: (id: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/admin/users/${id}/reset-password`).then(r => r.data.data),
};
