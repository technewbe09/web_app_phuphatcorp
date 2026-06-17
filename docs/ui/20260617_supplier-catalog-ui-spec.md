# UI Spec: Danh mục nhà cung cấp

**Ngày:** 2026-06-17
**BA Doc:** docs/ba/20260617_supplier-catalog-analysis.md

---

## 1. User Journey

### Happy Path — Thêm mới NCC
```
1. User mở sidebar: "Quản lý danh mục" → click "Danh mục NCC"
2. Hệ thống load bảng danh sách NCC (nếu có dữ liệu) hoặc empty state
3. User click nút "Thêm mới"
4. Modal SupplierFormModal mở ra với form: Mã NCC*, Tên nhà máy*, Ghi chú
5. User điền thông tin → click "Thêm mới"
6. Backend validate, kiểm tra trùng mã → lưu DB
7. Toast success "Đã thêm nhà cung cấp.", đóng modal, refresh bảng
```

### Happy Path — Upload Excel
```
1. User click "Upload Excel"
2. Modal UploadSuppliersModal mở ra: dropzone + tải file mẫu
3. User kéo file .xlsx hoặc click chọn
4. Frontend parse: detect cột header → preview số dòng
5. User click "Import" → POST rows lên backend
6. Toast success "Đã import N nhà cung cấp thành công.", đóng modal, refresh bảng
```

### Other Paths
```
- Sửa: Click Pencil trên row → SupplierFormModal với data có sẵn → Save → PUT /api/suppliers/:id
- Xóa: Click Trash → DeleteSupplierDialog confirm → DELETE /api/suppliers/:id → soft delete
- Search: Gõ vào ô search → filter bảng theo supplier_code, name, notes
- Pagination: >20 records → phân trang
```

### Error Paths
```
- Mã NCC trùng (409) → toast error "Mã NCC đã tồn tại"
- Backend lỗi 500 → toast "Lỗi server, vui lòng thử lại"
- Upload lỗi validation → bảng lỗi trong modal (422)
- Mất kết nối → toast "Lỗi kết nối"
```

---

## 2. Screen Inventory

### Screen 1: SupplierCatalogPage (`/catalog/suppliers`)

**Layout:** MainLayout sidebar + content area, `p-6 space-y-6`

| Zone | Component | Mô tả |
|------|-----------|-------|
| Header | `<h1>` + 2 Buttons | "Danh mục nhà cung cấp" + nút "Upload Excel" (outline) + "Thêm mới" (primary) |
| Toolbar | `<Card>` chứa `<Input>` | Ô search "Tìm theo mã NCC hoặc tên nhà máy..." |
| Table | `<Card>` chứa `<Table>` | Cột: STT, Mã NCC, Tên nhà máy, Ghi chú, Ngày tạo, Thao tác (Sửa + Xóa) |
| Pagination | `<Pagination>` | Hiển thị khi total > limit |

**States:**
| State | UI |
|-------|-----|
| Loading | Skeleton rows trong vùng table |
| Empty (chưa có data) | Centered: "Chưa có nhà cung cấp nào" + nút "Thêm mới" |
| Empty (search) | Text: "Không tìm thấy nhà cung cấp nào phù hợp." |
| Error | AlertTriangle + text + nút "Thử lại" |
| Normal | Table + Pagination |

### Modal 1: SupplierFormModal

| Zone | Component | Mô tả |
|------|-----------|-------|
| Header | Title + close button | "Thêm nhà cung cấp" hoặc "Sửa nhà cung cấp" |
| Body | Form (react-hook-form + yup) | 3 fields: Mã NCC*, Tên nhà máy*, Ghi chú (textarea) |
| Footer | Buttons | "Hủy" (outline) + "Thêm mới"/"Lưu thay đổi" (primary) |

**States:**
| State | Mô tả |
|-------|-------|
| Create mode | Form rỗng, title "Thêm nhà cung cấp", button "Thêm mới" |
| Edit mode | Form điền sẵn data của supplier, title "Sửa nhà cung cấp", button "Lưu thay đổi" |
| Submitting | Button loading (spinner), form disabled |
| Validation error | Inline text đỏ dưới field |

### Modal 2: DeleteSupplierDialog

