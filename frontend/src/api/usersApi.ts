import axiosClient from './axiosClient';
import type { UserPublic } from '../types/user';

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  role_id?: number;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: string;
  role_id?: number;
  is_active?: boolean;
}

export interface ResetPasswordRequest {
  new_password: string;
}

export interface GetUsersParams {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  users: UserPublic[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const usersApi = {
  getUsers: async (params?: GetUsersParams): Promise<UsersResponse> => {
    const response = await axiosClient.get<{ data: UsersResponse }>('/users', { params });
    return response.data.data;
  },

  getUserById: async (id: number): Promise<UserPublic> => {
    const response = await axiosClient.get<{ data: UserPublic }>(`/users/${id}`);
    return response.data.data;
  },

  createUser: async (data: CreateUserRequest): Promise<UserPublic> => {
    const response = await axiosClient.post<{ data: UserPublic }>('/users', data);
    return response.data.data;
  },

  updateUser: async (id: number, data: UpdateUserRequest): Promise<UserPublic> => {
    const response = await axiosClient.put<{ data: UserPublic }>(`/users/${id}`, data);
    return response.data.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await axiosClient.delete(`/users/${id}`);
  },

  resetPassword: async (id: number, data: ResetPasswordRequest): Promise<void> => {
    await axiosClient.patch(`/users/${id}/password`, data);
  },
};
