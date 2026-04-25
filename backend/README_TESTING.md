# Backend Testing Documentation

## 📚 Documentation Files

This directory contains **4 comprehensive guides** for the backend testing setup and patterns:

### 1. **TESTING_GUIDE.md** (19 KB) - Start Here if You Want Complete Details
- **14 comprehensive sections** covering every aspect
- Jest configuration explained
- Test directory structure
- Database mocking strategy
- Auth/permission testing patterns
- All service layer tests with examples
- Best practices and summary
- **Best for**: Understanding the complete testing architecture

### 2. **TESTING_QUICK_REF.md** (6.3 KB) - Fastest Reference
- Quick reference tables
- Template for new tests
- Common patterns at a glance
- Database mocking patterns
- Auth testing examples
- Service error class reference
- Command shortcuts
- **Best for**: Quick lookups while coding

### 3. **CODE_SNIPPETS.md** (16 KB) - Real Code Examples
- All snippets from the actual project
- 14 sections with real file paths
- Jest config with explanations
- Auth middleware (full code)
- Route protection examples
- Service layer implementations
- Test examples with real patterns
- Database configuration
- **Best for**: Copy-paste reference and understanding patterns

### 4. **FILE_INDEX.md** (10 KB) - Navigation Guide
- All project file locations
- File purposes and descriptions
- Test coverage matrix
- How to use the documentation
- Cross-references between tasks
- Checklists for common workflows
- Key insights summary
- **Best for**: Finding what you need quickly

### 5. **VISUAL_SUMMARY.txt** (32 KB) - Architecture Overview
- ASCII art diagrams of the system
- Component relationships
- Data flow illustrations
- Permission structure
- Error handling flow
- Database layer mapping
- **Best for**: Visual learners and understanding architecture

---

## 🚀 Quick Start by Task

### "I need to write a test"
```
1. Read: TESTING_QUICK_REF.md → "Quick Test Template"
2. Find similar test in: src/__tests__/
3. Look up patterns in: CODE_SNIPPETS.md sections 8-10
4. Run: npm test
```

### "I need to understand authentication"
```
1. Read: TESTING_QUICK_REF.md → "Auth Testing" section
2. Look at code: CODE_SNIPPETS.md sections 3-4
3. View architecture: VISUAL_SUMMARY.txt → "REQUEST WITH AUTH"
4. Study examples: src/middleware/auth.ts + src/routes/roles.ts
```

### "I need to mock database responses"
```
1. Read: TESTING_QUICK_REF.md → "Database Mocking"
2. See patterns: CODE_SNIPPETS.md sections 2, 8-9
3. Study examples: src/__tests__/driverService.test.ts
4. For transactions: CODE_SNIPPETS.md section 9
```

### "I need the complete guide"
```
1. Start with: TESTING_GUIDE.md (read sections 1-6 first)
2. Jump to: specific sections as needed
3. Reference: CODE_SNIPPETS.md for actual code
4. Use FILE_INDEX.md for navigation
```

---

## 📁 Key File Locations

### Configuration
- `jest.config.js` - Jest setup with module mapping
- `package.json` - NPM scripts and dependencies

### Core Testing
- `src/__tests__/__mocks__/database.ts` - Mock pool
- `src/__tests__/*.test.ts` - 5 test files (service layer)

### Authentication
- `src/middleware/auth.ts` - Auth middleware functions
- `src/routes/roles.ts` - Example route protection

### Services
- `src/services/roleService.ts` - Roles + ServiceError class
- `src/services/permissionService.ts` - Permissions
- `src/services/driverService.ts` - Drivers
- `src/services/dispatchScheduleService.ts` - Schedules
- `src/services/weightAdjustmentService.ts` - Adjustments

---

## 🔍 Documentation Quick Reference

| Question | Answer | File | Section |
|----------|--------|------|---------|
| What's the test structure? | Jest + ts-jest mocking DB | TESTING_GUIDE | 1-3 |
| How do I write a test? | Use template + patterns | QUICK_REF | Template |
| How does auth work? | JWT + middleware checks | CODE_SNIPPETS | 3-4 |
| How do I mock DB? | mockResolvedValueOnce() | QUICK_REF | DB Mocking |
| What's ServiceError? | Error class with statusCode | CODE_SNIPPETS | 5 |
| Where are test files? | src/__tests__/ | FILE_INDEX | Locations |
| What's not tested? | Routes, HTTP, integration | FILE_INDEX | Coverage |
| How to add route tests? | Use supertest + helpers | TESTING_GUIDE | 13 |
| Permission format? | module.action (e.g., roles.view) | QUICK_REF | Auth Testing |
| How are mocks injected? | Jest moduleNameMapper | VISUAL_SUMMARY | DB Layer |

---

## 📊 Test Coverage

### ✅ Currently Tested (Service Layer)
- permissionService - permissions and role assignments
- roleService - CRUD, code generation, deactivation
- driverService - CRUD, validations, file uploads
- dispatchScheduleService - querying and categorization
- weightAdjustmentService - versioning and transactions

### ❌ Not Currently Tested
- Route/Controller layer
- HTTP endpoints with auth headers
- Permission enforcement at route level
- Integration tests with real DB
- Error middleware behavior
- File upload handlers

---

