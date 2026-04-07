export enum UserRole {
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  VIEWER = 'VIEWER',
}

export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  role_id: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  role_id: number | null;
  role_name?: string;
  is_active: boolean;
  permissions?: string[];
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoleWithStats extends Role {
  user_count: number;
  permission_count: number;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string | null;
  created_at: Date;
}
