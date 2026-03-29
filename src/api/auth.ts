import apiClient from './client';
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  RefreshResponse,
} from '@/types';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<{ user: User; message: string }>>('/auth/register', data).then(r => r.data.data),

  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data).then(r => r.data.data),

  logout: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/logout', { refreshToken }).then(r => r.data.data),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh', { refreshToken }).then(r => r.data.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', data).then(r => r.data.data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', data).then(r => r.data.data),

  getMe: () =>
    apiClient.get<ApiResponse<{ user: User }>>('/auth/me').then(r => r.data.data),
};
