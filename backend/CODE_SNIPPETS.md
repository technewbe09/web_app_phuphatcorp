# Backend Testing - Code Snippets Reference

## 1. Jest Configuration

📄 **File**: `jest.config.js`

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
    '^../../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
  },
};
```

**Key Points**:
- `preset: 'ts-jest'` - Handles TypeScript compilation
- `testEnvironment: 'node'` - Node.js environment
- `moduleNameMapper` - Redirects database imports to mock during tests
- Two mappings for `../config/database` and `../../config/database` (different nesting levels)

---

## 2. Mock Database

📄 **File**: `src/__tests__/__mocks__/database.ts`

```typescript
// Mock database pool for tests
export const pool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};
```

**How It Works**:
- Jest automatically replaces imports of `config/database.ts` with this mock
- All `pool.query()` calls return mocked results
- `pool.connect()` returns a mock client for transactions
- Prevents actual database connections during tests

---

## 3. Authentication Middleware

📄 **File**: `src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '../types/user';
import { pool } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: UserRole;
    roleId: number | null;
    permissions: string[];
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      roleId: payload.roleId ?? null,
      permissions: payload.permissions ?? [],
    };

    // Check role is still active — enforces deactivation within each 15-min token lifecycle
    if (payload.roleId) {
      pool
        .query<{ is_active: boolean }>(
          'SELECT r.is_active FROM roles r WHERE r.id = $1',
          [payload.roleId],
        )
        .then((result) => {
          if (!result.rows[0] || !result.rows[0].is_active) {
            res.status(403).json({
              success: false,
              message: 'Vai trò của bạn đã bị thu hồi. Vui lòng liên hệ admin.',
            });
            return;
          }
          next();
        })
        .catch(() => {
          // If DB check fails, allow through to avoid breaking the app
          next();
        });
    } else {
      next();
    }
  } catch {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requirePermission(permissionCode: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!req.user.permissions.includes(permissionCode)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
```

**Key Components**:
1. `authenticateToken` - Validates JWT and extracts user
2. `authorizeRoles` - Role-based access control
3. `requirePermission` - Fine-grained permission check
4. `AuthRequest` - Extends Express Request with user object

---

## 4. Route Protection Example

📄 **File**: `src/routes/roles.ts`

```typescript
import { Router } from 'express';
import { rolesController } from '../controllers/rolesController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createRoleSchema,
  updateRoleSchema,
  toggleRoleSchema,
  roleIdParamSchema,
} from '../middleware/validators/roleValidators';

const router = Router();

router.use(authenticateToken);

// GET /roles — list all roles (requires roles.view)
router.get('/', requirePermission('roles.view'), rolesController.getRoles);

// GET /roles/:id — get role with permissions
router.get('/:id', requirePermission('roles.view'), ...validate(roleIdParamSchema), rolesController.getRoleById);

// GET /roles/:id/users — get users assigned to role
router.get('/:id/users', requirePermission('roles.view'), ...validate(roleIdParamSchema), rolesController.getRoleUsers);

// POST /roles — create new role
router.post('/', requirePermission('roles.manage'), ...validate(createRoleSchema), rolesController.createRole);

// PUT /roles/:id — update role name/description
router.put('/:id', requirePermission('roles.manage'), ...validate(updateRoleSchema), rolesController.updateRole);

// PATCH /roles/:id/toggle — activate/deactivate role
router.patch('/:id/toggle', requirePermission('roles.manage'), ...validate(toggleRoleSchema), rolesController.toggleRole);

export default router;
```

**Protection Strategy**:
- Global `authenticateToken` via `router.use()`
- Per-route `requirePermission()` middleware
- Validation middleware for request body/params
- Permission codes: `module.action` format

---

## 5. Service Error Class

📄 **File**: `src/services/roleService.ts`

```typescript
export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
  }
}
```

**Usage Examples**:
```typescript
throw new ServiceError('Vai trò không tồn tại', 404);
throw new ServiceError('Không thể thay đổi quyền của vai trò ADMIN', 403, 'ADMIN_READONLY');
throw new ServiceError('Code already exists', 409, 'DUPLICATE_CODE');
```

---

## 6. Service Layer - Role Service

📄 **File**: `src/services/roleService.ts` (excerpt)

```typescript
import { pool } from '../config/database';

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
        COUNT(DISTINCT u.id)::int AS user_count,
        COUNT(DISTINCT rp.permission_id)::int AS permission_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.created_at ASC
    `);
    return result.rows;
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
      [data.name, code, data.description || null],
    );
    return result.rows[0];
  },
};
```

