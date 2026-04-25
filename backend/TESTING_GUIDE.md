# Backend Tests Structure & Patterns Analysis

## Project Overview
- **Framework**: Express.js with TypeScript
- **Testing Framework**: Jest + ts-jest
- **Database**: PostgreSQL (via pg package)
- **Authentication**: JWT tokens
- **Authorization**: Role-based (roles + permissions)

---

## 1. Jest Configuration

**File**: `jest.config.js`
```javascript
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

**Key Features**:
- Uses ts-jest preset for TypeScript support
- Node.js environment
- Module name mapping redirects real database imports to mock
- Test file pattern: `**/__tests__/**/*.test.ts`

---

## 2. Test Directory Structure

```
src/
├── __tests__/
│   ├── __mocks__/
│   │   └── database.ts (centralized mock DB)
│   ├── driverService.test.ts
│   ├── dispatchScheduleService.test.ts
│   ├── permissionService.test.ts
│   ├── roleService.test.ts
│   └── weightAdjustmentService.test.ts
├── services/
├── middleware/
├── routes/
├── controllers/
└── ...
```

**Location**: Tests live in `src/__tests__/` alongside source code (collocated pattern)
**Naming**: `.test.ts` suffix
**Organization**: Tests are organized by service layer

---

## 3. Database Mocking Strategy

### Mock File: `src/__tests__/__mocks__/database.ts`
```typescript
// Mock database pool for tests
export const pool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};
```

**Approach**:
- Centralized mock that jest.config.js redirects to
- Mocks the entire pool object
- Uses `jest.fn()` for all methods
- No actual database connection

**Jest Config Mapping**:
```javascript
moduleNameMapper: {
  '^../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
  '^../../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
}
```

This automatically replaces `import { pool } from '../config/database'` with the mock.

---

## 4. Common Test Patterns

### 4.1 Basic Service Test Setup

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
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockPermissions } as never);

    const result = await permissionService.getAllPermissions();

    expect(result.permissions).toHaveLength(1);
  });
});
```

**Pattern Elements**:
- Import service and mock pool
- Cast pool as `jest.Mocked<typeof pool>`
- `beforeEach(() => jest.clearAllMocks())` - reset mocks between tests
- `mockResolvedValueOnce()` - queue sequential responses
- `as never` - bypass TypeScript strict mode for mocked data

### 4.2 Transaction Handling

```typescript
describe('weightAdjustmentService.softUpdate', () => {
  it('deactivates old row and inserts new version', async () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(mockClient as never);

    // transaction: BEGIN, UPDATE, INSERT, COMMIT
    mockClient.query
      .mockResolvedValueOnce({} as never) // BEGIN
      .mockResolvedValueOnce({} as never) // UPDATE deactivate
      .mockResolvedValueOnce({ rows: [{ ...mockRow, version: 2 }] } as never) // INSERT
      .mockResolvedValueOnce({} as never); // COMMIT

    const result = await weightAdjustmentService.softUpdate(
      1,
      { ma_hang: 'HH001', ten_hang: 'Gạo 30kg' },
      1,
    );
    expect(result.version).toBe(2);
  });
});
```

**Key Features**:
- Separate mock client for transaction operations
- `mockPool.connect()` returns client
- Queue commands: BEGIN → UPDATE → INSERT → COMMIT
- Verify correct sequencing

### 4.3 Error Testing

```typescript
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
```

**Error Patterns**:
- Use `.rejects.toMatchObject()` for promise rejections
- Match on multiple properties (message, statusCode, code)
- Custom `ServiceError` class with statusCode property

---

## 5. Authentication/Authorization Testing

### 5.1 Auth Middleware

**File**: `src/middleware/auth.ts`

```typescript
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
    // ... role active check ...
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
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
- `authenticateToken` - validates JWT and extracts user info
- `requirePermission(code)` - higher-order function for permission checks
- `authorizeRoles(...roles)` - role-based access control
- User object attached to request

### 5.2 Route Protection Pattern

**File**: `src/routes/roles.ts`

```typescript
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();
router.use(authenticateToken); // All routes require auth

// GET /roles — list all roles (requires roles.view permission)
router.get('/', requirePermission('roles.view'), rolesController.getRoles);

// POST /roles — create new role (requires roles.manage permission)
router.post('/', requirePermission('roles.manage'), rolesController.createRole);

