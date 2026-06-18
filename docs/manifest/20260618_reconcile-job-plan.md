# Plan Manifest: Job Đối chiếu HĐ tự động

**Ngày tạo:** 2026-06-18
**Workflow:** feature-dev-plan

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | docs/ba/20260618_reconcile-job-analysis.md | 4 user stories, 11 business rules, 2 bảng mới, 7 API endpoints, scheduler architecture |
| 2 | UI Spec | docs/ui/20260618_reconcile-job-ui-spec.md | User journey, screen inventory (1 page + 1 modal), 5 components, validation UX, i18n keys |
| 3 | Task List | docs/tasks/20260618_reconcile-job-tasks.md | 7 BE tasks + 5 FE tasks, thứ tự thực hiện, lưu ý kỹ thuật |

---

## Tóm tắt

- **Feature:** Job tự động đối chiếu `accountant_invoices` với `driver_invoices` theo lịch cấu hình + màn hình cấu hình
- **BA Analysis:** 4 user stories, 11 business rules
- **UI Spec:** 1 màn hình (`/accounting-data/reconcile-jobs`), 5 components
- **Task List:** 7 BE tasks (4 S, 2 M, 1 L), 5 FE tasks (2 S, 2 M, 1 L)

### Backend
- **Route mới:** `GET/POST /api/reconcile-jobs/configs`, `PUT/DELETE/PATCH /api/reconcile-jobs/configs/:id`, `POST /api/reconcile-jobs/trigger`, `GET /api/reconcile-jobs/logs`
- **Bảng mới:** `reconcile_job_configs`, `reconcile_job_logs`
- **Dependency mới:** `node-cron`
- **Permission:** `accounting_data.view` / `accounting_data.manage` (có sẵn)

### Frontend
- **Route mới:** `/accounting-data/reconcile-jobs`
- **Menu:** Thêm sub-item "Cấu hình Job" trong "Quản lý dữ liệu kế toán"
- **Components mới:** `ReconcileJobPage`, `HourSelector`

---

## Sử dụng

Để thực thi implementation, gọi workflow `feature-dev-exec` và trỏ vào file manifest này:
```
feature-dev-exec --manifest docs/manifest/20260618_reconcile-job-plan.md
```
