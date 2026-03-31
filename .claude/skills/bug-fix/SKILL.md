---
name: bug-fix
description: Workflow xử lý bug cho PhuPhatCorp Web. Invoke khi user báo bug, mô tả lỗi, hoặc paste error message/stack trace. Đi theo chu trình:reproduce → root cause → fix → verify → ghi lại. Chỉ dừng 1 lần sau khi reproduce để confirm đúng bug trước khi fix.
disable-model-invocation: true
---

# Workflow: Bug Fix
# PhuPhatCorp Web — Reproduce → Root Cause → Fix → Verify → Document

## Tổng quan

```
User mô tả bug / paste error
            ↓
[PHASE 1] Reproduce & triage   → xác định bug thực sự là gì
            ↓ ✋ dừng confirm
[PHASE 2] Root cause analysis  → tìm nguyên nhân gốc rễ
            ↓ tự động
[PHASE 3] Fix                  → sửa code, không thay đổi logic ngoài phạm vi bug
            ↓ tự động
[PHASE 4] Verify               → viết failing test → fix → test pass
            ↓ tự động
[PHASE 5] Document             → ghi vào lessons-learned.md
            ↓ tự động
         Báo cáo kết quả
```

**Chỉ dừng 1 lần:** Sau Phase 1 để confirm đúng bug trước khi fix.
**Escape hatch:** Không fix được trong 3 lần thử → báo cáo user và dừng.
**Nguyên tắc bất biến:** Chỉ sửa đúng phần gây ra bug, không refactor code xung quanh.

---

## PHASE 1 — Reproduce & Triage

### Input
Nhận mô tả bug từ user: error message, stack trace, steps to reproduce, màn hình bị lỗi.

Nếu thiếu thông tin để reproduce, hỏi tối đa 2 câu:
- "Lỗi xảy ra ở endpoint/trang nào?"
- "Error message hoặc stack trace là gì?"

### Thực hiện

**Bước 0 — Đọc context**
- `.claude/knowhow/know-how.md` → project structure, DB schema, API đang có
- `.claude/knowhow/system-features.md` → business logic, feature liên quan
- `.claude/knowhow/lessons-learned.md` → xem bug tương tự đã gặp chưa

**Bước 1 — Phân loại bug**

| Loại | Dấu hiệu | Hướng xử lý |
|------|-----------|-------------|
| Runtime error | Stack trace, unhandled exception | Tìm trong service/controller |
| Logic error | Sai kết quả, sai tính toán | Trace qua business logic |
| Data error | Sai/thiếu data trong DB | Kiểm tra migration, query |
| UI error | Hiển thị sai, state sai | Kiểm tra component, hook |
| Integration error | API call fail, wrong format | Kiểm tra contract BE-FE |

**Bước 2 — Locate bug**

Xác định chính xác:
- File bị lỗi: `[đường dẫn file]`
- Dòng code nghi ngờ: `[line number hoặc function name]`
- Điều kiện trigger: `[input/state nào gây ra lỗi]`

**Bước 3 — Đánh giá severity**

```
Critical  — app crash, mất data, security issue → ưu tiên fix ngay
High      — chức năng chính không dùng được
Medium    — chức năng phụ bị ảnh hưởng, có workaround
Low       — UI glitch, UX không tốt nhưng vẫn dùng được
```

### Checkpoint ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 PHASE 1 HOÀN TẤT — Đã reproduce bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bug:      [Mô tả ngắn gọn]
Severity: [Critical / High / Medium / Low]
Location: [file:line hoặc function]
Trigger:  [Điều kiện gây ra bug]
Loại:     [Runtime / Logic / Data / UI / Integration]

Bạn có muốn:
A) Tiếp tục fix
B) Đây không phải bug tôi muốn nói — mô tả lại
C) Dừng tại đây

Trả lời A, B, hoặc C?
```

---

## PHASE 2 — Root Cause Analysis

### Thực hiện tự động

Đọc code xung quanh vị trí bug, trace ngược từ triệu chứng về nguyên nhân gốc.

```markdown
### Root Cause Report

