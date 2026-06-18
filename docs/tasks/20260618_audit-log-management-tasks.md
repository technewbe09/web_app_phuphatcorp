# Task List: Quản lý Nhật ký Hệ thống (Audit Log Management)

**Ngày:** 2026-06-18
**BA Doc:** docs/ba/20260618_audit-log-management-analysis.md
**UI Spec:** docs/ui/20260618_audit-log-management-ui-spec.md

---

## BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration | File: `backend/src/migrations/026_create_audit_logs.sql`. Tạo 2 bảng `access_logs` + `audit_logs` với đầy đủ columns, indexes (6 indexes tổng cộng), FK ON DELETE SET NULL. Seed permission `logs.view`, gán cho ADMIN + ACCOUNTANT via `role_permissions`. | S |
| BE-02 | Tạo auditService | File: `backend/src/services/auditService.ts`. Methods: `logAccess(data)` fire-and-forget INSERT vào `access_logs`, `logAudit(data)` fire-and-forget INSERT vào `audit_logs` (dùng `setImmediate()` giống pattern `userService.logActivity()`). `getAccessLogs(filters)` + `getAuditLogs(filters)` với dynamic SQL WHERE builder, JOIN `users` để lấy `full_name`, pagination. TypeScript interfaces: `AccessLogData`, `AuditLogData`, `AccessLogFilters`, `AuditLogFilters`, `PaginatedResult<T>`. | M |
| BE-03 | Tạo auditMiddleware | File: `backend/src/middleware/auditMiddleware.ts`. Middleware bắt request: lưu `Date.now()` trước khi `next()`, hook `res.on('finish')` để tính `responseTimeMs` và gọi `auditService.logAccess()`. Chỉ log non-GET methods (POST, PUT, DELETE, PATCH). Bỏ qua các path: `/health`. Extract `ip_address` từ `req.ip` hoặc `x-forwarded-for`. | S |
| BE-04 | Tạo auditController | File: `backend/src/controllers/auditController.ts`. 2 handler: `getAccessLogs` và `getAuditLogs`. Parse query params thành filters (userId, method, path, statusCode, action, entityType, entityId, dateFrom, dateTo, page, limit). Mặc định limit=50. Gọi `auditService.getXxxLogs()`. Response format: `{ success, data, meta: { total, page, limit, totalPages } }`. | S |
| BE-05 | Tạo route auditLogs | File: `backend/src/routes/auditLogs.ts`. 2 routes với `authenticateToken` + `requirePermission('logs.view')`: GET /access và GET /audit. Mount vào `routes/index.ts`: `router.use('/logs', auditLogRoutes)`. | S |
| BE-06 | Gắn middleware vào app | File: `backend/src/app.ts`. Import `auditMiddleware`. Gắn sau khi route `/api` đã mount nhưng để middleware trong từng route group không khả thi (cần req.user). **Giải pháp:** Tạo 1 middleware wrapper trong `routes/index.ts` hoặc gắn trực tiếp vào từng route file. Tốt nhất: thêm `auditMiddleware` vào `authenticateToken` flow — trong `auth.ts`, sau khi xác thực thành công, gọi `auditService.logAccess()`. | S |
| BE-07 | Log LOGIN/LOGOUT trong authController | File: `backend/src/controllers/authController.ts`. Trong `login`: sau khi `sendSuccess`, gọi `auditService.logAudit()` với action='LOGIN', entity_type='auth', details={email}. Trong `logout`: sau khi clear cookie, gọi `auditService.logAudit()` với action='LOGOUT', entity_type='auth'. Lưu ý: login chưa có `req.user` tại thời điểm gọi, dùng `user.id` từ kết quả query. | S |
| BE-08 | Log business events trong 12 service | Sửa controller/service để gọi `auditService.logAudit()` sau mỗi mutation thành công. Pattern: controller extract `userId = req.user.userId`, `username = user.full_name || user.email`, `ip = req.ip`. Tất cả dùng fire-and-forget. Danh sách chi tiết bên dưới. | L |

### BE-08 breakdown — Từng service cần sửa:

