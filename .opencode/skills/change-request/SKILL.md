---
name: change-request
description: Workflow xử lý thay đổi trên feature đang có — đánh giá impact, lên plan, implement, verify, update docs. Gọi skill này khi user muốn sửa business logic, thêm field, đổi UI/UX, hoặc đổi API contract.
---

# Change Request Workflow

Khi skill này được load, bạn tuân thủ workflow bên dưới. Bạn đánh giá impact → lên plan → gọi skill thực thi → verify → cập nhật docs. Không dùng cho feature mới (dùng `feature-dev`) hoặc bug (dùng `bug-fix`).

## Quy tắc quan trọng

1. **Đến checkpoint ✋ → output báo cáo và DỪNG NGAY, đợi user.**
2. **Không chạy phase tiếp theo nếu chưa có input từ user tại checkpoint.**

## Tổng quan — 3 đường đi tùy impact

```
User mô tả thay đổi
  ↓
Phase 1: ASSESS → phân loại S / M / L
  ↓ ✋ DỪNG
  ├── SMALL → Phase 3 → Phase 4 → Phase 5
  ├── MEDIUM/LARGE (không UI) → Phase 2 → Phase 3 → Phase 4 → Phase 5
  └── MEDIUM/LARGE (có UI) → Phase 1.5 → Phase 2 → Phase 3 → Phase 4 → Phase 5
                              ✋ Dừng thêm sau Phase 2
```

---

## Phase 1 — Impact Assessment

1. Đọc: `know-how.md`, `system-features.md`, `lessons-learned.md`
2. Phân loại:

| Size | Điều kiện |
|------|-----------|
| SMALL | Không migration + ≤5 files + không đổi contract + không ảnh hưởng feature khác |
| MEDIUM | Migration HOẶC 6-10 files HOẶC đổi contract không break HOẶC ảnh hưởng 1-2 feature |
| LARGE | Đổi cấu trúc table HOẶC >10 files HOẶC break contract HOẶC ảnh hưởng ≥3 feature |

> LARGE quá phức tạp → khuyến nghị dùng `feature-dev`

### Checkpoint ✋ — DỪNG

Output CHỈ báo cáo dưới, KHÔNG thêm:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 1 — Impact Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thay đổi: [1 câu]
Loại:     Business Logic / Data / API / UI / Phối hợp
Impact:   SMALL / MEDIUM / LARGE
Files:    [N] trực tiếp, [N] gián tiếp
Migration: Có / Không

A) Tiếp tục
B) Điều chỉnh scope
C) Dừng
D) Chuyển sang feature-dev
```

⛔ **DỪNG. Đợi user.**

---

## Phase 1.5 — UI Spec (tự động, có điều kiện)

Chỉ khi: thay đổi có UI + MEDIUM/LARGE. Gọi `skill({name: "ui-ux-design"})`.

---

## Phase 2 — Plan (chỉ MEDIUM/LARGE)

SMALL bỏ qua. Lên plan dạng bảng CR-01...CR-xx. Thứ tự: Migration → BE → FE.

### Checkpoint ✋ (chỉ M/L)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 PHASE 2 — Change Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tổng: [X] bước | Thứ tự: BE → FE

A) Bắt đầu implement
B) Điều chỉnh plan
C) Dừng
```

---

## Phase 3 — Implement (tự động)

BE task → `skill({name: "dev-backend"})`, FE task → `skill({name: "dev-frontend"})`.
Sau mỗi layer: lint + build/typecheck. Chỉ sửa trong scope Phase 1.

---

## Phase 4 — Verify (tự động)

Gọi `skill({name: "test-qa"})`. Chạy test suite + cập nhật test. 3 lần fail → dừng.

---

## Phase 5 — Update Docs (tự động)

| Thay đổi | Cập nhật |
|----------|----------|
| Column, table, endpoint, contract | `know-how.md` |
| Business logic, flow, role | `system-features.md` |
| Layout, screen, states UI | `docs/ui/...` |
| Pattern mới | `lessons-learned.md` |

---

## Quy tắc

- Không sửa ngoài scope Phase 1
- Migration → BE → FE, không đảo thứ tự
- dev-frontend phải đọc UI Spec trước khi code
- 3 lần fail → revert, báo cáo, dừng
