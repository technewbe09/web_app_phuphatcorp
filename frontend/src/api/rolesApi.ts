import axiosClient from './axiosClient';
import type { Role } from '../types/user';

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface UpdateRolePayload {
  name: string;
  description?: string;
}

export const rolesApi = {
  getRoles: () =>
    axiosClient.get<{ success: boolean; data: { roles: Role[] } }>('/roles'),

  getRoleById: (id: number) =>
    axiosClient.get<{ success: boolean; data: { role: Role & { permissions: { id: number }[] } } }>(`/roles/${id}`),

  getRoleUsers: (id: number) =>
    axiosClient.get<{ success: boolean; data: { users: unknown[]; total: number } }>(`/roles/${id}/users`),

  createRole: (payload: CreateRolePayload) =>
    axiosClient.post<{ success: boolean; data: { role: Role } }>('/roles', payload),

  updateRole: (id: number, payload: UpdateRolePayload) =>
    axiosClient.put<{ success: boolean; data: { role: Role } }>(`/roles/${id}`, payload),

  toggleRole: (id: number, is_active: boolean) =>
    axiosClient.patch<{ success: boolean; data: { role: Role; affected_users: number } }>(
      `/roles/${id}/toggle`,
      { is_active },
    ),
};