**Triệu chứng:** [Điều user thấy]
**Nguyên nhân gốc:** [Tại sao xảy ra — không phải "cái gì" mà là "tại sao"]
**Phạm vi ảnh hưởng:** [Những chỗ khác bị ảnh hưởng không?]
**Không phải nguyên nhân:** [Loại trừ những nghi ngờ sai]
```

Báo cáo:
```
🔎 PHASE 2 HOÀN TẤT — Root cause xác định
→ Bắt đầu Phase 3: Fix...
```

---

## PHASE 3 — Fix

### Thực hiện tự động

Dùng skill phù hợp theo loại bug:
- Bug ở backend → dùng skill `dev-backend`
- Bug ở frontend → dùng skill `dev-frontend`
- Bug ở cả hai → fix backend trước, frontend sau

**Nguyên tắc khi fix:**
- Chỉ thay đổi code liên quan trực tiếp đến bug
- Không refactor, không đổi tên, không "cải thiện" code xung quanh
- Giữ nguyên coding convention: `.claude/knowhow/coding_convention.md`
- Nếu fix cần thay đổi DB schema → tạo migration mới, không sửa migration cũ

**Sau khi fix:**
```bash
# Backend bug
cd backend && npm run lint && npm run build

# Frontend bug
cd frontend && npm run lint && npm run typecheck
```

Nếu lint/build fail → fix trước khi qua Phase 4.

Báo cáo:
```
🔧 PHASE 3 HOÀN TẤT — Code đã được fix
→ Bắt đầu Phase 4: Verify...
```

---

## PHASE 4 — Verify

### Thực hiện tự động

Dùng skill `test-qa` để verify fix:

**Bước 1 — Viết regression test**

Viết test case reproduce đúng bug trước khi fix (test phải fail với code cũ):
```typescript
describe('Regression: [Tên bug ngắn gọn]', () => {
  it('should [hành vi đúng] when [điều kiện trigger bug]', async () => {
    // Given — setup điều kiện trigger bug
    // When  — thực hiện action gây bug
    // Then  — verify kết quả đúng (test này phải pass sau khi fix)
  });
});
```

**Bước 2 — Chạy test**
```bash
cd backend && npm run test   # nếu bug ở backend
cd frontend && npm run test  # nếu bug ở frontend
```

**Nếu test fail sau khi fix:**
- Lần 1: Đọc lại error, điều chỉnh fix
- Lần 2: Kiểm tra root cause có đúng không
- Lần 3: Báo cáo user chi tiết và **dừng workflow**

**Bước 3 — Smoke test các chức năng liên quan**

Kiểm tra nhanh những chỗ có thể bị ảnh hưởng bởi fix:
```
- [ ] Chức năng bị bug đã hoạt động đúng
- [ ] Các API/component liên quan không bị break
- [ ] Không có lỗi mới trong console/logs
```

Báo cáo:
```
✅ PHASE 4 HOÀN TẤT — Tests pass, không có regression
→ Bắt đầu Phase 5: Document...
```

---

## PHASE 5 — Document

### Thực hiện tự động

Ghi vào `.claude/knowhow/lessons-learned.md`:

```markdown
## Bug: [Tên ngắn gọn — đủ để tìm lại sau]
- **Ngày:** YYYY-MM-DD
- **Severity:** Critical / High / Medium / Low
- **Feature liên quan:** [Tên feature]
- **Triệu chứng:** [User thấy gì]
- **Root cause:** [Nguyên nhân gốc rễ]
- **Fix:** [Thay đổi gì, ở file nào]
- **Regression test:** [Tên file test / describe block]
- **Cần chú ý:** [Điều tương tự cần tránh trong tương lai]
```

Nếu bug liên quan đến DB schema hoặc API → cập nhật `know-how.md`.
Nếu bug liên quan đến business logic → cập nhật `system-features.md`.

---

## Báo cáo cuối

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 BUG FIX HOÀN TẤT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bug:       [Tên bug]
Severity:  [Critical / High / Medium / Low]
Root cause: [1 câu mô tả nguyên nhân]
Fix:        [1 câu mô tả cách fix]
Files đã sửa:
  - [file 1]
  - [file 2]
Test:       [Tên regression test] — ✅ pass
Docs:       lessons-learned.md đã cập nhật

→ Nhớ commit với message: fix([scope]): [mô tả ngắn]
```

---

## Quy tắc bất biến

- **KHÔNG fix nhiều bug trong một lần** — mỗi workflow chỉ xử lý 1 bug
- **KHÔNG refactor code xung quanh** khi đang fix bug
- **KHÔNG skip regression test** — mọi bug fix phải có test
- **Escape hatch:** Không fix được sau 3 lần → báo cáo user, dừng, không đoán mò
- **Luôn ghi vào lessons-learned.md** dù bug nhỏ — tránh lặp lại sau này