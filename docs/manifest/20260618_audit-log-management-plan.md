# Plan Manifest: Quản lý Nhật ký Hệ thống (Audit Log Management)

**Ngày tạo:** 2026-06-18
**Workflow:** feature-dev-plan
**Phương án:** PA4 (Hybrid = HTTP-level access_logs + Business-level audit_logs)

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | [docs/ba/20260618_audit-log-management-analysis.md](docs/ba/20260618_audit-log-management-analysis.md) | Phân tích yêu cầu, flowchart, 10 business rules, data model (2 bảng), API contract (2 endpoints), 9 edge cases, service integration map |
| 2 | UI Spec | [docs/ui/20260618_audit-log-management-ui-spec.md](docs/ui/20260618_audit-log-management-ui-spec.md) | User journey (happy/alt/error paths), screen inventory (1 page 2 tabs), component checklist (8 components), validation UX, i18n keys (80+ keys), sidebar integration |
| 3 | Task List | [docs/tasks/20260618_audit-log-management-tasks.md](docs/tasks/20260618_audit-log-management-tasks.md) | 9 BE tasks + 5 FE tasks, thứ tự thực hiện, 8 lưu ý kỹ thuật, BE-08 breakdown 34 service integration points |

---

## Tóm tắt

- **Feature:** Quản lý Nhật ký Truy cập và Thao tác Hệ thống
- **BA Analysis:** 4 user stories, 10 business rules
- **UI Spec:** 1 trang chính (2 tabs), 8 components, states: loading/empty/emptySearch/error/populated
- **Task List:** 9 BE tasks, 5 FE tasks
- **Công nghệ:** Express middleware (fire-and-forget), PostgreSQL (2 bảng mới), React + TanStack Query + Tailwind
- **Permission:** `logs.view` — ADMIN + ACCOUNTANT
- **Retention:** 90 ngày (access), 180 ngày (audit), tự động cleanup cron 3AM
- **Vị trí menu:** "Thiết lập người dùng" → "Nhật ký hệ thống"

---

## Effort ước tính

| Phase | Tasks | Effort |
|-------|-------|--------|
| Backend | BE-01 → BE-09 | ~3.5 giờ |
| Frontend | FE-01 → FE-05 | ~2 giờ |
| **Tổng** | | **~5.5 giờ** |

---

## Sử dụng

Để thực thi implementation, gọi workflow `feature-dev-exec` và trỏ vào file manifest này:

```
feature-dev-exec --manifest docs/manifest/20260618_audit-log-management-plan.md
```
