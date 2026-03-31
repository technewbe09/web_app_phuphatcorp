import { pool } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { User, UserPublic, UserRole } from '../types/user';

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
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

    const result = await pool.query<User>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      [data.email, passwordHash, data.full_name, role],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role as UserRole,
    };
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] || null;
  },

  async findUserById(id: number): Promise<UserPublic | null> {
    const result = await pool.query<UserPublic>(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  },
};
