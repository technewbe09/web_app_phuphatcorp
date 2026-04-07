import axiosClient from './axiosClient';
import type { Permission, PermissionMatrix } from '../types/user';

export const permissionsApi = {
  getPermissions: () =>
    axiosClient.get<{
      success: boolean;
      data: { permissions: Permission[]; grouped: Record<string, Permission[]> };
    }>('/permissions'),

  getPermissionMatrix: () =>
    axiosClient.get<{ success: boolean; data: PermissionMatrix }>('/permissions/matrix'),

  updateRolePermissions: (roleId: number, permission_ids: number[]) =>
    axiosClient.put<{ success: boolean; message: string }>(
      `/permissions/role/${roleId}`,
      { permission_ids },
    ),
};
