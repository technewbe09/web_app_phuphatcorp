# Task List: Quản lý Đăng kiểm & Lịch sử Thay nhớt

**Ngày:** 2026-06-21
**BA Doc:** docs/ba/20260621_vehicle-inspection-oil-change-analysis.md
**UI Spec:** (inline — Phase 1.5 output)

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| **BE-01** | Migration: inspection_records + images + oil_change_records + alter vehicles | File: `backend/src/migrations/031_vehicle_inspection_oil_change.sql`. 3 bảng mới: `inspection_records` (vehicle_id FK, inspection_date DATE, expiry_date DATE, notes TEXT, status CHECK active/expired/superseded/deleted), `inspection_images` (inspection_id FK CASCADE, filename, original_filename, file_path, file_size, mime_type, created_at), `oil_change_records` (vehicle_id FK, change_date DATE, odometer_at NUMERIC(10,1), oil_type VARCHAR(100), notes TEXT, status CHECK active/deleted). ALTER vehicles ADD oil_change_interval_km INTEGER DEFAULT 5000. Tất cả có created_at, updated_at + trigger updated_at. Indexes: vehicle_id, expiry_date, status. | M |
| **BE-02** | Migration: seed vehicle_data permissions | File: `backend/src/migrations/032_seed_vehicle_data_permissions.sql`. INSERT `vehicle_data.view` + `vehicle_data.manage` vào permissions. Gán cho ADMIN (cả 2), ACCOUNTANT (cả 2), VIEWER (chỉ view). Pattern giống 029_seed_fuel_permissions.sql. | S |
| **BE-03** | Service: inspectionService.ts | File: `backend/src/services/inspectionService.ts`. Pattern giống vehicleService. Methods: `listAll({ vehicle_id?, status?, page, limit })` — JOIN vehicles lấy plate_number/driver_name, filter status (active/expired/superseded/all, mặc định loại trừ deleted), search theo plate_number; `getById(id)` — kèm images; `create({ vehicle_id, inspection_date, expiry_date, notes, userId })` — nếu xe đã có active inspection → UPDATE set status='superseded'; `update(id, data)`; `softDelete(id)` → status='deleted'; `getExpiring(days=30)` — expiry_date ≤ NOW() + days AND status='active'; `addImage(inspectionId, file)` — lưu disk vào uploads/inspection-images/, insert inspection_images; `deleteImage(imageId)`. | L |
| **BE-04** | Service: oilChangeService.ts | File: `backend/src/services/oilChangeService.ts`. Methods: `listAll({ vehicle_id?, page, limit })` — JOIN vehicles; `getById(id)`; `create({ vehicle_id, change_date, odometer_at, oil_type, notes, userId })`; `update(id, data)`; `softDelete(id)` → status='deleted'; `getDueVehicles()` — query phức tạp: lấy tất cả xe active, JOIN với MAX(oil_change_records.odometer_at) WHERE status='active' làm last_change_km, JOIN với MAX(fuel_records.odometer_new) làm current_km, tính km_since_change, so sánh với oil_change_interval_km. Phân loại status: 'overdue' (đã vượt), 'due_soon' (≥80%), 'ok', 'no_data' (không có fuel_record). | L |
| **BE-05** | Service: cập nhật vehicleService — updateInterval | Thêm method `updateOilInterval(id, intervalKm)` vào `vehicleService.ts` — UPDATE vehicles SET oil_change_interval_km = $2 WHERE id = $1, throw NOT_FOUND nếu không tồn tại. | S |
| **BE-06** | Controller: inspectionController.ts | File: `backend/src/controllers/inspectionController.ts`. Pattern giống vehicleController. Hàm: `list`, `getById`, `create`, `update`, `remove`, `getExpiring`, `uploadImage`, `deleteImage`. Validation schemas: `inspectionCreateSchema` (vehicle_id required int, inspection_date required date, expiry_date required date > inspection_date), `inspectionUpdateSchema` (các field optional). Log audit cho CREATE/UPDATE/DELETE. | M |
| **BE-07** | Controller: oilChangeController.ts | File: `backend/src/controllers/oilChangeController.ts`. Hàm: `list`, `getById`, `create`, `update`, `remove`, `getDue`. Validation schemas: `oilChangeCreateSchema` (vehicle_id required int, change_date required, odometer_at required ≥0). Log audit. | M |
| **BE-08** | Controller: cập nhật vehicleController — updateInterval | Thêm method `updateOilInterval(req, res)` vào vehicleController. Validation: param id int, body oil_change_interval_km required int ≥ 0. Log audit UPDATE. | S |
| **BE-09** | Routes: vehicleInspections.ts + vehicleOilChanges.ts + cập nhật vehicles.ts | File `routes/vehicleInspections.ts`: GET /, GET /expiring, GET /:id, POST /, PUT /:id, DELETE /:id, POST /:id/images (multer diskStorage uploads/inspection-images/), DELETE /:id/images/:imageId. File `routes/vehicleOilChanges.ts`: GET /, GET /due, GET /:id, POST /, PUT /:id, DELETE /:id. Cập nhật `routes/vehicles.ts`: thêm PUT /:id/oil-interval. Tất cả có authenticateToken + requirePermission. | M |
| **BE-10** | Routes: đăng ký routes vào index.ts | Thêm `router.use('/vehicle-inspections', vehicleInspectionRoutes)` và `router.use('/vehicle-oil-changes', vehicleOilChangeRoutes)` vào `routes/index.ts`. | S |

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| **FE-01** | API layer: vehicleInspectionApi.ts | File: `frontend/src/api/vehicleInspectionApi.ts`. Pattern giống fuelRecordApi. Interface: `InspectionRecord` (id, vehicle_id, plate_number?, driver_name?, inspection_date, expiry_date, notes, status, images, created_at, updated_at), `InspectionImage`. Methods: `fetchAll(params)`, `fetchById(id)`, `create(data)`, `update(id, data)`, `remove(id)`, `fetchExpiring(days?)`, `uploadImage(id, file)`, `deleteImage(id, imageId)`. | Screen 1 | M |
| **FE-02** | API layer: vehicleOilChangeApi.ts | File: `frontend/src/api/vehicleOilChangeApi.ts`. Interface: `OilChangeRecord` (id, vehicle_id, plate_number?, driver_name?, change_date, odometer_at, oil_type, notes, status), `OilChangeDueVehicle` (vehicle_id, plate_number, driver_name, last_oil_change_date, last_oil_change_km, current_km, interval_km, km_since_change, km_overdue, status). Methods: `fetchAll(params)`, `fetchById(id)`, `create(data)`, `update(id, data)`, `remove(id)`, `fetchDue()`, `updateInterval(vehicleId, intervalKm)`. | Screen 2 | M |
| **FE-03** | Hooks: useVehicleInspections.ts | File: `frontend/src/hooks/useVehicleInspections.ts`. Pattern giống useVehicleCatalog.ts. `useGetInspections(params)`, `useGetExpiringInspections(days)`, `useCreateInspection()`, `useUpdateInspection()`, `useDeleteInspection()`, `useUploadInspectionImage()`, `useDeleteInspectionImage()`. QUERY_KEY = ['inspections']. | Screen 1 | M |
| **FE-04** | Hooks: useVehicleOilChanges.ts | File: `frontend/src/hooks/useVehicleOilChanges.ts`. `useGetOilChanges(params)`, `useGetDueVehicles()`, `useCreateOilChange()`, `useUpdateOilChange()`, `useDeleteOilChange()`, `useUpdateOilInterval()`. QUERY_KEY = ['oilChanges']. | Screen 2 | M |
| **FE-05** | Page: InspectionPage.tsx | File: `frontend/src/pages/admin/vehicle-data/InspectionPage.tsx`. Pattern giống VehicleCatalogPage. States: loading (skeleton 5 dòng), empty, error + retry, populated. Filter: search input (plate_number), status select (all/active/expired/expiring/superseded). Pagination. Table columns: STT, Biển số, Tài xế, Ngày ĐK, Ngày HH, Trạng thái (badge màu), Thao tác (edit/delete). Toast notification. Vehicle select combobox lấy từ useGetVehicles hook. | Screen 1 | L |
| **FE-06** | Modal: InspectionFormModal.tsx | File: `frontend/src/components/vehicle-data/InspectionFormModal.tsx`. Pattern giống VehicleFormModal. Dual-mode create/edit. Fields: vehicle select (dropdown search, required), inspection_date (date input, required), expiry_date (date input, required, validate > inspection_date), notes (textarea), image upload zone (drag-drop + click, preview thumbnails với nút X xóa). Size="lg" (có ảnh). Khi edit: pre-fill, hiển thị ảnh hiện có. Khi tạo + xe đã có active inspection: hiển thị info box "Xe này đã có đăng kiểm còn hạn đến DD/MM/YYYY". Field errors inline. Toast callback. | Screen 2 | L |
| **FE-07** | Component: InspectionImagePreview.tsx | File: `frontend/src/components/vehicle-data/InspectionImagePreview.tsx`. Component nhỏ: hiển thị grid ảnh thumbnail (max-h 120px), click phóng to (dùng modal con hoặc dialog), nút X xóa từng ảnh (confirm?). Upload zone: drag-drop hoặc click chọn file, validate size ≤ 10MB, type image/*. Hiển thị file đang upload với progress (nếu có). | Screen 2 | M |
| **FE-08** | Page: OilChangePage.tsx | File: `frontend/src/pages/admin/vehicle-data/OilChangePage.tsx`. 2 pill tabs (pattern giống FuelStatisticsPage): "Lịch sử thay nhớt" + "Xe cần thay nhớt". Tab 1: filter xe dropdown + date range + table + pagination + nút [+ Thêm]. Tab 2: table xe cần thay nhớt (sorted: overdue → due_soon → ok → no_data), badge màu, nút [Thiết lập] mở OilIntervalModal. States: loading/empty/error/populated cho cả 2 tab. | Screen 3 | L |
| **FE-09** | Modal: OilChangeFormModal.tsx | File: `frontend/src/components/vehicle-data/OilChangeFormModal.tsx`. Dual-mode create/edit. Fields: vehicle select (required), change_date (required), odometer_at (required, number input, ≥ 0), oil_type (select: "15W-40", "20W-50", "Khác" → hiện text input), notes (textarea). Size="md". | Screen 4 | M |
| **FE-10** | Modal: OilIntervalModal.tsx | File: `frontend/src/components/vehicle-data/OilIntervalModal.tsx`. Hiển thị thông tin xe (plate_number, driver_name), input number cho interval km (pre-fill giá trị hiện tại, step=1000, min=0, default=5000), helper text "Mặc định: 5000km". Size="sm". | Screen 5 | S |
| **FE-11** | Router + Sidebar: cập nhật route & menu | Cập nhật `Router.tsx`: thêm 2 routes `/vehicle-data/inspections` → `InspectionPage`, `/vehicle-data/oil-changes` → `OilChangePage`. Cập nhật `MainLayout.tsx`: thêm 2 sub-items vào `vehicleDataSubItems`: `{ to: '/vehicle-data/inspections', icon: ClipboardCheck, label: 'Quản lý đăng kiểm' }`, `{ to: '/vehicle-data/oil-changes', icon: Beaker, label: 'Quản lý thay nhớt' }`. | — | S |
| **FE-12** | i18n: cập nhật locale keys | Thêm toàn bộ keys từ UI Spec section 5 vào file i18n (nếu có), hoặc hardcode Vietnamese text theo pattern hiện tại (codebase dùng text trực tiếp cho phần lớn label). | — | S |

---

## 📊 Thứ tự thực hiện

```
Phase BE:
  BE-01 → BE-02 → BE-03 → BE-04 → BE-05
       ↘ BE-06 → BE-07 → BE-08
                       ↘ BE-09 → BE-10

Phase FE:
  FE-01 → FE-02 → FE-03 → FE-04
       ↘ FE-07 (component nhỏ, dùng chung)
       ↘ FE-06 → FE-05
       ↘ FE-09 → FE-10 → FE-08
                              ↘ FE-11 → FE-12
```

**Có thể chạy song song:** BE-03/BE-04 (2 service độc lập), FE-01/FE-02 (2 API layer), FE-06/FE-09 (2 modal).

---

## ⚠️ Lưu ý kỹ thuật

### Backend
- **Image upload**: Lưu disk vào `uploads/inspection-images/`, pattern giống `fuelRecords.ts` route (diskStorage + multer). Đảm bảo `fs.mkdirSync` khi khởi tạo.
- **Status auto-calc**: `inspection_records.status` có thể được tính động ở query thay vì lưu cứng — nhưng để đơn giản, lưu cứng + cập nhật khi thay đổi (thêm mới thì set active, cron job hoặc trigger set expired khi ngày đến).
- **oilChangeService.getDueVehicles()**: Query JOIN 3 bảng (vehicles + oil_change_records + fuel_records), dùng subquery hoặc CTE để tính MAX values. Tránh N+1.
- **Permission**: `vehicle_data.view` / `vehicle_data.manage` là permissions MỚI, sẽ được thêm vào JWT payload qua query permission trong middleware auth (đã tự động load từ DB dựa trên role).
- **Audit log**: Mọi CREATE/UPDATE/DELETE phải gọi `auditService.logAudit()` với entityType = 'inspection' | 'oil_change'.

### Frontend
- **Vehicle select**: Dùng `useGetVehicles()` hook để fetch danh sách xe cho dropdown. Có thể render `<select>` với search/filter, hoặc dùng Combobox nếu danh sách dài.
- **Image preview**: Pattern giống fuel record images — fetch ảnh qua API, hiển thị thumbnail, click phóng to. Dùng URL từ `file_path` (cần serve static qua Express `express.static` hoặc API endpoint riêng).
- **Date input**: Dùng `<input type="date">` native, format về ISO trước khi gửi API. Hiển thị dùng `toLocaleDateString('vi-VN')`.
- **Pill tabs**: Pattern từ FuelStatisticsPage — `flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit`, active tab `bg-white shadow-sm`.
- **Toast**: Pattern từ VehicleCatalogPage — `fixed top-4 right-4 z-[100]`, tự động biến mất sau 4s.
- **Confirm dialog**: Trước delete inspection/oil-change, dùng `window.confirm()` hoặc custom dialog nhỏ.
