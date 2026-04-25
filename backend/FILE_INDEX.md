# Backend Testing - File Index & Summary

## 📋 Quick Reference by Task

### "I need to write a test"
→ See: `TESTING_QUICK_REF.md` (template, patterns, assertions)

### "I want to understand the auth flow"
→ See: `CODE_SNIPPETS.md` section 3-4 (auth middleware + route protection)

### "I need to mock database responses"
→ See: `CODE_SNIPPETS.md` sections 2, 8-9 (mock patterns + examples)

### "I need transaction test examples"
→ See: `CODE_SNIPPETS.md` section 9 (weightAdjustmentService test)

### "Complete guide for all patterns"
→ See: `TESTING_GUIDE.md` (14 sections, comprehensive coverage)

---

## 📁 Project File Locations

### Configuration
- **`jest.config.js`** - Jest configuration with module mapping
  - Redirects database imports to mock
  - Defines test match pattern
  
- **`package.json`** - NPM scripts and dependencies
  - `npm test` - Run all tests
  - `npm test -- --watch` - Watch mode

### Source Code (src/)

#### Authentication & Middleware
- **`src/middleware/auth.ts`** - Auth middleware
  - `authenticateToken()` - JWT validation
  - `requirePermission()` - Permission checks
  - `authorizeRoles()` - Role-based access
  - `AuthRequest` interface

#### Services (Business Logic)
- **`src/services/roleService.ts`** - Role management
  - `getRoles()`, `createRole()`, `updateRole()`
  - Custom `ServiceError` class
  - Code generation logic

- **`src/services/permissionService.ts`** - Permission management
  - `getAllPermissions()`, `updateRolePermissions()`
  - Transaction handling (BEGIN/COMMIT)

- **`src/services/driverService.ts`** - Driver management
  - CRUD operations with validations
  - Document uploads/deletes

- **`src/services/dispatchScheduleService.ts`** - Schedule management
  - Date-based queries
  - Categorization logic

- **`src/services/weightAdjustmentService.ts`** - Weight adjustments
  - Versioned records
  - Transaction-based updates

#### Routes (HTTP Endpoints)
- **`src/routes/roles.ts`** - Role endpoints
  - Example of `authenticateToken` + `requirePermission`
  - GET, POST, PUT, PATCH patterns
  - Uses validators

- **`src/routes/users.ts`** - User endpoints
- **`src/routes/drivers.ts`** - Driver endpoints
- **`src/routes/permissions.ts`** - Permission endpoints
- **`src/routes/dispatchSchedules.ts`** - Schedule endpoints
- **`src/routes/weightAdjustments.ts`** - Adjustment endpoints

#### Controllers
- **`src/controllers/rolesController.ts`** - Role handlers
  - Service layer integration
  - Error handling with `ServiceError`

#### Database
- **`src/config/database.ts`** - PostgreSQL pool
  - Pool configuration
  - Timezone setup
  - Error handling

#### Types
- **`src/types/user.ts`** - User-related types
  - `UserRole`, `Permission`, `Role` interfaces
  - `RoleWithStats`, `RoleWithPermissions`

### Test Files (src/__tests__/)

#### Test Files
- **`src/__tests__/permissionService.test.ts`** (80 lines)
  - Tests: getAllPermissions, updateRolePermissions
  - Pattern: Basic service tests with multi-step queries
  - Key: Transaction mocking (BEGIN/DELETE/INSERT/COMMIT)

- **`src/__tests__/roleService.test.ts`** (104 lines)
  - Tests: getRoles, createRole, toggleRoleActive, updateRole
  - Pattern: Code collision detection
  - Key: Suffix generation logic

- **`src/__tests__/driverService.test.ts`** (161 lines)
  - Tests: list, create, update, softDelete, uploadDocument, deleteDocument
  - Pattern: Custom error codes (DUPLICATE_TEN_KY_HIEU, NOT_FOUND)
  - Key: File size validation, soft deletes