| Zone | Component | Mô tả |
|------|-----------|-------|
| Container | Small modal | |
| Header | Title | "Xác nhận xóa" |
| Body | Confirm text | "Bạn có chắc muốn xóa NCC {code} — {name}?" |
| Footer | Buttons | "Hủy" (outline) + "Xóa" (danger, loading) |

### Modal 3: UploadSuppliersModal

| Zone | Component | Mô tả |
|------|-----------|-------|
| Header | Title | "Import nhà cung cấp từ Excel" |
| Info box | Column guide | Cột bắt buộc: Mã NCC*, Tên nhà máy*, Ghi chú |
| Body | Dropzone | Kéo thả hoặc click chọn file .xlsx |
| Preview | File info + row count | Tên file + "{count} nhà cung cấp" + preview 3 dòng đầu |
| Error | Error table | Dòng, Mã NCC, Lý do (chỉ hiển thị khi có lỗi 422) |
| Template | Link download | "Tải file mẫu" |
| Footer | Buttons | "Hủy" + "Import" |

---

## 3. Component Checklist

| Component | Path | States |
|-----------|------|--------|
| SupplierCatalogPage | `frontend/src/pages/admin/catalog/SupplierCatalogPage.tsx` | loading, empty, empty-search, error, normal |
| SupplierFormModal | `frontend/src/components/catalog/SupplierFormModal.tsx` | create, edit, submitting, validation-error |
| DeleteSupplierDialog | `frontend/src/components/catalog/DeleteSupplierDialog.tsx` | idle, loading |
| UploadSuppliersModal | `frontend/src/components/catalog/UploadSuppliersModal.tsx` | idle, file_selected, parsing_error, uploading, backend_errors |

---

## 4. Validation UX

| Loại lỗi | Hiển thị | Vị trí |
|----------|----------|--------|
| Mã NCC rỗng | Inline text "Mã NCC là bắt buộc" | Dưới field |
| Tên nhà máy rỗng | Inline text "Tên nhà máy là bắt buộc" | Dưới field |
| Mã NCC trùng (409) | Toast error | Top-right |
| File không đúng cột | Text đỏ trong modal | Trong UploadSuppliersModal |
| Backend validation (422) | Bảng lỗi trong modal | Trong UploadSuppliersModal |
| Thành công (create/edit/delete/upload) | Toast success | Top-right |
| Lỗi server (500) | Toast error | Top-right |

---

## 5. i18n Keys

```json
{
  "catalog": {
    "menuTitle": "Quản lý danh mục",
    "vehicles": "Danh mục xe",
    "suppliers": "Danh mục NCC"
  }
}
```

Labels in-page are hardcoded Vietnamese (consistent với VehicleCatalogPage pattern).

---

## 6. Sidebar Integration

Thêm sub-item vào nhóm "Quản lý danh mục" hiện có trong `MainLayout.tsx`:

```tsx
const catalogSubItems = [
  { to: '/catalog/vehicles', icon: Car, label: t('catalog.vehicles') },
  { to: '/catalog/suppliers', icon: Factory, label: t('catalog.suppliers') },
];
```

Icon: `Factory` từ lucide-react. Nhóm "Quản lý danh mục" hiển thị cho mọi authenticated user (không permission gate).

---

## 7. File List (Implemented)

| Layer | File | Type |
|-------|------|------|
| BE Migration | `backend/src/migrations/018_create_suppliers.sql` | Create |
| BE Service | `backend/src/services/supplierService.ts` | Create |
| BE Controller | `backend/src/controllers/supplierController.ts` | Create |
| BE Route | `backend/src/routes/suppliers.ts` | Create |
| BE Index | `backend/src/routes/index.ts` | Modify |
| FE API | `frontend/src/api/supplierCatalogApi.ts` | Create |
| FE Hook | `frontend/src/hooks/useSupplierCatalog.ts` | Create |
| FE Page | `frontend/src/pages/admin/catalog/SupplierCatalogPage.tsx` | Create |
| FE Component | `frontend/src/components/catalog/SupplierFormModal.tsx` | Create |
| FE Component | `frontend/src/components/catalog/DeleteSupplierDialog.tsx` | Create |
| FE Component | `frontend/src/components/catalog/UploadSuppliersModal.tsx` | Create |
| FE Router | `frontend/src/Router.tsx` | Modify |
| FE Layout | `frontend/src/layouts/MainLayout.tsx` | Modify |
| FE i18n | `frontend/src/i18n/vi.json`, `en.json` | Modify |