| File | Method | Action | Entity Type | entity_label |
|------|--------|--------|-------------|--------------|
| `controllers/usersController.ts` | `createUser` | CREATE | user | `data.username` |
| `controllers/usersController.ts` | `updateUser` | UPDATE | user | `data.username` |
| `controllers/usersController.ts` | `deleteUser` | DELETE | user | user's username |
| `controllers/usersController.ts` | `resetPassword` | UPDATE | user | user's username |
| `controllers/rolesController.ts` | `createRole` | CREATE | role | role name |
| `controllers/rolesController.ts` | `updateRole` | UPDATE | role | role name |
| `controllers/rolesController.ts` | `toggleRole` | TOGGLE | role | role name |
| `controllers/permissionsController.ts` | `updateRolePermissions` | UPDATE | permission | role name |
| `controllers/driverInvoiceController.ts` | `create` | CREATE | driver_invoice | "Invoice #id" |
| `controllers/driverInvoiceController.ts` | `update` | UPDATE | driver_invoice | "Invoice #id" |
| `controllers/driverInvoiceController.ts` | `remove` | DELETE | driver_invoice | "Invoice #id" |
| `controllers/customerController.ts` | `create` | CREATE | customer | customer name |
| `controllers/customerController.ts` | `update` | UPDATE | customer | customer name |
| `controllers/customerController.ts` | `remove` | DELETE | customer | customer name |
| `controllers/supplierController.ts` | `create` | CREATE | supplier | supplier name |
| `controllers/supplierController.ts` | `update` | UPDATE | supplier | supplier name |
| `controllers/supplierController.ts` | `remove` | DELETE | supplier | supplier name |
| `controllers/vehicleController.ts` | `upload` | CREATE | vehicle | "[count] xe" |
| `controllers/vehicleController.ts` | `remove` | DELETE | vehicle | plate number |
| `controllers/weightAdjustmentController.ts` | `create` | CREATE | weight_adjustment | ma_hang |
| `controllers/weightAdjustmentController.ts` | `update` | UPDATE | weight_adjustment | ma_hang |
| `controllers/weightAdjustmentController.ts` | `remove` | DELETE | weight_adjustment | ma_hang |
| `controllers/deliveryDataController.ts` | `importFile` | IMPORT | batch | filename |
| `controllers/deliveryDataController.ts` | `deleteBatch` | DELETE | batch | "Batch #id" |
| `controllers/dispatchScheduleController.ts` | `create` | CREATE | dispatch_schedule | "Dispatch #id" |
| `controllers/dispatchScheduleController.ts` | `update` | UPDATE | dispatch_schedule | "Dispatch #id" |
| `controllers/dispatchScheduleController.ts` | `remove` | DELETE | dispatch_schedule | "Dispatch #id" |
| `controllers/deliveryScheduleController.ts` | `upload` | UPLOAD | delivery_schedule | filename |
| `controllers/deliveryScheduleController.ts` | `deleteByDateRange` | DELETE | delivery_schedule | "Date range" |
| `controllers/reconcileJobController.ts` | `createConfig` | CREATE | job | config name |
| `controllers/reconcileJobController.ts` | `updateConfig` | UPDATE | job | config name |
| `controllers/reconcileJobController.ts` | `deleteConfig` | DELETE | job | config name |
| `controllers/reconcileJobController.ts` | `toggleConfig` | TOGGLE | job | config name |
| `controllers/reconcileJobController.ts` | `triggerReconcile` | TRIGGER | job | config name |

| BE-09 | Tạo logCleanupService + cron | File: `backend/src/services/logCleanupService.ts`. Method `cleanup()`: DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '90 days'; DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '180 days'. Dùng `node-cron`: `cron.schedule('0 3 * * *', cleanup, { timezone: 'Asia/Ho_Chi_Minh' })`. Export function `init()`. Gọi từ `server.ts` sau khi DB connected (giống `schedulerService.init()`). Xử lý graceful shutdown. | S |

---

## FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| FE-01 | API client + types | File: `frontend/src/api/auditLogApi.ts`. Types: `AccessLog`, `AuditLog`, `AccessLogFilters`, `AuditLogFilters`, `PaginatedResult<T>`. Functions: `getAccessLogs(filters)`, `getAuditLogs(filters)` — gọi axiosClient.get với query params. | — | S |
| FE-02 | TanStack Query hooks | File: `frontend/src/hooks/useAuditLogs.ts`. `useAccessLogs(filters)`: queryKey `['audit-logs', 'access', filters]`, enabled khi tab active. `useAuditLogs(filters)`: queryKey `['audit-logs', 'audit', filters]`. staleTime: 30s (log thay đổi real-time). KeepPreviousData khi filter thay đổi để tránh flash loading. | — | S |
| FE-03 | AuditLogPage | File: `frontend/src/pages/admin/AuditLogPage.tsx`. Layout: header "Nhật ký hệ thống" + 2 tabs + conditional filter row + table + pagination. States: loading (skeleton table), empty, emptySearch, error, populated. Tab state quản lý bằng `useState<'access' | 'audit'>`. Khi đổi tab, reset filters. Dùng `useAccessLogs()` và `useAuditLogs()` hooks. Khi nhấn "Tìm kiếm", set filters → trigger refetch. Mỗi tab có filter row riêng (hiển thị conditional theo tab). Expandable row trong audit tab: dùng local state `expandedRows: Set<number>`. | Screen 1 | L |
| FE-04 | Status badge component | Tái dùng pattern Badge hiện có. Status code mapping: 2xx → green (success), 3xx → blue (redirect), 4xx → yellow (client error), 5xx → red (server error). Action badge: CREATE → blue, UPDATE → yellow, DELETE → red, LOGIN/LOGOUT → green, IMPORT/UPLOAD → purple. | Screen 1 | S |
| FE-05 | Router + Sidebar + i18n | `Router.tsx`: import AuditLogPage, thêm `<Route path="/logs" element={<AuditLogPage />} />`. `MainLayout.tsx`: import `FileText` từ lucide-react, thêm `'/logs'` vào `USER_SETTINGS_ROUTES`, thêm sub-item vào `userSettingsSubItems` với condition `hasPermission('logs.view')`. `i18n/vi.json`: thêm toàn bộ keys từ UI Spec Section 5. | Screen 1, Section 5, 6 | S |

---

## Thứ tự thực hiện khuyến nghị

```
BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06 → BE-07 → BE-08 → BE-09
FE-01 → FE-02 → FE-04 → FE-03 → FE-05
```

Frontend có thể bắt đầu sau BE-05 (khi API route đã sẵn sàng để test).

---

## Lưu ý kỹ thuật

1. **Fire-and-forget pattern**: Tất cả `auditService.logXxx()` phải dùng `setImmediate()` hoặc callback không await, giống hệt `userService.logActivity()`. Nếu INSERT fail, chỉ `console.error`, không throw, không ảnh hưởng đến business response.

2. **Middleware placement**: `auditMiddleware` cần chạy SAU `authenticateToken` để có `req.user`. Giải pháp đơn giản nhất: wrap tất cả route non-GET trong từng file route hoặc thêm 1 middleware trong `auth.ts` gọi `auditService.logAccess()` ngay sau khi xác thực thành công. Cách tối ưu: tạo `withAudit(router)` wrapper trong `auditMiddleware.ts`.

3. **Dynamic SQL for filters**: `getAccessLogs` và `getAuditLogs` phải build WHERE clause động dựa trên filters hiện có. Pattern: dùng parameterized query (`$1, $2, ...`) với mảng params được push dần. KHÔNG dùng string interpolation để tránh SQL injection.

4. **Username denormalization**: `audit_logs.username` được lưu tại thời điểm ghi log để khi user bị xóa sau này, log vẫn hiển thị được tên. Dùng `req.user.email` hoặc query `users.full_name`.

5. **No GET logging**: auditMiddleware chỉ log POST, PUT, DELETE, PATCH. GET requests bị bỏ qua hoàn toàn. Các public endpoint (register, login) vẫn được log vì là POST.

6. **Frontend pattern**: AuditLogPage khác với các page CRUD thông thường — đây là page read-only với 2 tab có filter khác nhau. Pattern gần giống `InvoiceMatchingPage` (tab-based) và `ReconcileJobPage` (log table). Expandable row trong audit tab dùng pattern từ `ReconcileJobPage`.

7. **Tab independence**: Khi user đang ở tab "Nhật ký thao tác" có filter active, nếu chuyển sang tab "Nhật ký truy cập" rồi quay lại, filter cũ có thể bị mất (tùy thiết kế). Recommened: reset filter khi đổi tab để đơn giản.

8. **Cron timezone**: `node-cron` hỗ trợ timezone option. Log cleanup chạy lúc 3:00 AM Asia/Ho_Chi_Minh (UTC+7).
