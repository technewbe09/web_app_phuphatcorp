# Skill: Backend Developer

## Mô tả
Skill này giúp bạn xây dựng API và xử lý business logic ở tầng backend.

## Khi nào sử dụng
- Khi cần tạo API endpoints mới
- Khi cần xử lý business logic trong service layer
- Khi cần tạo/sửa database migration
- Khi cần validate input data với Zod

## Cách sử dụng

**Bước 0 — Đọc context (bắt buộc trước khi viết code)**
- `.claude/knowhow/know-how.md` → DB schema đang có, API endpoints hiện tại
- `.claude/knowhow/system-features.md` → business logic, role access, feature flows
- `.claude/knowhow/coding_convention.md` → naming, patterns, security conventions

**Thứ tự implement:**
1. Migration (nếu cần thay đổi schema)
2. Service (business logic)
3. Validation (Zod schema)
4. Controller (request handler)
5. Route (đăng ký endpoint + middleware)
6. Lint + test trước khi báo xong

---

## Patterns

### Migration
```sql
-- File: src/migrations/XXX_ten_migration.sql
-- Luôn idempotent — an toàn khi chạy lại

CREATE TABLE IF NOT EXISTS ten_bang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Thêm column vào bảng có sẵn
ALTER TABLE ten_bang ADD COLUMN IF NOT EXISTS ten_column VARCHAR;

-- Seed data
INSERT INTO ten_bang (col1, col2)
VALUES ('val1', 'val2')
ON CONFLICT (col1) DO NOTHING;
```

### Service Layer
```typescript
// File: src/services/tenService.ts
// Mỗi service là object export, mỗi method làm 1 việc

const tenService = {
  async getById(id: string) {
    const { rows } = await pool.query('SELECT * FROM ten_bang WHERE id = $1', [id]);
    if (!rows[0]) throw new NotFoundError('TenBang');
    return rows[0];
  },

  async create(payload: CreatePayload) {
    // Validate business rules trước khi insert
    // Throw custom error nếu vi phạm
    const { rows } = await pool.query(
      'INSERT INTO ten_bang (col1, col2) VALUES ($1, $2) RETURNING *',
      [payload.col1, payload.col2]
    );
    return rows[0];
  },
};

export default tenService;
```

### Error Classes
```typescript
// Throw custom errors trong service — global errorHandler sẽ catch
throw new NotFoundError('User');           // 404
throw new ConflictError('Email đã tồn tại'); // 409
throw new UnauthorizedError('Invalid credentials'); // 401
throw new ForbiddenError('Không có quyền');  // 403
throw new ValidationError('Dữ liệu không hợp lệ'); // 400

// KHÔNG dùng res.status().json() trong service
// KHÔNG try/catch rồi nuốt lỗi — để lỗi bubble lên errorHandler
```

### Zod Validation
```typescript
// File: src/validators/tenSchema.ts
import { z } from 'zod';

export const createTenSchema = z.object({
  body: z.object({
    col1: z.string().min(1, 'Col1 bắt buộc'),
    col2: z.number().positive('Phải > 0'),
    factory: z.enum(['CLF', 'VFM', 'MCC', 'CLV', 'NDFC']),
  }),
});

// Dùng trong route:
router.post('/', validate(createTenSchema), asyncHandler(controller.create));
```

### Controller
```typescript
// File: src/controllers/tenController.ts
// Controller chỉ làm 3 việc: lấy input → gọi service → trả response

const create = async (req: Request, res: Response) => {
  const result = await tenService.create(req.body);
  res.status(201).json({ success: true, data: result });
};

const getById = async (req: Request, res: Response) => {
  const result = await tenService.getById(req.params.id);
  // Loại bỏ sensitive fields trước khi trả
  const { password_hash, ...safe } = result;
  res.json({ success: true, data: safe });
};
```

### Route
```typescript
// File: src/routes/tenRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public routes (có auth nhưng mọi role đều truy cập)
router.get('/', authenticate, asyncHandler(controller.list));
router.get('/:id', authenticate, asyncHandler(controller.getById));

// Restricted routes (chỉ admin, manager)
router.post('/', authenticate, roleMiddleware(['admin', 'manager']), validate(createSchema), asyncHandler(controller.create));
router.put('/:id', authenticate, roleMiddleware(['admin', 'manager']), validate(updateSchema), asyncHandler(controller.update));

export default router;
```

### DB Query với Transaction
```typescript
// Dùng transaction khi cần nhiều queries atomic
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', []);
  await client.query('UPDATE ...', []);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

## Response Format

Mọi API response đều theo format:
```json
// Success
{ "success": true, "data": { ... } }

// Success với pagination
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }

// Error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "User not found" } }
```

---

## Checklist trước khi báo xong

```bash
cd backend && npm run lint      # không có lỗi
cd backend && npm run build     # TypeScript compile thành công
cd backend && npm run test      # tests pass
```

- [ ] Migration idempotent (IF NOT EXISTS / ON CONFLICT)
- [ ] Service throw custom errors, không dùng res.status() trực tiếp
- [ ] Controller không chứa business logic
- [ ] Zod validation cho mọi POST/PUT request
- [ ] Route có authenticate + roleMiddleware đúng
- [ ] Response đúng format `{ success, data/error }`
- [ ] Không log sensitive data (password, token)
- [ ] Không trả password_hash trong response