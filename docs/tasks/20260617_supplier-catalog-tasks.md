# Task List: Danh mục nhà cung cấp

**Ngày:** 2026-06-17
**BA Doc:** docs/ba/20260617_supplier-catalog-analysis.md
**UI Spec:** docs/ui/20260617_supplier-catalog-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration | Bảng `suppliers`: id, supplier_code VARCHAR(20) NOT NULL, name VARCHAR(255) NOT NULL, notes TEXT, status, timestamps. Unique partial index `idx_suppliers_code_active` trên `supplier_code WHERE status='active'`. Indexes trên status và name. Trigger auto-update updated_at. File: `backend/src/migrations/018_create_suppliers.sql` | S |
| BE-02 | Viết service `supplierService` | `list(search?, page, limit)` → paginated list + search ILIKE trên 3 cột. `findById(id)`, `findByCode(code, excludeId?)` → check trùng. `create(data)`, `update(id, data)`, `softDelete(id)` → full CRUD. `uploadMany(rows)` → batch INSERT trong transaction. File: `backend/src/services/supplierService.ts` | M |
| BE-03 | Viết controller `supplierController` | Validation schemas: `supplierCreateSchema`, `supplierUpdateSchema`, `supplierDeleteSchema`, `supplierUploadSchema`. Handlers: `list`, `create` (check duplicate code 409), `update` (check duplicate + NOT_FOUND 404), `remove` (NOT_FOUND 404), `upload` (422 cho lỗi validation). File: `backend/src/controllers/supplierController.ts` | M |
| BE-04 | Tạo routes `supplierRoutes` | `GET /` → list (public auth). `POST /` → create. `PUT /:id` → update. `DELETE /:id` → remove. `POST /upload` → upload JSON rows. Middleware: authenticateToken. File: `backend/src/routes/suppliers.ts` | S |
| BE-05 | Đăng ký routes vào index | Thêm `router.use('/suppliers', supplierRoutes)` trong `backend/src/routes/index.ts` | S |

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| FE-01 | Tạo API module `supplierCatalogApi` | Types: Supplier, SupplierData, SupplierListResponse, UploadSupplierRow, SupplierUploadError. API: fetchAll, create, update, delete, upload. File: `frontend/src/api/supplierCatalogApi.ts` | S |
| FE-02 | Tạo hook `useSupplierCatalog` | `useGetSuppliers(search, page, limit)` → useQuery. `useCreateSupplier`, `useUpdateSupplier`, `useDeleteSupplier`, `useUploadSuppliers` → useMutation + invalidate. File: `frontend/src/hooks/useSupplierCatalog.ts` | S |
| FE-03 | Tạo page `SupplierCatalogPage` | Header (title + Upload + Thêm mới), search toolbar, Table (STT, Mã NCC, Tên nhà máy, Ghi chú, Ngày tạo, Thao tác), Pagination. States: loading/empty/error/normal. Sibling pattern của VehicleCatalogPage. File: `frontend/src/pages/admin/catalog/SupplierCatalogPage.tsx` | M |
| FE-04 | Tạo component `SupplierFormModal` | Dùng chung cho Create + Edit. react-hook-form + yup validation. Fields: supplier_code*, name*, notes (textarea). Check duplicate 409 → toast error. File: `frontend/src/components/catalog/SupplierFormModal.tsx` | M |
| FE-05 | Tạo component `DeleteSupplierDialog` | Confirm dialog → gọi delete mutation → toast + refresh. File: `frontend/src/components/catalog/DeleteSupplierDialog.tsx` | S |
| FE-06 | Tạo component `UploadSuppliersModal` | Dropzone kéo thả, parse Excel client-side (xlsx lib), detect cột header linh hoạt (Mã NCC, Tên nhà máy, Ghi chú), preview + error table, generate template download. Pattern: UploadCustomersModal. File: `frontend/src/components/catalog/UploadSuppliersModal.tsx` | M |
| FE-07 | Thêm route vào Router | `<Route path="/catalog/suppliers" element={<SupplierCatalogPage />} />` trong MainLayout block. File: `frontend/src/Router.tsx` | S |
| FE-08 | Thêm menu item vào sidebar | Thêm `{ to: '/catalog/suppliers', icon: Factory, label: t('catalog.suppliers') }` vào `catalogSubItems` trong MainLayout. Import icon `Factory` từ lucide-react. File: `frontend/src/layouts/MainLayout.tsx` | S |
| FE-09 | Thêm i18n keys | Thêm `"suppliers": "Danh mục NCC"` vào `catalog` section trong `vi.json` và `en.json`. File: `frontend/src/i18n/vi.json`, `en.json` | S |

## 📊 Thứ tự thực hiện

```
Phase BE: BE-01 → BE-02 → BE-03 → BE-04 → BE-05
Phase FE: FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07 → FE-08 → FE-09
```

## ⚠️ Lưu ý kỹ thuật

1. **Import path depth:** Page ở `src/pages/admin/catalog/` cần `../../../` để reach `src/` (3 levels up). Bug ban đầu dùng `../../` gây lỗi resolve import.
2. **Duplicate code check:** Controller gọi `findByCode` trước khi create/update để trả 409.
3. **Partial unique index:** `WHERE status = 'active'` cho phép re-use mã NCC sau khi deactive.
4. **Permission:** Không cần permission mới. Nhóm "Quản lý danh mục" hiển thị cho mọi authenticated user.
5. **Form modal tái sử dụng:** Cùng 1 SupplierFormModal cho cả create và edit, dùng prop `supplier` để phân biệt mode.
6. **Upload pattern:** Không upload file trực tiếp (như vehicles) mà parse client-side rồi POST JSON array (như customers). Dùng multer không cần thiết.

---

## 📋 Bug Fix Record

| Bug | File | Fix |
|-----|------|-----|
| Import resolve lỗi `../../components/ui/Pagination` | `SupplierCatalogPage.tsx` | Sửa `../../` → `../../../` (9 import paths) |
