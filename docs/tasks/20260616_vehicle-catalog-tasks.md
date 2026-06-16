# Task List: Danh mục xe

**Ngày:** 2026-06-16
**BA Doc:** docs/ba/20260616_vehicle-catalog-analysis.md
**UI Spec:** docs/ui/20260616_vehicle-catalog-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration | Bảng `vehicles`: id, plate_number VARCHAR(20) NOT NULL, driver_name VARCHAR(255) NOT NULL, status, created_at, updated_at. Unique partial index trên `plate_number WHERE status='active'`. File: `backend/src/migrations/017_create_vehicles.sql` | S |
| BE-02 | Viết service `vehicleService` | `getAll(search?, page, limit)` → trả { vehicles, total }. `upload(file: Buffer)` → parse sheet "xe" bằng `xlsx`, chuẩn hóa biển số (logic `normalizeSoXe()`: strip prefix non-digit, bỏ `[-,\s.]`, truncate `/`, uppercase; output `XXYXXXXX`), fail-fast validate (rỗng, pattern sai, trùng trong file, trùng DB active), INSERT hoặc re-activate (nếu đã deactive). `delete(id)` → soft delete. File: `backend/src/services/vehicleService.ts` | M |
| BE-03 | Viết controller `vehicleController` | `getAll(req, res)` parse query params + gọi service. `upload(req, res)` nhận file từ multer, gọi service, trả kết quả hoặc 422 + errors list. `delete(req, res)` parse id, gọi service. Validation dùng Zod. File: `backend/src/controllers/vehicleController.ts` | M |
| BE-04 | Tạo routes `vehicleRoutes` | `GET /` → getAll. `POST /upload` → multer.single('file') + upload. `DELETE /:id` → delete. Middleware: authenticateToken. File: `backend/src/routes/vehicles.ts` | S |
| BE-05 | Đăng ký routes vào index | Thêm `router.use('/vehicles', vehicleRoutes)` trong `backend/src/routes/index.ts` | S |

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| FE-01 | Tạo API module `vehicleCatalogApi` | `getAll(params)` → GET /vehicles. `upload(file: File)` → POST /vehicles/upload (FormData). `delete(id)` → DELETE /vehicles/:id. Types: Vehicle, VehicleListResponse, UploadResult, UploadError. File: `frontend/src/api/vehicleCatalogApi.ts` | — | S |
| FE-02 | Tạo hook `useVehicleCatalog` | `useVehicles(search, page, limit)` → useQuery. `useUploadVehicles()` → useMutation, invalidate query on success. `useDeleteVehicle()` → useMutation, invalidate on success. File: `frontend/src/hooks/useVehicleCatalog.ts` | — | S |
| FE-03 | Tạo page `VehicleCatalogPage` | Header + toolbar search + Table (loading/empty/error/normal states) + Pagination. Import pattern từ `CustomersPage.tsx`. File: `frontend/src/pages/admin/catalog/VehicleCatalogPage.tsx` | Screen 1 | M |
| FE-04 | Tạo component `UploadVehiclesModal` | Dropzone kéo thả, parse Excel client-side (xlsx lib, đọc sheet "xe"), chuẩn hóa biển số, kiểm tra trùng trong file, preview + bảng lỗi, gửi file lên backend. Import pattern từ `UploadCustomersModal.tsx`. File: `frontend/src/components/catalog/UploadVehiclesModal.tsx` | Modal 1 | M |
| FE-05 | Tạo component `DeleteVehicleDialog` | Confirm dialog → gọi deleteVehicle mutation. File: `frontend/src/components/catalog/DeleteVehicleDialog.tsx` | Modal 2 | S |
| FE-06 | Thêm route vào Router | Thêm `<Route path="/catalog/vehicles" element={<VehicleCatalogPage />} />` trong MainLayout block. File: `frontend/src/Router.tsx` | Screen 1 | S |
| FE-07 | Thêm sidebar group "Quản lý danh mục" | Thêm `CATALOG_ROUTES`, state `catalogOpen`, subItems `[{ to: '/catalog/vehicles', icon: Car, label: t('catalog.vehicles') }]`, render bằng `renderSubGroup`. Icon dùng `FolderOpen` từ lucide-react. File: `frontend/src/layouts/MainLayout.tsx` | Section 6 | S |
| FE-08 | Thêm i18n keys | Thêm `catalog` và `vehicleCatalog` vào `vi.json` và `en.json` theo UI Spec Section 5. File: `frontend/src/i18n/vi.json`, `frontend/src/i18n/en.json` | Section 5 | S |

## 📊 Thứ tự thực hiện

```
Phase BE: BE-01 → BE-02 → BE-03 → BE-04 → BE-05
Phase FE: FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07 → FE-08
```

BE và FE có thể làm song song sau khi BE-01 hoàn tất (có schema để FE mock/reference).

## ⚠️ Lưu ý kỹ thuật

1. **Chuẩn hóa biển số:** Logic chuẩn hóa phải giống hệt giữa frontend (preview) và backend (lưu DB). Tham khảo `driverInvoiceService.normalizeSoXe()`: strip prefix non-digit → bỏ `[-,\s.]` → truncate `/` → uppercase. Output format: `XXYXXXXX` (e.g. `50H70216`).

2. **Fail-fast atomic upload:** Backend dùng transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) khi import. Nếu bất kỳ dòng nào lỗi → ROLLBACK toàn bộ.

3. **Partial unique index:** `WHERE status = 'active'` đảm bảo chỉ unique trong active records. Xe đã deactive có thể upload lại (re-activate).

4. **Multer config:** memoryStorage, limit 10MB, filter `.xlsx` MIME type + extension. Pattern từ `backend/src/routes/deliveryData.ts`.

5. **Sidebar icon:** "Quản lý danh mục" có thể dùng icon `FolderOpen` từ lucide-react (đã import sẵn trong codebase hay chưa cần kiểm tra). Nếu chưa có, thêm import.

6. **Permission:** Không cần permission mới. Tất cả authenticated user đều xem được "Quản lý danh mục" (giống như "Xử lý Data Giao Hàng"). Nếu sau này cần phân quyền, sẽ thêm permission `catalog.view` / `catalog.manage`.

7. **Pagination:** Dùng chung component `<Pagination>` có sẵn trong `frontend/src/components/ui/Pagination.tsx`.
