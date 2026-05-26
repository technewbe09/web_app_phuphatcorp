---
name: test-qa
description: Viết và chạy unit/integration tests cho backend, test chức năng UI đối chiếu UI Spec, viết regression tests, kiểm tra bug. Invoke khi cần viết tests, chạy tests, QA checklist, verify fix. Dùng khi user nói "viết test", "chạy test", "QA", "regression", "kiểm tra bug".
---
# Skill: QA/Test Engineer

## Mô tả
Skill này giúp bạn viết và chạy tests cho backend, test chức năng trên UI, và đảm bảo chất lượng sản phẩm.

## Khi nào sử dụng
- Khi cần viết unit/integration tests cho backend (Phase 5)
- Khi cần chạy tests và verify kết quả (Phase 6)
- Khi cần test chức năng UI đối chiếu UI Spec và viết regression tests (Phase 8)
- Khi cần kiểm tra bug và verify fix

## Cách sử dụng

### Viết Unit/Integration Tests (Phase 5)

**Bước 0 — Đọc context trước khi viết test**
- `docs/ba/YYYYMMDD_[feature]-analysis.md` → business rules, edge cases, API contract
- `docs/tasks/YYYYMMDD_[feature]-tasks.md` → scope implement
- Codebase backend đã implement → hiểu đúng behavior cần test

1. Viết unit test cho service layer — cover happy path + edge cases + error cases
2. Viết integration test cho API route — cover từng role có quyền truy cập
3. Lưu test cases tại `docs/unit-integration/YYYYMMDD_[feature]-testcases.md`

**Test data strategy — áp dụng nhất quán:**
- Dùng **factory function** để tạo test data, không hardcode giá trị trực tiếp trong test
- Mỗi test tự setup và tự cleanup data của mình — không phụ thuộc thứ tự chạy
- Dùng transaction rollback hoặc truncate sau mỗi test suite để reset state
- Không dùng data từ môi trường dev/staging — test phải tự tạo data cần thiết

```typescript
// Pattern tạo test data
const createTestUser = (overrides = {}) => ({
  email: `test-${Date.now()}@example.com`,
  role: 'customer',
  ...overrides,
});
```

### Chạy Tests (Phase 6)

```bash
cd backend && npm run test
```

Nếu fail: fix code → run lại. Tối đa 3 lần. Sau 3 lần fail → báo cáo user và dừng.

### QA Functional + Regression (Phase 8)

**Bước 0 — Đọc trước khi test**
- `docs/ba/YYYYMMDD_[feature]-analysis.md` → requirements gốc
- `docs/ui/YYYYMMDD_[feature]-ui-spec.md` → UI Spec (nếu có) — dùng để đối chiếu UI

1. Chạy toàn bộ test suite
2. Đối chiếu UI với UI Spec (nếu có) theo checklist bên dưới
3. Kiểm tra từng role có quyền truy cập
4. Viết regression test cho bug mới phát hiện

---

## Test Templates

### Unit Test (Service Layer)
```typescript
describe('[ServiceName]', () => {
  // Happy path
  it('should [behavior] when [condition]', async () => {
    // Given
    // When
    // Then
  });

  // Edge case
  it('should [behavior] when [edge condition]', async () => {
    // Given
    // When
    // Then
  });

  // Error case
  it('should throw [ErrorType] when [invalid condition]', async () => {
    // Given
    // When / Then
    await expect(service.method(invalidInput)).rejects.toThrow(ErrorType);
  });
});
```

### Integration Test (API Route)
```typescript
describe('[METHOD] /api/[endpoint]', () => {
  // Test với từng role có quyền
  it('should [response] with [status] when called by [role]', async () => {
    // Given — tạo user đúng role + test data
    const user = await createTestUser({ role: 'admin' });
    const token = generateToken(user);
    // When
    const res = await request(app)
      .get('/api/...')
      .set('Authorization', `Bearer ${token}`);
    // Then
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Test role không có quyền
  it('should return 403 when called by unauthorized role', async () => {
    const user = await createTestUser({ role: 'customer' });
    const token = generateToken(user);
    const res = await request(app)
      .post('/api/admin/...')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  // Test không có token
  it('should return 401 when no token provided', async () => {
    const res = await request(app).get('/api/...');
    expect(res.status).toBe(401);
  });
});
```

### Regression Test
```typescript
describe('Regression: [Tên bug ngắn gọn — đủ để tìm lại]', () => {
  it('should [hành vi đúng] when [điều kiện trigger bug]', async () => {
    // Comment: Bug gốc — [mô tả ngắn bug đã xảy ra]
    // Ngày fix: YYYY-MM-DD

    // Given — setup đúng điều kiện đã trigger bug
    // When  — thực hiện action gây bug
    // Then  — verify kết quả đúng (test này phải pass sau khi fix)
  });
});
```

### Gherkin Test
```
Feature: [Tên feature]
Scenario: [Mô tả]
  Given [Điều kiện]
  When [Hành động]
  Then [Kết quả]
```

### Bug Report
```
Title: [Mô tả]
Severity: Critical/High/Medium/Low
Role:  [Role nào gặp bug — admin / customer / cả hai]
Steps:
1. [Step 1]
2. [Step 2]
Expected: [Kết quả mong]
Actual: [Kết quả thực tế]
UI Spec ref: [Screen/state nào trong docs/ui/ — nếu có]
```

---

## QA Checklist (Phase 8)

```
UI Spec Compliance (nếu có docs/ui/):
- [ ] Layout đúng với Screen Inventory — header, filter, table/form, actions
- [ ] Loading state hiển thị đúng (skeleton/spinner, không để blank)
- [ ] Empty state hiển thị đúng (message rõ ràng + CTA nếu spec yêu cầu)
- [ ] Error state hiển thị đúng (message + nút Thử lại)
- [ ] Success feedback đúng (toast sau create/update/delete)
- [ ] Confirm dialog xuất hiện trước action destructive
- [ ] Nút submit disabled khi đang submitting
- [ ] Validation lỗi đúng vị trí (inline/toast) theo spec Section 4

Role & Permission:
- [ ] Admin thấy đúng những gì admin được thấy
- [ ] Customer không thấy/truy cập được routes của admin
- [ ] API trả 403 khi role không có quyền
- [ ] API trả 401 khi không có token

Functional:
- [ ] Tất cả BA requirements đã implement đúng
- [ ] Edge cases đã handle
- [ ] API response đúng format { success, data/error }

Technical:
- [ ] lint pass: npm run lint (BE + FE)
- [ ] test pass: npm run test (BE + FE)
- [ ] TypeScript không có lỗi
- [ ] i18n đầy đủ cả vi.json và en.json
- [ ] API filter đúng theo user context

Security:
- [ ] Không log sensitive data
- [ ] File URL là presigned (có expiry)
- [ ] Auth check đầy đủ trên mọi route
```

---

## Quy tắc bất biến

- **Mọi test phải tự lập** — không phụ thuộc vào thứ tự chạy hay data từ test khác
- **Test từng role** — mọi API route cần có test cho role có quyền và role không có quyền
- **Regression test bắt buộc** khi phát hiện bug mới trong Phase 8 — không bỏ qua
- **UI Spec là source of truth cho UI** — nếu UI khác spec → báo bug, không tự điều chỉnh spec theo code
- **Không pass QA khi còn UI Spec violation** — dù test pass hết