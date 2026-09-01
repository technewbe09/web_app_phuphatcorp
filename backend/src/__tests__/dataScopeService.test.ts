import { dataScopeService, DataScopeError } from '../services/dataScopeService';
import { UserRole } from '../types/user';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dataScopeService.resolveScope', () => {
  it('returns scope "all" immediately for ADMIN role', async () => {
    const scope = await dataScopeService.resolveScope(1, 1, UserRole.ADMIN, 'invoice_tracking');
    expect(scope).toEqual({ type: 'all', userId: 1 });
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('returns scope "all" if feature is not registered or inactive', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // feature not found

    const scope = await dataScopeService.resolveScope(2, 2, UserRole.ACCOUNTANT, 'unknown_feature');
    expect(scope).toEqual({ type: 'all', userId: 2 });
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('returns scope "entity" when user has explicit entity assignments', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ is_active: true }] } as never); // feature active
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { entity_type: 'driver', entity_id: 10 },
        { entity_type: 'driver', entity_id: 11 },
      ],
    } as never); // user entities

    const scope = await dataScopeService.resolveScope(5, 3, UserRole.VIEWER, 'invoice_tracking');
    expect(scope).toEqual({
      type: 'entity',
      userId: 5,
      entityType: 'driver',
      entityIds: [10, 11],
    });
  });

  it('returns scope from role config when no user entity assignment exists', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ is_active: true }] } as never); // feature active
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // no user entities
    mockPool.query.mockResolvedValueOnce({ rows: [{ scope_type: 'all' }] } as never); // role config = all

    const scope = await dataScopeService.resolveScope(2, 2, UserRole.ACCOUNTANT, 'invoice_tracking');
    expect(scope).toEqual({ type: 'all', userId: 2 });
  });

  it('returns scope "none" if role is entity-scoped but user has no entity assigned', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ is_active: true }] } as never); // feature active
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // no user entities
    mockPool.query.mockResolvedValueOnce({ rows: [{ scope_type: 'entity' }] } as never); // role config = entity

    const scope = await dataScopeService.resolveScope(6, 3, UserRole.VIEWER, 'invoice_tracking');
    expect(scope).toEqual({ type: 'none', userId: 6 });
  });
});

describe('dataScopeService.updateRoleScopeConfig', () => {
  it('throws error when updating ADMIN role to anything other than "all"', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ allowed_scope_types: ['all', 'entity', 'none'] }],
    } as never); // feature
    mockPool.query.mockResolvedValueOnce({ rows: [{ code: 'ADMIN', name: 'Admin' }] } as never); // role

    await expect(
      dataScopeService.updateRoleScopeConfig('invoice_tracking', 1, 'none'),
    ).rejects.toThrow(DataScopeError);
  });

  it('throws error if scopeType is not allowed for the feature', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ allowed_scope_types: ['all', 'entity'] }],
    } as never); // feature
    mockPool.query.mockResolvedValueOnce({ rows: [{ code: 'ACCOUNTANT', name: 'Accountant' }] } as never); // role

    await expect(
      dataScopeService.updateRoleScopeConfig('invoice_tracking', 2, 'none' as any),
    ).rejects.toThrow(DataScopeError);
  });

  it('updates role scope config successfully', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ allowed_scope_types: ['all', 'entity', 'none'] }],
    } as never); // feature
    mockPool.query.mockResolvedValueOnce({ rows: [{ code: 'VIEWER', name: 'Viewer' }] } as never); // role
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          feature_code: 'invoice_tracking',
          role_id: 3,
          scope_type: 'entity',
          role_name: 'Viewer',
          role_code: 'VIEWER',
        },
      ],
    } as never); // upsert result

    const result = await dataScopeService.updateRoleScopeConfig('invoice_tracking', 3, 'entity');
    expect(result.scope_type).toBe('entity');
  });
});
