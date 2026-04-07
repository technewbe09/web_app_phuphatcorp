export const UserRole = {
  ADMIN: 'ADMIN',
  ACCOUNTANT: 'ACCOUNTANT',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface UserPublic {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role?: string;
  role_id?: number | null;
  role_name?: string;
  is_active?: boolean;
  permissions?: string[];
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  full_name: string;
  email: string;
  password: string;
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  user_count?: number;
  permission_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string | null;
  created_at?: string;
}

export interface PermissionMatrix {
  roles: Pick<Role, 'id' | 'name' | 'code' | 'is_system'>[];
  permissions: Permission[];
  matrix: Record<number, number[]>;
}
