import { pool } from '../config/database';
import { Role, RoleWithStats, RoleWithPermissions, Permission, UserPublic } from '../types/user';

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
  }
}

function generateCode(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export const roleService = {
  async getRoles(): Promise<RoleWithStats[]> {
    const result = await pool.query<RoleWithStats>(`
      SELECT
        r.id, r.name, r.code, r.description,
        r.is_active, r.is_system, r.created_at, r.updated_at,
        COUNT(DISTINCT u.id)::int  AS user_count,
        COUNT(DISTINCT rp.permission_id)::int AS permission_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.created_at ASC
    `);
    return result.rows;
  },

  async getRoleById(id: number): Promise<RoleWithPermissions | null> {
    const roleResult = await pool.query<Role>(
      'SELECT * FROM roles WHERE id = $1',
      [id],
    );
    if (!roleResult.rows[0]) return null;

    const permResult = await pool.query<Permission>(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.code
    `, [id]);

    return { ...roleResult.rows[0], permissions: permResult.rows };
  },

  async createRole(data: { name: string; description?: string }): Promise<Role> {
    const baseCode = generateCode(data.name);

    // Ensure unique code
    const existing = await pool.query<{ code: string }>(
      "SELECT code FROM roles WHERE code LIKE $1 || '%'",
      [baseCode],
    );
    let code = baseCode;
    if (existing.rows.some((r) => r.code === baseCode)) {
      const suffixes = existing.rows
        .map((r) => {
          const match = r.code.match(/^.+?_(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => n > 0);
      const next = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2;
      code = `${baseCode}_${next}`;
    }

    const result = await pool.query<Role>(
      `INSERT INTO roles (name, code, description, is_active, is_system)
       VALUES ($1, $2, $3, TRUE, FALSE)
       RETURNING *`,
      [data.name.trim(), code, data.description?.trim() || null],
    );
    return result.rows[0];
  },

  async updateRole(id: number, data: { name: string; description?: string }): Promise<Role> {
    const result = await pool.query<Role>(
      `UPDATE roles SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [data.name.trim(), data.description?.trim() || null, id],
    );
    if (!result.rows[0]) throw new ServiceError('Vai trò không tồn tại', 404);
    return result.rows[0];
  },

  async toggleRoleActive(id: number, isActive: boolean): Promise<{ role: Role; affected_users: number }> {
    const role = await pool.query<Role>('SELECT * FROM roles WHERE id = $1', [id]);
    if (!role.rows[0]) throw new ServiceError('Vai trò không tồn tại', 404);
    if (role.rows[0].is_system && !isActive) {
      throw new ServiceError('Không thể deactivate vai trò hệ thống', 400, 'SYSTEM_ROLE');
    }

    const countResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::int as count FROM users WHERE role_id = $1',
      [id],
    );
    const affected_users = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const updated = await pool.query<Role>(
      'UPDATE roles SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, id],
    );
    return { role: updated.rows[0], affected_users };
  },

  async getRoleUsers(id: number): Promise<{ users: UserPublic[]; total: number }> {
    const result = await pool.query<UserPublic & { total: bigint }>(
      `SELECT id, email, full_name, role, role_id, is_active,
              COUNT(*) OVER() AS total
       FROM users WHERE role_id = $1 ORDER BY full_name`,
      [id],
    );
    const total = result.rows[0] ? Number(result.rows[0].total) : 0;
    const users = result.rows.map(({ total: _t, ...u }) => u as UserPublic);
    return { users, total };
  },
};
