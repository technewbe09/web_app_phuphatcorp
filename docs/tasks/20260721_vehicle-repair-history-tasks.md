# Task List: Lịch sử Sửa xe

**Ngày:** 2026-07-21
**BA Doc:** docs/ba/20260721_vehicle-repair-history-analysis.md
**UI Spec:** docs/ui/20260721_vehicle-repair-history-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration `036_vehicle_repairs.sql` | Bảng `repair_records` (id, vehicle_id FK, repair_date, garage_name, total_amount, notes, status, created_by FK, created_at, updated_at) + bảng `repair_items` (id, repair_id FK ON DELETE CASCADE, item_name, parts_cost, labor_cost, created_at). Index trên vehicle_id, repair_date, status. Trigger update_updated_at. | S |
| BE-02 | Viết `repairService.ts` | CRUD: `listSummary` (CTE per-vehicle giống inspection summary), `listByVehicle`, `getById` (kèm items JOIN), `create` (transaction: insert record + insert items + update total_amount), `update` (transaction: update record + delete old items + insert new items + update total_amount), `softDelete`. Types: `RepairRecord`, `RepairItem`, `RepairInput`, `VehicleRepairSummary`. | M |
| BE-03 | Tạo `repairController.ts` + `vehicleRepairs.ts` | Controller: `listSummary`, `listByVehicle`, `getById`, `create`, `update`, `remove`. Validation schemas bằng express-validator (inline): `repairCreateSchema` (vehicle_id, repair_date, garage_name, items[] với item_name/parts_cost/labor_cost, notes optional, validate ít nhất 1 item), `repairUpdateSchema`. Route: `/api/vehicle-repairs` mount trong `routes/index.ts`, authenticate + requirePermission. | M |
| BE-04 | Đăng ký route trong `routes/index.ts` | Import + mount `vehicleRepairRoutes` tại `/api/vehicle-repairs`. | S |

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| FE-01 | Tạo `vehicleRepairApi.ts` + `useVehicleRepairs.ts` | API client: `fetchSummary`, `fetchByVehicle`, `fetchById`, `create`, `update`, `remove`. Types: `RepairRecord`, `RepairItem`, `VehicleRepairSummary`, `CreateRepairInput`, `UpdateRepairInput`. TanStack Query hooks: `useGetRepairSummary`, `useGetVehicleRepairs`, `useGetRepair`, `useCreateRepair`, `useUpdateRepair`, `useDeleteRepair`. | M |
| FE-02 | Tạo `RepairPage.tsx` | Trang tổng quan theo xe: search biển số/tài xế với dropdown autocomplete, bảng (STT, Biển số, Tài xế, Lần sửa gần nhất, Gara gần nhất, Tổng tiền đã sửa, Số lần sửa, Thao tác), pagination. 4 states: loading/empty/error/populated. Toast notifications. Actions: Thêm sửa xe, Xem chi tiết, Lịch sử. | M |
| FE-03 | Tạo `RepairFormModal.tsx` | Modal tạo/sửa/xem bill: vehicle select (disabled in edit), DateInput, garage_name Input, dynamic items list (mỗi item: item_name Input + parts_cost Input + labor_cost Input + nút xóa), auto-calc tổng tiền, notes textarea. View mode: tất cả disabled. Validation: required fields, items >= 1, amounts >= 0. Props: `isOpen`, `onClose`, `onSuccess`, `onError`, `repair?`, `repairId?` (view), `viewMode?`, `preselectedVehicleId?`. | L |
| FE-04 | Tạo `RepairHistoryModal.tsx` | Modal lịch sử bill của 1 xe: table (STT, Ngày sửa, Gara, Tổng tiền, Số hạng mục, Thao tác), footer tổng kết. Pagination. 4 states. Confirm dialog khi xóa. Actions: xem chi tiết, sửa, xóa. Props: `isOpen`, `onClose`, `vehicle`, `onError`. | M |
| FE-05 | Cập nhật `MainLayout.tsx` + `Router.tsx` | Sidebar: thêm sub-item "Lịch sử sửa xe" icon Wrench trong vehicleDataSubItems. Router: thêm route `/vehicle-data/repairs` → `RepairPage`. | S |

---

## 📊 Thứ tự thực hiện

| Phase | Tasks | Mô tả |
|-------|-------|-------|
| 3 | BE-01 → BE-02 → BE-03 → BE-04 | Backend implement |
| 4 | Run migration | Chạy migration lên DB |
| 5 | Viết tests | Unit + integration tests cho service và API |
| 6 | Chạy tests | Verify tests pass |
| 7 | FE-01 → FE-02 → FE-03 → FE-04 → FE-05 | Frontend implement |
| 8 | Regression | QA functional + đối chiếu UI Spec |

---

## ⚠️ Lưu ý kỹ thuật

- **Transaction bắt buộc** khi create/update repair record: phải insert/update cả record và items trong cùng 1 transaction.
- **total_amount denormalized**: lưu trong `repair_records.total_amount` để hiển thị nhanh, đồng bộ với SUM(parts_cost + labor_cost) của items khi CRUD.
- **PUT update items strategy**: xóa hết items cũ + insert lại danh sách mới trong transaction (đơn giản, tránh diff logic phức tạp).
- **express-validator pattern**: theo đúng pattern của inspection feature (validation schemas trong controller, không dùng Zod riêng).
- **No image upload**: khác với inspection, repair không có upload ảnh — đơn giản hơn.
- **Hardcode text**: theo pattern của inspection feature (hardcode tiếng Việt trực tiếp, không dùng i18n). Nếu muốn i18n thì thêm keys vào `vi.json`.
- **Permissions**: dùng lại `vehicle_data.view` / `vehicle_data.manage` đã có sẵn.
- **Soft delete**: UPDATE status='deleted', giữ nguyên items trong DB.
