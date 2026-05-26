---
name: bug-fix
description: Workflow xử lý bug — reproduce, root cause, fix, verify, document. Gọi skill này khi user báo bug, paste error, hoặc mô tả lỗi.
---

# Bug Fix Workflow

Khi skill này được load, bạn phải tuân thủ workflow bên dưới. Bạn là người điều phối — gọi skill khác (`dev-backend`, `dev-frontend`, `test-qa`, `tech-lead`) để thực thi, không tự implement.

## Quy tắc tối quan trọng

1. **Mỗi lần output cho user thì DỪNG — đợi user phản hồi.** Không tự ý chạy bước tiếp.
2. **Khi đến checkpoint ✋, output báo cáo và DỪNG NGAY.** Không output kết quả phase sau.
3. **Chỉ chạy Phase 2-6 khi user đã chọn "A" tại checkpoint Phase 1.**

## 6 Phase

```
Phase 1: REPRODUCE  → tìm bug, phân loại severity
  ↓ ✋ DỪNG — output checkpoint, đợi user chọn A/B/C
Phase 2: ROOT CAUSE → phân tích nguyên nhân gốc
Phase 3: TECH LEAD  → load skill tech-lead, tạo task list
Phase 4: FIX        → load skill dev-backend / dev-frontend
Phase 5: VERIFY     → load skill test-qa
Phase 6: DOCUMENT   → cập nhật lessons-learned
```

**Escape hatch:** 3 lần fail → báo cáo user, dừng.

---

## Phase 1 — Reproduce & Triage

1. Đọc context: `know-how.md`, `system-features.md`, `lessons-learned.md`
2. Nếu thiếu thông tin → hỏi tối đa 2 câu: endpoint/trang nào? error message?
3. Xác định: file lỗi + dòng nghi ngờ + trigger + severity

### Checkpoint ✋ — DỪNG TẠI ĐÂY

Output CHỈ báo cáo dưới, KHÔNG thêm gì, KHÔNG chạy Phase 2:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 PHASE 1 — Đã reproduce bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bug:      [mô tả 1 câu]
Severity: Critical / High / Medium / Low
Location: [file:line]
Trigger:  [điều kiện]

A) Tiếp tục fix
B) Chưa đúng — mô tả lại
C) Dừng
```

⛔ **DỪNG. Đợi user gõ A, B, hoặc C.**

---

## Phase 2 — Root Cause (chỉ chạy sau khi user chọn A)

Phân tích nguyên nhân gốc. Output ngắn:
```
🔎 Root cause: [1 câu]
📋 Phạm vi ảnh hưởng: [file/feature khác?]
📄 Docs cần cập nhật sau fix: [lessons-learned / know-how / system-features]
→ Chuyển Phase 3...
```

---

## Phase 3 — Tech Lead (tự động)

Gọi `skill({name: "tech-lead"})` — tạo task list BBE-xx / BFE-xx.
Lưu: `docs/tasks/YYYYMMDD_bugfix-[tên]-tasks.md`

---

## Phase 4 — Fix (tự động)

Tuần tự từng task, gọi skill tương ứng. Sau mỗi task: lint + build/typecheck.

---

## Phase 5 — Verify (tự động)

Gọi `skill({name: "test-qa"})` — viết regression test + chạy. 3 lần fail → dừng.

---

## Phase 6 — Document (tự động)

- Luôn → `lessons-learned.md`
- API/DB thay đổi → `know-how.md`
- Business logic thay đổi → `system-features.md`

---

## Quy tắc

- 1 bug = 1 workflow, không gộp
- Không refactor code xung quanh
- Mọi bug phải có regression test + lessons-learned
- Gọi skill, không tự implement
