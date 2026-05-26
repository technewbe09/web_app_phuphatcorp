---
name: db-query-optimizer
description: Workflow tối ưu database queries — trace FE API calls xuống BE queries, phát hiện N+1, duplicate, over-fetching, lên phương án tối ưu. Gọi skill này khi cần tối ưu query cho một chức năng.
---

# Query Optimizer Workflow

Khi skill này được load, bạn trace toàn bộ call chain của một chức năng, phát hiện vấn đề, lên phương án tối ưu. **Không thay đổi business logic hoặc API contract.**

## Quy tắc quan trọng

1. **Đến checkpoint ✋ → output báo cáo và DỪNG NGAY, đợi user duyệt plan.**
2. **Không thực thi bất kỳ thay đổi code nào khi chưa được user duyệt.**

## 7 Phase

```
Phase 1: RESEARCH   → trace FE API calls → BE queries
Phase 2: DETECT     → phân loại vấn đề
Phase 3: STRATEGY   → đề xuất phương án + impact
Phase 4: TASKS      → tạo task list
  ↓ ✋ DỪNG — user duyệt
Phase 5: EXECUTE    → gọi skill dev-backend / dev-frontend
Phase 6: VERIFY     → lint + test + smoke test
Phase 7: DOCUMENT   → lessons-learned
```

---

## Phase 1 — Research

1. Đọc `know-how.md`, `system-features.md`
2. Tìm FE entry point: page/component dùng chức năng
3. Liệt kê tất cả API calls từ FE
4. Trace xuống BE: route → middleware → controller → service → DB query
5. Tổng hợp query inventory (bao gồm middleware queries)

---

## Phase 2 — Detect

| Tầng | Loại | Dấu hiệu |
|------|------|----------|
| FE | Duplicate API | Cùng endpoint, nhiều component |
| FE | Sequential API | await tuần tự, không Promise.all |
| FE | Over-fetching | Response nhiều field, chỉ dùng ít |
| BE | N+1 | Query trong loop |
| BE | Duplicate Query | Cùng SQL trong 1 request |
| BE | Missing JOIN | Nhiều query riêng cho bảng có FK |
| BE | Over-fetching | SELECT * không cần |
| BE | Missing Index | WHERE/JOIN không index |

Với mỗi vấn đề: vị trí + mức nghiêm trọng + số query dư.

---

## Phase 3 — Strategy

Với mỗi vấn đề, đề xuất: kỹ thuật, trước/sau, số query giảm, trade-off.

---

## Phase 4 — Tasks

| ID | Tầng | Task | File | Effort |
|----|------|------|------|--------|
| OPT-B01 | BE | ... | ... | S/M/L |
| OPT-F01 | FE | ... | ... | S/M/L |

Lưu: `docs/tasks/YYYYMMDD_dbopt-[feature]-tasks.md`

### Checkpoint ✋ — DỪNG

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 4 — Plan sẵn sàng
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature: [tên]
API: [N]→[M] (-X%) | DB: [N]→[M] (-Y%)
Tasks: [Z] — BE: [A] | FE: [B]
API contract: ✅ không đổi

A) Thực thi
B) Điều chỉnh
C) Chỉ làm vài task
D) Dừng
```

⛔ **DỪNG. Đợi user duyệt trước khi sửa code.**

---

## Phase 5 — Execute (sau khi duyệt)

BE trước FE. Gọi `skill({name: "dev-backend"})` / `skill({name: "dev-frontend"})`.
Sau mỗi task: build/typecheck. Chỉ sửa query, không đụng logic.

---

## Phase 6 — Verify

Gọi `skill({name: "test-qa"})`. Lint + test + smoke test (page load, filter, pagination, response format). 3 lần fail → dừng.

---

## Phase 7 — Document

- Luôn → `lessons-learned.md`
- Index mới → `know-how.md`
- Pattern mới → `coding-convention.md`

---

## Quy tắc

- Không đổi business logic, API contract, UI/UX
- Không refactor ngoài scope
- BE trước FE
- 3 lần fail → dừng
