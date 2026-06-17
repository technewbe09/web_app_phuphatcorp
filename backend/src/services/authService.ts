import { pool } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { User, UserPublic, UserRole } from '../types/user';

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

async function loadUserWithPermissions(userId: number): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic & {
    permissions: string | null;
    role_name: string | null;
    role_is_active: boolean | null;
  }>(
    `SELECT
       u.id, u.email, u.username, u.full_name, u.role, u.role_id, u.is_active,
       r.name AS role_name,
       r.is_active AS role_is_active,
       COALESCE(
         json_agg(p.code) FILTER (WHERE p.code IS NOT NULL),
         '[]'
       )::text AS permissions
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = $1
     GROUP BY u.id, r.id`,
    [userId],
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];

  let permissions: string[] = [];
  try {
    permissions = JSON.parse(row.permissions ?? '[]');
  } catch {
    permissions = [];
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    full_name: row.full_name,
    role: row.role as UserRole,
    role_id: row.role_id,
    is_active: row.is_active,
    role_name: row.role_name ?? undefined,
    permissions,
  };
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  },

  comparePassword(password: string, hash: string): boolean {
    return comparePassword(password, hash);
  },

  async createUser(data: CreateUserData): Promise<UserPublic> {
    const passwordHash = await this.hashPassword(data.password);
    const role = data.role || UserRole.VIEWER;

    // Resolve role_id from legacy role code
    let roleId: number | null = null;
    const roleResult = await pool.query<{ id: number }>(
      'SELECT id FROM roles WHERE code = $1',
      [role],
    );
    if (roleResult.rows[0]) {
      roleId = roleResult.rows[0].id;
    }

    const result = await pool.query<User>(
      `INSERT INTO users (email, username, password_hash, full_name, role, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, full_name, role, role_id`,
      [data.email, data.username, passwordHash, data.full_name, role, roleId],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      full_name: row.full_name,
      role: row.role as UserRole,
      role_id: row.role_id ?? null,
      is_active: true,
      permissions: [],
    };
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] || null;
  },

  async findUserByUsername(username: string): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );
    return result.rows[0] || null;
  },

  async findUserById(id: number): Promise<UserPublic | null> {
    return loadUserWithPermissions(id);
  },
};