- **`src/__tests__/dispatchScheduleService.test.ts`** (150+ lines)
  - Tests: listByDate, create
  - Pattern: Data categorization (xe_nho, xe_lon, tuyen_ngoai)
  - Key: Optional fields handling

- **`src/__tests__/weightAdjustmentService.test.ts`** (200+ lines)
  - Tests: list, create, softUpdate
  - Pattern: Versioned records with transactions
  - Key: Client-based transaction mocking

#### Mocks
- **`src/__tests__/__mocks__/database.ts`** (7 lines)
  - Mock pool object with query, connect, end
  - Jest config redirects imports to this file

---

## 🔍 Key File Contents by Section

### 1. Configuration
```
jest.config.js → module mapping setup
package.json → test script, dependencies
```

### 2. Authentication/Authorization
```
src/middleware/auth.ts → authenticateToken, requirePermission
src/routes/roles.ts → route protection example
```

### 3. Database
```
src/config/database.ts → pool setup
src/__tests__/__mocks__/database.ts → mock pool
```

### 4. Services (Business Logic)
```
src/services/roleService.ts → ServiceError class definition
src/services/permissionService.ts → transaction pattern
src/services/driverService.ts → custom error codes
src/services/weightAdjustmentService.ts → versioned records
```

### 5. Tests
```
src/__tests__/permissionService.test.ts → basic + transactions
src/__tests__/roleService.test.ts → code generation
src/__tests__/driverService.test.ts → custom errors
src/__tests__/dispatchScheduleService.test.ts → categorization
src/__tests__/weightAdjustmentService.test.ts → versioned + transactions
```

### 6. Types
```
src/middleware/auth.ts → AuthRequest interface
src/types/user.ts → Permission, Role, UserRole
```

---

## 📊 Test Coverage Matrix

| Service | Test File | Tests | Patterns |
|---------|-----------|-------|----------|
| permissionService | permissionService.test.ts | 5 | Basic, Transactions |
| roleService | roleService.test.ts | 4 | Code generation, errors |
| driverService | driverService.test.ts | 6 | CRUD, custom errors |
| dispatchScheduleService | dispatchScheduleService.test.ts | 3 | Categorization |
| weightAdjustmentService | weightAdjustmentService.test.ts | 5 | Versioning, transactions |
| **Routes** | ❌ None | - | NOT TESTED |
| **HTTP Auth** | ❌ None | - | NOT TESTED |

---

## 🎯 How to Use These Files

### Writing a Service Test
1. Open `TESTING_QUICK_REF.md` → Template section
2. Look at similar service test in `src/__tests__/`
3. Copy pattern, replace with your service name
4. Reference `CODE_SNIPPETS.md` for mock patterns

### Understanding Auth
1. Read `CODE_SNIPPETS.md` sections 3-4
2. Look at `src/middleware/auth.ts` directly
3. Check `src/routes/roles.ts` for usage
4. See `TESTING_GUIDE.md` section 5 for testing strategy

### Setting Up Transactions Test
1. See `CODE_SNIPPETS.md` section 9
2. Look at `src/__tests__/weightAdjustmentService.test.ts`
3. Create mockClient, use `mockPool.connect()`
4. Queue client.query calls for BEGIN/UPDATE/COMMIT

### Adding HTTP-Level Tests
1. Read `TESTING_GUIDE.md` section 13
2. Install supertest (not yet in project)
3. Create helpers for JWT token generation
4. Write route tests using `request(app)`

---

## 📄 Document Files

### Main Documents (in backend directory)
1. **`TESTING_GUIDE.md`** (14 KB)
   - Comprehensive 14-section guide
   - All patterns, examples, explanations
   - Best practices and summary

2. **`TESTING_QUICK_REF.md`** (8 KB)
   - Quick reference tables
   - Common patterns with snippets
   - Command reference
   - Best for quick lookups

