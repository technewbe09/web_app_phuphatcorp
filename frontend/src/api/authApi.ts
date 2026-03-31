import axiosClient from './axiosClient';
import type { LoginRequest, RegisterRequest, UserPublic } from '../types/user';

// Backend trả: { success, message, data: { user, accessToken } }
export interface AuthResponse {
  user: UserPublic;
  accessToken: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<{ data: AuthResponse }>('/auth/login', data);
    return response.data.data;
  },

  register: async (data: RegisterRequest): Promise<{ message: string }> => {
    const response = await axiosClient.post<{ data: { message: string } }>('/auth/register', data);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await axiosClient.post('/auth/logout');
  },

  getMe: async (): Promise<UserPublic> => {
    const response = await axiosClient.get<{ data: UserPublic }>('/auth/me');
    return response.data.data;
  },
};