---

## 7. Permission Service

📄 **File**: `src/services/permissionService.ts`

```typescript
import { pool } from '../config/database';
import { Permission } from '../types/user';
import { ServiceError } from './roleService';

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
```

---

## 8. Basic Service Test

📄 **File**: `src/__tests__/permissionService.test.ts`

```typescript
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

    expect(mockPool.query).toHaveBeenCalledTimes(5);
  });
});
```

---

## 9. Transaction Test Example

📄 **File**: `src/__tests__/weightAdjustmentService.test.ts` (excerpt)

```typescript
import { weightAdjustmentService } from '../services/weightAdjustmentService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.connect.mockResolvedValue(mockClient as never);
});

describe('weightAdjustmentService.softUpdate', () => {
  it('deactivates old row and inserts new version', async () => {
    // Regular pool queries
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never);

    // Transaction via client
    mockClient.query
      .mockResolvedValueOnce({} as never) // BEGIN
      .mockResolvedValueOnce({} as never) // UPDATE deactivate
      .mockResolvedValueOnce({ rows: [{ ...mockRow, version: 2, action_type: 'update' }] } as never) // INSERT
      .mockResolvedValueOnce({} as never); // COMMIT

    const result = await weightAdjustmentService.softUpdate(
      1,
      { ma_hang: 'HH001', ten_hang: 'Gạo 30kg', gia_tri_dieu_chinh: 110 },
      1,
    );
    
    expect(result.version).toBe(2);
    expect(result.action_type).toBe('update');
  });
});
```

---

## 10. Error Testing Pattern

```typescript
describe('driverService.create', () => {
  it('throws DUPLICATE_TEN_KY_HIEU when ten_ky_hieu already exists', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as never);

    await expect(
      driverService.create({ ten_ky_hieu: 'TX01' })
    ).rejects.toMatchObject({
      code: 'DUPLICATE_TEN_KY_HIEU',
      ten_ky_hieu: 'TX01',
    });
  });

  it('throws NOT_FOUND when driver does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      driverService.update(999, { ten_ky_hieu: 'TX99' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
```

---

## 11. Database Configuration

📄 **File**: `src/config/database.ts`

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});
```

---

## 12. Package.json Test Script

📄 **File**: `package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate": "tsx src/migrate.ts",
    "test": "jest --passWithNoTests"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "jest": "^30.3.0",
    "ts-jest": "^29.4.9",
    "typescript": "^5.4.5"
  }
}
```

---

## 13. TypeScript Types

📄 **File**: `src/middleware/auth.ts` & `src/types/user.ts`

```typescript
// AuthRequest interface
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: UserRole;
    roleId: number | null;
    permissions: string[];  // e.g., ['roles.view', 'users.manage']
  };
}

// Inferred from services
interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
}

interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface RoleWithStats extends Role {
  user_count: number;
  permission_count: number;
}

interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

type UserRole = 'ADMIN' | 'USER' | 'GUEST';
```

---

## 14. Example: How to Import & Mock in Tests

```typescript
// ✅ This gets mocked automatically
import { pool } from '../config/database';

// Inside test file
import { pool } from './__mocks__/database';  // Explicit import of mock
const mockPool = pool as jest.Mocked<typeof pool>;

// Now pool is the mock object from __mocks__/database.ts
mockPool.query.mockResolvedValueOnce({ rows: [...] } as never);
```

The Jest config's `moduleNameMapper` handles the redirect automatically, so you can import from the original path and it becomes the mock.