// PATCH /roles/:id/toggle — requires roles.manage permission
router.patch('/:id/toggle', requirePermission('roles.manage'), rolesController.toggleRole);
```

**Authorization Patterns**:
- Global `authenticateToken` middleware
- Per-route `requirePermission()` middleware
- Hierarchical: `roles.view` (read) and `roles.manage` (write)
- Permission codes: `module.action` format

### 5.3 How to Test Auth-Protected Routes

**Note**: Current tests mock at the service layer, not route layer. 

To test auth-protected routes, you would need:
1. Supertest for HTTP testing
2. Mock JWT tokens
3. Test with and without tokens
4. Test with different permission levels

**Example Pattern (not currently in codebase)**:
```typescript
import request from 'supertest';
import { app } from '../app';

describe('GET /roles', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/roles');
    expect(res.status).toBe(401);
  });

  it('returns 403 without roles.view permission', async () => {
    const token = generateTestToken({ permissions: [] });
    const res = await request(app)
      .get('/roles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with roles.view permission', async () => {
    const token = generateTestToken({ permissions: ['roles.view'] });
    const res = await request(app)
      .get('/roles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

---

## 6. Service Layer Test Examples

### 6.1 Permission Service Tests

**File**: `src/__tests__/permissionService.test.ts`

```typescript
describe('permissionService.updateRolePermissions', () => {
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
```

### 6.2 Role Service Tests

**File**: `src/__tests__/roleService.test.ts`

```typescript
describe('roleService.createRole', () => {
  it('generates code from name and creates role', async () => {
    // No collision
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // code collision check
    mockPool.query.mockResolvedValueOnce({ 
      rows: [{ id: 4, name: 'Kế Toán', code: 'K_TON', is_active: true, is_system: false }] 
    } as never);

    const role = await roleService.createRole({ name: 'Kế Toán' });
    expect(role).toMatchObject({ name: 'Kế Toán', is_system: false });
  });

  it('appends suffix when code already exists', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ code: 'MY_ROLE' }] } as never);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 5, name: 'My Role', code: 'MY_ROLE_2', is_system: false }],
    } as never);

    const role = await roleService.createRole({ name: 'My Role' });
    expect(role.code).toBe('MY_ROLE_2');
  });
});
```

### 6.3 Driver Service Tests

**File**: `src/__tests__/driverService.test.ts`

```typescript
describe('driverService.create', () => {
  it('creates driver successfully when ten_ky_hieu is unique', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // findByTenKyHieu
    const newDriver = { id: 1, ten_ky_hieu: 'TX01', status: 'active', ... };
    mockPool.query.mockResolvedValueOnce({ rows: [newDriver] } as never); // INSERT

    const result = await driverService.create({ ten_ky_hieu: 'TX01' });
    expect(result).toEqual(newDriver);
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('throws DUPLICATE_TEN_KY_HIEU when ten_ky_hieu already exists', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as never);

    await expect(
      driverService.create({ ten_ky_hieu: 'TX01' })
    ).rejects.toMatchObject({
      code: 'DUPLICATE_TEN_KY_HIEU',
      ten_ky_hieu: 'TX01',
    });
  });
});
```

**Custom Error Pattern**:
- Services throw custom error objects with `code` property
- Tests match on multiple properties
- Error objects are domain-specific

### 6.4 Weight Adjustment Service Tests

**File**: `src/__tests__/weightAdjustmentService.test.ts`

```typescript
describe('weightAdjustmentService.list', () => {
  it('returns active records ordered by ma_hang', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);
    const result = await weightAdjustmentService.list();
    expect(result).toEqual([mockRow]);
  });
});

describe('weightAdjustmentService.create', () => {
  it('creates with null gia_tri_cu when not provided', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // findActiveByMaHang
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never); // getUserName
    const rowNoGiaTriCu = { ...mockRow, gia_tri_cu: null };
    mockPool.query.mockResolvedValueOnce({ rows: [rowNoGiaTriCu] } as never); // INSERT

    const result = await weightAdjustmentService.create(
      { ma_hang: 'HH001', ten_hang: 'Gạo 25kg', gia_tri_dieu_chinh: 102.5 },
      1,
    );
    expect(result.gia_tri_cu).toBeNull();
  });
});
```

---

## 7. Service Error Class

**File**: `src/services/roleService.ts`

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

**Usage Pattern**:
```typescript
if (!roleResult.rows[0]) throw new ServiceError('Vai trò không tồn tại', 404);
if (roleResult.rows[0].code === 'ADMIN') {
  throw new ServiceError('Không thể thay đổi quyền của vai trò ADMIN', 403, 'ADMIN_READONLY');
}
```

**Testing**:
```typescript
await expect(
  permissionService.updateRolePermissions(1, [1, 2, 3]),
).rejects.toMatchObject({
  message: 'Không thể thay đổi quyền của vai trò ADMIN',
  statusCode: 403,
});
```

---

## 8. NPM Scripts

**File**: `package.json`
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate": "tsx src/migrate.ts",
    "test": "jest --passWithNoTests"
  }
}
```

**Run Tests**:
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- permissionService  # Run specific test
```

---

## 9. Key TypeScript Interfaces

**File**: `src/middleware/auth.ts`
```typescript
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: UserRole;
    roleId: number | null;
    permissions: string[];
  };
}
```

**File**: `src/types/user.ts` (inferred from tests)
- `UserRole` - enum or union of role names
- `Permission` - interface with `id`, `code`, `name`, `module`
- `Role` - interface with id, name, code, description, is_active, is_system
- `RoleWithStats` - Role + user_count, permission_count
- `RoleWithPermissions` - Role + permissions array

---

## 10. Database Pool Configuration

**File**: `src/config/database.ts`
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

**Testing**: This is mocked in tests via moduleNameMapper

---

## 11. Current Test Coverage

### Tested Services:
1. ✅ `permissionService` - permission queries, role permission updates
2. ✅ `roleService` - CRUD, code generation, activation/deactivation
3. ✅ `driverService` - CRUD, document uploads, soft deletes
4. ✅ `dispatchScheduleService` - list by date, create, categorization
5. ✅ `weightAdjustmentService` - versioned CRUD with transactions

### NOT Currently Tested:
- Route/controller layer (no supertest tests)
- HTTP requests with auth headers
- Permission checks at route level
- Integration tests with real database
- Error handling middleware

---

## 12. Best Practices Observed

1. **Centralized Mocking**: Single `__mocks__/database.ts` file
2. **Module Name Mapping**: Jest config redirects real imports automatically
3. **Service Layer Tests**: Focus on business logic, not HTTP
4. **Sequential Mocking**: `mockResolvedValueOnce()` for multi-step operations
5. **Error Matching**: `toMatchObject()` for flexible error assertions
6. **Transaction Safety**: Separate mock client for transaction tests
7. **beforeEach Cleanup**: `jest.clearAllMocks()` prevents test pollution
8. **Custom Error Classes**: `ServiceError` with status codes for routing
9. **TypeScript Casting**: `as never` and `as jest.Mocked<typeof pool>`
10. **Descriptive Test Names**: Clearly describe what is tested and why

---

## 13. How to Add Tests for Auth-Protected Routes

To extend testing to route layer with auth:

### Step 1: Install Supertest
```bash
npm install --save-dev supertest @types/supertest
```

### Step 2: Create Test Helpers
```typescript
// src/__tests__/__helpers__/auth.ts
import jwt from 'jsonwebtoken';

export function generateTestToken(payload: any) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
}

export function tokenWithPermissions(permissions: string[]) {
  return generateTestToken({
    userId: 1,
    email: 'test@example.com',
    role: 'USER',
    roleId: 1,
    permissions,
  });
}
```

### Step 3: Create Route Tests
```typescript
// src/__tests__/roles.route.test.ts
import request from 'supertest';
import { app } from '../app';
import { tokenWithPermissions } from './__helpers__/auth';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

describe('GET /roles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without authorization header', async () => {
    const res = await request(app).get('/roles');
    expect(res.status).toBe(401);
  });

  it('returns 403 without roles.view permission', async () => {
    const token = tokenWithPermissions(['users.manage']);
    const res = await request(app)
      .get('/roles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with valid token and permission', async () => {
    const token = tokenWithPermissions(['roles.view']);
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Admin' }] } as never);

    const res = await request(app)
      .get('/roles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## 14. Summary

The backend has a **unit test layer** focused on **services** using:
- **Jest** with ts-jest for TypeScript support
- **Centralized mocking** via module name mapping
- **Sequential mock queuing** for multi-step operations
- **Custom error classes** for domain-specific exceptions
- **Service layer testing** (no route/HTTP tests yet)

Authentication/Authorization is implemented via:
- **JWT tokens** in Authorization headers
- **Middleware-based checks** at route level
- **Role-based access** + **fine-grained permissions**
- **`AuthRequest` interface** extending Express Request

To expand test coverage to protected routes, you need:
- **Supertest** for HTTP testing
- **Test token generators** in helpers
- **Route-level tests** that mock the pool and control responses

---

