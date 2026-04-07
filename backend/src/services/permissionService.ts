import { pool } from '../config/database';
import { Permission } from '../types/user';
import { ServiceError } from './roleService';

interface PermissionGrouped {
  [module: string]: Permission[];
}

interface PermissionMatrix {
  roles: { id: number; name: string; code: string; is_system: boolean }[];
  permissions: Permission[];
  matrix: { [roleId: number]: number[] };
}

export const permissionService = {
  async getAllPermissions(): Promise<{ permissions: Permission[]; grouped: PermissionGrouped }> {
    const result = await pool.query<Permission>(
      'SELECT * FROM permissions ORDER BY module, code',
    );
    const permissions = result.rows;

    const grouped: PermissionGrouped = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }

    return { permissions, grouped };
  },

  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const rolesResult = await pool.query<{
      id: number; name: string; code: string; is_system: boolean;
    }>('SELECT id, name, code, is_system FROM roles WHERE is_active = TRUE ORDER BY is_system DESC, name');

    const permResult = await pool.query<Permission>(
      'SELECT * FROM permissions ORDER BY module, code',
    );

    const rpResult = await pool.query<{ role_id: number; permission_id: number }>(
      'SELECT role_id, permission_id FROM role_permissions',
    );

    const matrix: { [roleId: number]: number[] } = {};
    for (const row of rpResult.rows) {
      if (!matrix[row.role_id]) matrix[row.role_id] = [];
      matrix[row.role_id].push(row.permission_id);
    }

    return {
      roles: rolesResult.rows,
      permissions: permResult.rows,
      matrix,
    };
  },

  async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const roleResult = await pool.query<{ is_system: boolean; code: string }>(
      'SELECT is_system, code FROM roles WHERE id = $1',
      [roleId],
    );
    if (!roleResult.rows[0]) throw new ServiceError('Vai trò không tồn tại', 404);
    if (roleResult.rows[0].code === 'ADMIN') {
      throw new ServiceError('Không thể thay đổi quyền của vai trò ADMIN', 403, 'ADMIN_READONLY');
    }

    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      if (permissionIds.length > 0) {
        const values = permissionIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values} ON CONFLICT DO NOTHING`,
          [roleId, ...permissionIds],
        );
      }

      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  },
};