3. **`CODE_SNIPPETS.md`** (15 KB)
   - Actual code from project
   - Sections 1-14 with real file paths
   - Mock patterns, assertions, errors

4. **`FILE_INDEX.md`** (this file)
   - File locations and purposes
   - Navigation guide
   - Coverage matrix

---

## 🚀 Quick Start

### For New Tests
```bash
# 1. Read the template in TESTING_QUICK_REF.md
# 2. Look at similar test file
# 3. Write test following the pattern
# 4. Run: npm test -- [testName]
```

### For Auth-Protected Routes
```bash
# 1. Read TESTING_GUIDE.md section 13
# 2. Install supertest: npm install --save-dev supertest
# 3. Create src/__tests__/__helpers__/auth.ts
# 4. Write route test in src/__tests__/[feature].route.test.ts
# 5. Run: npm test -- [featureName]
```

### For Database Mocking
```bash
# 1. See TESTING_QUICK_REF.md "Database Mocking" section
# 2. Look at CODE_SNIPPETS.md sections 8-9
# 3. Use mockResolvedValueOnce() for sequential queries
# 4. Use mockClient for transactions
```

---

## 💡 Key Insights

### Architecture
- **Unit tests only** at service layer
- **No HTTP-level tests** (no supertest)
- **Mocked database** at import time via Jest
- **Auth middleware** tested manually, not in tests

### Testing Strategy
- Mock database with `jest.fn()`
- Queue responses with `mockResolvedValueOnce()`
- Test error paths with `.rejects.toMatchObject()`
- Clear mocks between tests with `beforeEach()`

### Permission System
- JWT tokens contain permissions array
- `requirePermission(code)` middleware checks membership
- Permission codes: `module.action` (e.g., `roles.view`)
- No database checks during permission validation (only in auth)

### Database Transactions
- Use `pool.connect()` to get client
- Client has separate `query()` method
- Queue: BEGIN → operation → COMMIT or ROLLBACK
- Separate mock for client in tests

---

## 🔗 Cross-References

### If you need to...

| Task | See | Then | Then |
|------|-----|------|------|
| Write a test | QUICK_REF template | CODE_SNIPPETS 8 | driverService.test.ts |
| Mock a query | QUICK_REF DB Mocking | CODE_SNIPPETS 8 | permissionService.test.ts |
| Mock transactions | QUICK_REF DB Mocking | CODE_SNIPPETS 9 | weightAdjustmentService.test.ts |
| Test errors | QUICK_REF assertions | CODE_SNIPPETS 10 | driverService.test.ts |
| Test auth routes | TESTING_GUIDE 13 | CODE_SNIPPETS 3-4 | roles.ts |
| Understand auth flow | CODE_SNIPPETS 3 | TESTING_GUIDE 5 | auth.ts |
| Add a service | TESTING_GUIDE 6 | QUICK_REF template | roleService.ts |

---

## ✅ Checklist

### To understand the test setup:
- [ ] Read `TESTING_GUIDE.md` sections 1-3
- [ ] Look at `jest.config.js`
- [ ] See `src/__tests__/__mocks__/database.ts`

### To write a service test:
- [ ] Read `TESTING_QUICK_REF.md` template
- [ ] Copy structure from similar test
- [ ] Use mock patterns from `CODE_SNIPPETS.md`
- [ ] Run `npm test`

### To test auth-protected routes:
- [ ] Install supertest
- [ ] Create token helper
- [ ] Write route tests
- [ ] Mock database responses

### To add transaction tests:
- [ ] See `CODE_SNIPPETS.md` section 9
- [ ] Use mockClient pattern
- [ ] Queue BEGIN/UPDATE/COMMIT
- [ ] Verify call sequence

---

**Last Updated**: 2026-04-20
**Backend Version**: TypeScript + Express
**Test Framework**: Jest + ts-jest
**Database**: PostgreSQL (mocked in tests)
