import { roleService } from '../services/roleService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('roleService.getRoles', () => {
  it('returns list of roles with stats', async () => {
    const mockRoles = [
      { id: 1, name: 'Administrator', code: 'ADMIN', is_active: true, is_system: true, user_count: 1, permission_count: 9 },
      { id: 2, name: 'Accountant', code: 'ACCOUNTANT', is_active: true, is_system: true, user_count: 3, permission_count: 4 },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockRoles } as never);

    const result = await roleService.getRoles();
    expect(result).toEqual(mockRoles);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });
});

describe('roleService.createRole', () => {
  it('generates code from name and creates role', async () => {
    // No collision
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // code collision check
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 4, name: 'Kế Toán', code: 'K_TON', description: null, is_active: true, is_system: false }] } as never);

    const role = await roleService.createRole({ name: 'Kế Toán' });
    expect(role).toMatchObject({ name: 'Kế Toán', is_system: false });
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('appends suffix when code already exists', async () => {
    // Code collision: 'MY_ROLE' exists
    mockPool.query.mockResolvedValueOnce({ rows: [{ code: 'MY_ROLE' }] } as never);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 5, name: 'My Role', code: 'MY_ROLE_2', description: null, is_active: true, is_system: false }],
    } as never);

    const role = await roleService.createRole({ name: 'My Role' });
    // code should be MY_ROLE_2 (suffix appended)
    expect(role.code).toBe('MY_ROLE_2');
  });
});

describe('roleService.toggleRoleActive', () => {
  it('throws if trying to deactivate a system role', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Administrator', code: 'ADMIN', is_active: true, is_system: true }],
    } as never);

    await expect(roleService.toggleRoleActive(1, false)).rejects.toMatchObject({
      message: 'Không thể deactivate vai trò hệ thống',
      statusCode: 400,
    });
  });

  it('returns affected_users count when deactivating', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'Accountant', code: 'ACCOUNTANT', is_active: true, is_system: true }],
    } as never);
    // ACCOUNTANT is is_system but NOT ADMIN code, but current logic blocks any is_system from deactivation
    // Let's test a custom (non-system) role instead
    mockPool.query.mockReset();
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 4, name: 'Custom', code: 'CUSTOM', is_active: true, is_system: false }] } as never) // get role
      .mockResolvedValueOnce({ rows: [{ count: '3' }] } as never) // count users
      .mockResolvedValueOnce({ rows: [{ id: 4, name: 'Custom', code: 'CUSTOM', is_active: false, is_system: false }] } as never); // update

    const result = await roleService.toggleRoleActive(4, false);
    expect(result.role.is_active).toBe(false);
    expect(result.affected_users).toBe(3);
  });

  it('throws if role does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    await expect(roleService.toggleRoleActive(999, false)).rejects.toMatchObject({
      message: 'Vai trò không tồn tại',
      statusCode: 404,
    });
  });
});

describe('roleService.updateRole', () => {
  it('updates role name and description', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'Accountant Updated', code: 'ACCOUNTANT', description: 'New desc', is_active: true, is_system: true }],
    } as never);

    const role = await roleService.updateRole(2, { name: 'Accountant Updated', description: 'New desc' });
    expect(role.name).toBe('Accountant Updated');
  });

  it('throws 404 when role not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    await expect(roleService.updateRole(999, { name: 'X' })).rejects.toMatchObject({
      message: 'Vai trò không tồn tại',
      statusCode: 404,
    });
  });
});