## 🎯 Common Patterns

### Service Test Template
```typescript
import { myService } from '../services/myService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => jest.clearAllMocks());

describe('myService.method', () => {
  it('should handle case', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [...] } as never);
    const result = await myService.method();
    expect(result).toEqual(...);
  });
});
```

### Mock Sequential Queries
```typescript
mockPool.query
  .mockResolvedValueOnce({ rows: [{ id: 1 }] } as never)     // Query 1
  .mockResolvedValueOnce({ rows: [{ name: 'X' }] } as never) // Query 2
  .mockResolvedValueOnce(undefined as never);                 // Query 3
```

### Mock Transactions
```typescript
const mockClient = { query: jest.fn(), release: jest.fn() };
mockPool.connect.mockResolvedValue(mockClient as never);

mockClient.query
  .mockResolvedValueOnce({} as never)  // BEGIN
  .mockResolvedValueOnce({} as never)  // UPDATE
  .mockResolvedValueOnce({} as never); // COMMIT
```

### Test Error
```typescript
await expect(service.method()).rejects.toMatchObject({
  message: 'Error message',
  statusCode: 404,
  code: 'ERROR_CODE'
});
```

---

## 🔐 Authentication Quick Facts

- **JWT tokens** contain: userId, email, role, roleId, permissions[]
- **Extracted from**: `Authorization: Bearer <token>` header
- **Permission codes**: `module.action` format (e.g., `roles.view`)
- **Middleware**: `authenticateToken` → `requirePermission(code)`
- **DB check**: Role active status (async, fire-and-forget)
- **Not tested**: Route-level auth (no supertest yet)

---

## 📋 Document Navigation

```
README_TESTING.md (this file)
├── Start here for overview
├── Quick start by task
├── Key file locations
└── Common patterns

TESTING_GUIDE.md
├── Complete reference (read this first)
├── 14 sections with examples
├── Best practices
└── How to extend testing

TESTING_QUICK_REF.md
├── Fast lookup tables
├── Test template
├── Commands and patterns
└── Best for quick coding

CODE_SNIPPETS.md
├── Real code from project
├── 14 sections with paths
├── Auth middleware (full)
├── Service examples

FILE_INDEX.md
├── All file locations
├── Coverage matrix
├── Navigation guide
└── Cross-references

VISUAL_SUMMARY.txt
├── ASCII art diagrams
├── Architecture overview
├── Data flows
└── Component relationships
```

---

## ⚡ Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- driverService

# Run with coverage
npm test -- --coverage

# Match test by name
npm test -- --testNamePattern="pattern"
```

---

## 🛠️ Setting Up New Tests for Auth-Protected Routes

1. **Install supertest** (not yet in project):
   ```bash
   npm install --save-dev supertest @types/supertest
   ```

2. **Create token helper** at `src/__tests__/__helpers__/auth.ts`

3. **Create route test** at `src/__tests__/[feature].route.test.ts`

4. **Example**:
   ```typescript
   import request from 'supertest';
   import { app } from '../app';
   import { tokenWithPermissions } from './__helpers__/auth';

   describe('GET /roles', () => {
     it('returns 401 without token', async () => {
       const res = await request(app).get('/roles');
       expect(res.status).toBe(401);
     });

     it('returns 200 with permission', async () => {
       const token = tokenWithPermissions(['roles.view']);
       const res = await request(app)
         .get('/roles')
         .set('Authorization', `Bearer ${token}`);
       expect(res.status).toBe(200);
     });
   });
   ```

---

## 💡 Key Insights

### Why Mock the Database?
- Prevents actual database calls during tests
- Tests run fast (no DB latency)
- Tests are isolated (no side effects)
- Can test error cases easily

### Why Module Mapping?
- Jest automatically redirects imports
- Services import real database path
- Tests automatically get mock
- No changes needed to service code

### Why Service Layer Tests?
- Fastest feedback (no HTTP overhead)
- Easy to mock database
- Test business logic in isolation
- No need for test database

### Why No HTTP Tests Yet?
- Requires supertest (not yet installed)
- Requires token helpers
- Requires test database or additional mocking
- Service layer tests provide good coverage for now

---

## 🎓 Learning Path

**Beginner**:
1. Read TESTING_QUICK_REF.md template
2. Look at driverService.test.ts
3. Try modifying a test

**Intermediate**:
1. Read TESTING_GUIDE.md sections 1-6
2. Study permission and transaction tests
3. Write a new service test

**Advanced**:
1. Read TESTING_GUIDE.md section 13
2. Set up supertest
3. Write route-level auth tests
4. Add integration tests

---

## ✨ Next Steps

- [ ] Read TESTING_QUICK_REF.md to get familiar with patterns
- [ ] Run `npm test` to see all tests pass
- [ ] Look at one test file (driverService.test.ts is good)
- [ ] Try modifying a test to understand how mocks work
- [ ] Write a test for a new service method
- [ ] When ready: Install supertest and add route tests

---

**For questions**, refer to the appropriate document:
- General questions → TESTING_GUIDE.md
- Quick patterns → TESTING_QUICK_REF.md
- Code examples → CODE_SNIPPETS.md
- File locations → FILE_INDEX.md
- Visual overview → VISUAL_SUMMARY.txt
