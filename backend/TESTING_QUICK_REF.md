# Backend Testing - Quick Reference

## 📁 File Locations

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest configuration with module mapping |
| `src/__tests__/` | Test files directory |
| `src/__tests__/__mocks__/database.ts` | Mock database pool |
| `src/middleware/auth.ts` | Auth middleware & permission checks |
| `src/services/roleService.ts` | Contains `ServiceError` class |

## 🧪 Test Files

```
src/__tests__/
├── permissionService.test.ts (2.9 KB) - 2 describe blocks
├── roleService.test.ts (4.4 KB) - 4 describe blocks  
├── driverService.test.ts (7.2 KB) - 6 describe blocks
├── dispatchScheduleService.test.ts (6.2 KB) - 3 describe blocks
├── weightAdjustmentService.test.ts (8.4 KB) - 5 describe blocks
└── __mocks__/
    └── database.ts (117 B) - Mocked pool object
```

## 🔧 Quick Test Template

```typescript
import { myService } from '../services/myService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('myService.method', () => {
  it('should do something', async () => {
    // Setup: Mock database responses
    mockPool.query.mockResolvedValueOnce({ rows: [...] } as never);
    
    // Execute
    const result = await myService.method();
    
    // Assert
    expect(result).toEqual(...);
    expect(mockPool.query).toHaveBeenCalledWith(...);
  });
});
```

## 🔐 Auth Testing

### Middleware Functions
```typescript
authenticateToken(req, res, next)  // Validates JWT
requirePermission(code)(req, res, next)  // Checks permission
authorizeRoles(...roles)(req, res, next)  // Checks role
```

### Permission Format
```
module.action (e.g., 'roles.view', 'roles.manage', 'users.create')
```

### Route Example
```typescript
router.get('/', 
  authenticateToken,
  requirePermission('roles.view'),
  controller.handler
);
```

## 🗄️ Database Mocking

### Single Query
```typescript
mockPool.query.mockResolvedValueOnce({ 
  rows: [{ id: 1, name: 'Test' }] 
} as never);
```

### Multiple Sequential Queries
```typescript
mockPool.query
  .mockResolvedValueOnce({ rows: [] } as never)           // Query 1
  .mockResolvedValueOnce({ rows: [{ id: 1 }] } as never)  // Query 2
  .mockResolvedValueOnce(undefined as never);              // Query 3
```

### Transaction (with Client)
```typescript
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

mockPool.connect.mockResolvedValue(mockClient as never);

mockClient.query
  .mockResolvedValueOnce({} as never)  // BEGIN
  .mockResolvedValueOnce({} as never)  // UPDATE
  .mockResolvedValueOnce({} as never)  // COMMIT
```

### Error Response
```typescript
mockPool.query.mockRejectedValueOnce(new Error('DB Error'));
```

## 📊 Service Error Class

### Definition
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

### Usage
```typescript
throw new ServiceError('Not found', 404, 'NOT_FOUND');
throw new ServiceError('Forbidden', 403, 'FORBIDDEN');
```

### Testing
```typescript
await expect(service.method()).rejects.toMatchObject({
  message: 'Not found',
  statusCode: 404,
  code: 'NOT_FOUND'
});
```

## ✅ Common Assertions

```typescript
// Value checks
expect(result).toEqual(expected)
expect(result).toMatchObject({ key: value })
expect(result).toHaveLength(5)
expect(result).toBeNull()
expect(result).toBeDefined()

// Mock checks
expect(mockPool.query).toHaveBeenCalled()
expect(mockPool.query).toHaveBeenCalledTimes(3)
expect(mockPool.query).toHaveBeenCalledWith(sql, params)

// Error checks
await expect(promise).rejects.toMatchObject({ message: '...' })
```

## 🚀 Run Tests

```bash
npm test                              # All tests
npm test -- --watch                  # Watch mode
npm test -- roleService              # Specific test file
npm test -- --coverage               # With coverage report
npm test -- --testNamePattern="pattern"  # Match test name
```

## 🔍 Auth Middleware Checks

**JWT Token Validation**:
- Extracts from `Authorization: Bearer <token>` header
- Verifies signature using `JWT_SECRET`
- Attaches user object to request

**Permission Check**:
- Array `req.user.permissions` contains permission codes
- Middleware validates code exists in array
- Returns 403 if missing

**Role Active Check**:
- Queries database for role active status
- Called asynchronously (fire-and-forget)
- Allows through if DB fails (fail-open)

## 📝 Auth Request Interface

```typescript
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: UserRole;
    roleId: number | null;
    permissions: string[];  // e.g., ['roles.view', 'users.manage']
  };
}
```

## ⚙️ Setup in jest.config.js

```javascript
moduleNameMapper: {
  '^../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
  '^../../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
}
```

**Why?** Automatically redirects all imports of `config/database.ts` to the mock file during tests.

## 🎯 Key Patterns

| Pattern | Usage | File |
|---------|-------|------|
| Mock pool.query | Single DB query | All `.test.ts` |
| mockResolvedValueOnce | Queue sequential responses | All `.test.ts` |
| jest.clearAllMocks() | Reset state between tests | beforeEach |
| mockClient for transactions | Multi-step DB operations | weightAdjustmentService.test.ts |
| ServiceError class | Domain-specific errors | roleService.ts |
| as never casting | Bypass TS strict mode | All `.test.ts` |
| requirePermission() | Middleware for routes | All route files |

## 🚫 What's NOT Tested Yet

- Route/Controller layer (no supertest)
- HTTP endpoints with auth headers
- Permission checks at route level
- Real database integration
- Error middleware behavior
- File uploads

## ✨ To Test Auth-Protected Routes

1. Install: `npm install --save-dev supertest @types/supertest`
2. Create helper: `src/__tests__/__helpers__/auth.ts` (token generator)
3. Create route tests: `src/__tests__/roles.route.test.ts`
4. Use: `request(app).get('/path').set('Authorization', \`Bearer ${token}\`)`

---

**Summary**: Tests mock the database at import time using Jest's module mapping.
Services are unit tested with sequential mock responses. Auth is middleware-based
with JWT validation + permission array checks. No HTTP-level tests yet.
