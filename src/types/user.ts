import type { UserRole, AccountStatus } from './auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UserUpdate {
  name?: string;
  role?: UserRole;
  status?: AccountStatus;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: AccountStatus;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}
