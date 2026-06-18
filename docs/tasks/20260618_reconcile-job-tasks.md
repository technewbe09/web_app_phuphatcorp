# Task List: Job Đối chiếu HĐ tự động

**Ngày:** 2026-06-18
**BA Doc:** docs/ba/20260618_reconcile-job-analysis.md
**UI Spec:** docs/ui/20260618_reconcile-job-ui-spec.md

---

## BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration | File: `backend/src/migrations/019_create_reconcile_jobs.sql`. Tạo 2 bảng: `reconcile_job_configs` + `reconcile_job_logs` với indexes và FK constraints. | S |
| BE-02 | Types + interfaces | File: `backend/src/services/reconcileJobService.ts`. Interfaces: `ReconcileJobConfig`, `ReconcileJobLog`, `CreateConfigInput`, `UpdateConfigInput`, `ToggleConfigInput`, `LogFilters`, `TriggerInput`, `TriggerResult`. | S |
| BE-03 | Viết service CRUD + executeReconcile | File: `backend/src/services/reconcileJobService.ts`. Methods: `listConfigs()`, `createConfig(input, userId)`, `updateConfig(id, input, userId)`, `deleteConfig(id)`, `toggleConfig(id)`, `executeReconcile(lookbackDays)`, `getLogs(filters)`. Logic đối chiếu: 1 query UPDATE với CTE driver_invoice_flat, fuzzy match 4 mức giống deliveryDataService/driverInvoiceService. | L |
| BE-04 | Scheduler service | File: `backend/src/services/schedulerService.ts`. Dùng `node-cron`. `init()`: load active configs, schedule cron jobs. `reschedule(configId)`: hủy + đăng ký lại jobs. `destroy()`: hủy tất cả. Xử lý graceful shutdown trong server.ts. | M |
| BE-05 | Controller | File: `backend/src/controllers/reconcileJobController.ts`. 7 handler functions: `listConfigs`, `createConfig`, `updateConfig`, `deleteConfig`, `toggleConfig`, `triggerReconcile`, `getLogs`. Validate input, gọi service, format response `{success, message, data}`. | M |
| BE-06 | Routes | File: `backend/src/routes/reconcileJobs.ts`. 7 routes với `authenticateToken` + `requirePermission`. GET /configs và GET /logs dùng `accounting_data.view`. POST/PUT/DELETE/PATCH /configs và POST /trigger dùng `accounting_data.manage`. | S |
| BE-07 | Register routes + cài dependency | `routes/index.ts`: `router.use('/reconcile-jobs', reconcileJobRoutes)`. `server.ts`: gọi `schedulerService.init()` sau khi DB connected, `process.on('SIGTERM')` -> `schedulerService.destroy()`. `npm install node-cron @types/node-cron`. | S |

---

## FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|--------------|--------|
| FE-01 | API client + types | File: `frontend/src/api/reconcileJobApi.ts`. Types: `ReconcileJobConfig`, `CreateConfigInput`, `UpdateConfigInput`, `ReconcileJobLog`, `LogFilters`, `TriggerInput`, `TriggerResult`, `PaginatedResponse`. Functions: `fetchConfigs`, `createConfig`, `updateConfig`, `deleteConfig`, `toggleConfig`, `triggerReconcile`, `fetchLogs` - tất cả dùng axiosClient. | — | S |
| FE-02 | TanStack Query hooks | File: `frontend/src/hooks/useReconcileJobs.ts`. `useGetConfigs()`: queryKey `['reconcile-jobs', 'configs']`. `useCreateConfig()`: mutation + invalidate. `useUpdateConfig()`: mutation + invalidate. `useDeleteConfig()`: mutation + invalidate. `useToggleConfig()`: mutation + invalidate. `useTriggerReconcile()`: mutation + invalidate configs + logs. `useGetLogs(filters)`: queryKey `['reconcile-jobs', 'logs', filters]`. | — | M |
| FE-03 | ReconcileJobPage | File: `frontend/src/pages/admin/accounting-data/ReconcileJobPage.tsx`. Layout card form + tab logs. States: loading, empty, view, edit, error. Tích hợp: HourSelector, LogTable, toast notifications. Pattern tham chiếu: WeightAdjustmentPage (form trong card). | Screen 1 | L |
| FE-04 | HourSelector component | File: `frontend/src/components/accounting-data/HourSelector.tsx`. Grid 4x6 checkbox (0-23h). Mỗi checkbox: input type checkbox + label "00:00", "01:00"... Props: `selected: number[]`, `onChange: (hours: number[]) => void`, `disabled?: boolean`. | Screen 1 | M |
| FE-05 | Router + Sidebar + i18n | `Router.tsx`: thêm route `<Route path="/accounting-data/reconcile-jobs" element={<ReconcileJobPage />} />`. `MainLayout.tsx`: thêm `{ to: '/accounting-data/reconcile-jobs', icon: RefreshCw, label: 'Cấu hình Job' }` vào `accountingDataSubItems`. Import `RefreshCw` từ lucide-react. `i18n/vi.json` + `i18n/en.json`: thêm keys từ UI Spec section 5. | Screen 1 | S |

---

## Thứ tự thực hiện khuyến nghị

```
BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06 → BE-07 (Backend hoàn tất)
FE-01 → FE-02 → FE-04 → FE-03 → FE-05                   (Frontend hoàn tất)
```

---

## Lưu ý kỹ thuật

1. **Tái dùng reconcile logic**: Không viết mới logic đối chiếu. Copy fuzzy match SQL pattern từ `deliveryDataService.ts` (import) và `driverInvoiceService.ts` (reconcileAccountantInvoices). Sử dụng cùng chuẩn hóa so_xe 3 bước và strip leading zero.

2. **node-cron scheduling**: Mỗi config có thể có nhiều giờ -> tạo cron expression `0 {hour} * * *` cho mỗi giờ. Lưu các cron job tasks vào Map<configId, CronJob[]> để dễ reschedule.

3. **Concurrent safety**: UPDATE chỉ WHERE `trang_thai='không có'` -> atomic per row. Không cần lock table. Job chạy manual + scheduled cùng lúc không conflict.

4. **Log retention**: Chưa có cơ chế tự xóa log cũ. Có thể thêm sau (vd: tự xóa log > 30 ngày). Hiện tại để tích lũy, kế toán tự xem và theo dõi.

5. **Frontend pattern**: ReconcileJobPage khác với các page CRUD thông thường (thường là table). Page này dùng single card form vì thông thường chỉ có 1 config. Nếu sau này cần nhiều config, dễ dàng chuyển sang table pattern.
