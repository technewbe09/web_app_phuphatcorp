# Skill: QA/Test Engineer

## Mô tả
Skill này giúp bạn viết và chạy tests cho backend, test chức năng trên UI, và đảm bảo chất lượng sản phẩm.

## Khi nào sử dụng
- Khi cần viết unit/integration tests cho backend (Phase 5)
- Khi cần chạy tests và verify kết quả (Phase 6)
- Khi cần test chức năng UI và viết regression tests (Phase 8)
- Khi cần kiểm tra bug và verify fix

## Cách sử dụng

### Viết Unit/Integration Tests (Phase 5)

1. Đọc BA Analysis từ `docs/ba/YYYYMMDD_[feature]-analysis.md`
2. Đọc task list từ `docs/tasks/YYYYMMDD_[feature]-tasks.md`
3. Đọc codebase backend đã implement
4. Viết unit test cho service layer
5. Viết integration test cho API route

Lưu test cases tại `docs/unit-integration/YYYYMMDD_[feature]-testcases.md`

### Chạy Tests (Phase 6)

```bash
cd backend && npm run test
```

Nếu fail: fix code → run lại. Tối đa 3 lần. Sau 3 lần fail → báo cáo user và dừng.

### QA Functional + Regression (Phase 8)

1. Đọc test cases từ Phase 5
2. Test trên UI theo checklist bên dưới
3. Viết regression test cho bug mới phát hiện

---

## Test Templates

### Unit Test (Service Layer)
```typescript
describe('[ServiceName]', () => {
  it('should [behavior] when [condition]', async () => {
    // Given
    // When
    // Then
  });
});
```

### Integration Test (API Route)
```typescript
describe('[METHOD] /api/[endpoint]', () => {
  it('should [response] with [status] when [condition]', async () => {
    // Given
    // When
    // Then
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
Steps:
1. [Step 1]
2. [Step 2]
Expected: [Kết quả mong]
Actual: [Kết quả thực tế]
```

---

## QA Checklist (Phase 8)

```
Functional:
- [ ] Tất cả BA requirements đã implement đúng
- [ ] Edge cases đã handle
- [ ] API response đúng format { success, data/error }
- [ ] UI hiển thị đúng theo spec

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
