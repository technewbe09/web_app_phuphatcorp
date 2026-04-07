import { permissionService } from '../services/permissionService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('permissionService.getAllPermissions', () => {
  it('returns permissions grouped by module', async () => {
    const mockPermissions = [
      { id: 1, code: 'dashboard.view', name: 'Xem Dashboard', module: 'dashboard' },
      { id: 2, code: 'users.view', name: 'Xem người dùng', module: 'users' },
      { id: 3, code: 'users.manage', name: 'Quản lý người dùng', module: 'users' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockPermissions } as never);

    const result = await permissionService.getAllPermissions();

    expect(result.permissions).toHaveLength(3);
    expect(result.grouped['dashboard']).toHaveLength(1);
    expect(result.grouped['users']).toHaveLength(2);
  });
});

describe('permissionService.updateRolePermissions', () => {
  it('throws 403 when trying to update ADMIN permissions', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ is_system: true, code: 'ADMIN' }],
    } as never);

    await expect(
      permissionService.updateRolePermissions(1, [1, 2, 3]),
    ).rejects.toMatchObject({
      message: 'Không thể thay đổi quyền của vai trò ADMIN',
      statusCode: 403,
    });
  });

  it('throws 404 when role not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      permissionService.updateRolePermissions(999, [1]),
    ).rejects.toMatchObject({
      message: 'Vai trò không tồn tại',
      statusCode: 404,
    });
  });

  it('executes DELETE then INSERT for non-ADMIN role', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ is_system: false, code: 'ACCOUNTANT' }] } as never) // get role
      .mockResolvedValueOnce(undefined as never) // BEGIN
      .mockResolvedValueOnce(undefined as never) // DELETE
      .mockResolvedValueOnce(undefined as never) // INSERT
      .mockResolvedValueOnce(undefined as never); // COMMIT

    await expect(
      permissionService.updateRolePermissions(2, [1, 2, 4]),
    ).resolves.toBeUndefined();

    // BEGIN, DELETE, INSERT, COMMIT = 4 calls after the initial role check
    expect(mockPool.query).toHaveBeenCalledTimes(5);
  });

  it('handles empty permission_ids (removes all permissions)', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ is_system: false, code: 'VIEWER' }] } as never)
      .mockResolvedValueOnce(undefined as never) // BEGIN
      .mockResolvedValueOnce(undefined as never) // DELETE
      .mockResolvedValueOnce(undefined as never); // COMMIT (no INSERT for empty array)

    await expect(
      permissionService.updateRolePermissions(3, []),
    ).resolves.toBeUndefined();
  });
});
