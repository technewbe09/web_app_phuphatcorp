# UI Spec: Danh mục xe

**Ngày:** 2026-06-16
**BA Doc:** docs/ba/20260616_vehicle-catalog-analysis.md

---

## 1. User Journey

### Happy Path — Upload Excel
```
1. User mở sidebar: "Quản lý danh mục" → click "Danh mục xe"
2. Hệ thống load bảng danh sách xe (nếu có dữ liệu) hoặc empty state
3. User click nút "Upload Excel"
4. Modal mở ra: dropzone kéo thả + link tải file mẫu
5. User kéo file .xlsx vào hoặc click chọn file
6. Frontend parse file client-side (xlsx lib):
   - Đọc sheet "xe"
   - Bỏ header row ("MA" / "SỐ XE")
   - Bỏ dòng rỗng
   - Chuẩn hóa biển số
   - Kiểm tra trùng trong file
   - Hiển thị preview: số dòng hợp lệ + danh sách lỗi (nếu có)
7. Nếu có lỗi → hiển thị bảng lỗi trong modal, nút "Upload" bị disable
8. Nếu không lỗi → nút "Upload" enabled
9. User click "Upload" → gửi file lên backend
10. Backend xử lý (chuẩn hóa + kiểm tra trùng DB) → trả kết quả
11. Thành công: toast "Đã import 42 xe", đóng modal, refresh bảng
12. Thất bại: hiển thị bảng lỗi từ backend trong modal
```

### Alternative Paths
```
- Empty state: Chưa có xe nào → hiển thị "Chưa có dữ liệu" + nút "Upload Excel" lớn ở giữa
- Search: Gõ vào ô search → filter bảng theo plate_number hoặc driver_name
- Pagination: >20 xe → phân trang
- Delete: Click icon xóa → dialog confirm → soft delete → toast + refresh
```

### Error Paths
```
- File không có sheet "xe" → toast error ngay sau parse
- File rỗng → thông báo "Không có dữ liệu hợp lệ"
- Backend lỗi 422 → hiển thị bảng lỗi trong modal (dừng lại, không đóng modal)
- Backend lỗi 500 → toast "Lỗi server, vui lòng thử lại"
- Mất kết nối → toast "Lỗi kết nối"
```

---

## 2. Screen Inventory

### Screen 1: VehicleCatalogPage (`/catalog/vehicles`)

**Layout:** MainLayout sidebar + content area, chuẩn `p-6 space-y-6`

| Zone | Component | Mô tả |
|------|-----------|-------|
| Header | `<h1>` + `<Button>` | Tiêu đề "Danh mục xe" + nút "Upload Excel" (icon Upload) |
| Toolbar | `<Card>` chứa `<Input>` | Ô search với placeholder "Tìm theo biển số hoặc tên tài xế..." |
| Table | `<Card>` chứa `<Table>` | Cột: STT, Biển số, Tên tài xế, Ngày tạo, Thao tác (Xóa) |
| Pagination | `<Pagination>` | Hiển thị khi total > limit |
| Empty state | Centered box | Icon + text, nút "Upload Excel" |

**States:**
| State | UI |
|-------|-----|
| Loading | Spinner/Skeleton trong vùng table |
| Empty (chưa có data) | Empty state box: "Chưa có xe nào. Upload Excel để bắt đầu." |
| Empty (search không có kết quả) | Text: "Không tìm thấy xe nào phù hợp." |
| Error | Alert box: "Không thể tải dữ liệu" + nút "Thử lại" |
| Normal (có data) | Table + Pagination |

### Modal 1: UploadVehiclesModal

| Zone | Component | Mô tả |
|------|-----------|-------|
| Overlay | Semi-transparent backdrop | Click outside → đóng |
| Container | `<Card>` centered, max-w-lg | |
| Header | Title + close button (X) | "Upload Excel — Danh mục xe" |
| Body (chưa chọn file) | Dropzone | "Kéo thả file .xlsx vào đây hoặc click để chọn" |
| Body (đã chọn file) | File info + Preview | Tên file, số dòng hợp lệ, bảng lỗi (nếu có) |
| Body (đang xử lý) | Spinner | "Đang upload và xử lý..." (nếu gửi lên backend) |
| Body (kết quả lỗi) | Error table | Hiển thị danh sách lỗi: dòng, biển số gốc, lý do |
| Footer | Buttons | "Hủy" + "Upload" (disabled nếu có lỗi hoặc chưa chọn file) |

**States:**
| State | Mô tả |
|-------|-------|
| idle | Dropzone hiển thị, chưa có file |
| file_selected | Hiển thị tên file, preview số dòng |
| parsing_error | Lỗi parse file (sheet không tồn tại, file rỗng) |
| preview_errors | Có lỗi trong file → hiển thị bảng lỗi, disable nút Upload |
| preview_ok | Không lỗi → hiển thị số dòng hợp lệ, enable nút Upload |
| uploading | Spinner, disable tất cả buttons |
| backend_errors | Backend trả 422 → hiển thị bảng lỗi, vẫn ở modal |
| success | Đóng modal (tự động) |

### Modal 2: DeleteVehicleDialog

| Zone | Component | Mô tả |
|------|-----------|-------|
| Overlay | Backdrop | |
| Container | Small `<Card>` centered | |
| Header | Icon cảnh báo + Title | "Xác nhận xóa" |
| Body | Text | "Bạn có chắc muốn xóa xe [plate_number]?" |
| Footer | 2 Buttons | "Hủy" (outline) + "Xóa" (danger) |

---

## 3. Component Checklist

| Component | Path | States cần có |
|-----------|------|---------------|
| VehicleCatalogPage | `frontend/src/pages/admin/catalog/VehicleCatalogPage.tsx` | loading, empty, empty-search, error, normal |
| UploadVehiclesModal | `frontend/src/components/catalog/UploadVehiclesModal.tsx` | idle, file_selected, parsing_error, preview_errors, preview_ok, uploading, backend_errors |
| DeleteVehicleDialog | `frontend/src/components/catalog/DeleteVehicleDialog.tsx` | idle, loading (khi đang xóa) |

---

## 4. Validation UX

| Loại lỗi | Hiển thị | Vị trí |
|----------|----------|--------|
| File sai định dạng (không phải .xlsx) | Toast error | Top-right |
| File không có sheet "xe" | Inline text đỏ trong modal body | Trong modal |
| Sheet "xe" rỗng | Inline text đỏ trong modal body | Trong modal |
| Biển số sai format (client parse) | Bảng lỗi trong modal | Trong modal body |
| Biển số trùng trong file | Bảng lỗi trong modal | Trong modal body |
| Backend validation fail (422) | Bảng lỗi trong modal | Trong modal body |
| Upload thành công | Toast success | Top-right |
| Xóa thành công | Toast success | Top-right |
| Lỗi server (500) | Toast error | Top-right |

---

## 5. i18n Keys (vi.json)

```json
{
  "catalog": {
    "menuTitle": "Quản lý danh mục",
    "vehicles": "Danh mục xe"
  },
  "vehicleCatalog": {
    "title": "Danh mục xe",
    "uploadExcel": "Upload Excel",
    "searchPlaceholder": "Tìm theo biển số hoặc tên tài xế...",
    "columns": {
      "stt": "STT",
      "plateNumber": "Biển số",
      "driverName": "Tên tài xế",
      "createdAt": "Ngày tạo",
      "actions": "Thao tác"
    },
    "empty": "Chưa có xe nào. Upload Excel để bắt đầu.",
    "noResults": "Không tìm thấy xe nào phù hợp.",
    "loadError": "Không thể tải dữ liệu.",
    "retry": "Thử lại",
    "delete": {
      "title": "Xác nhận xóa",
      "confirm": "Bạn có chắc muốn xóa xe {plateNumber}? Hành động này sẽ deactivate bản ghi.",
      "cancel": "Hủy",
      "submit": "Xóa",
      "success": "Đã xóa xe {plateNumber}."
    },
    "upload": {
      "title": "Upload Excel — Danh mục xe",
      "dropzone": "Kéo thả file .xlsx vào đây hoặc click để chọn",
      "onlyXlsx": "Chỉ chấp nhận file .xlsx, tối đa 10MB",
      "cancel": "Hủy",
      "upload": "Upload",
      "uploading": "Đang upload...",
      "success": "Đã import {imported} xe.",
      "successWithReactivate": "Đã import {imported} xe, kích hoạt lại {reactivated} xe.",
      "noData": "Không có dữ liệu hợp lệ trong sheet 'xe'.",
      "sheetNotFound": "Không tìm thấy sheet 'xe' trong file.",
      "parseError": "Không thể đọc file Excel. Vui lòng kiểm tra định dạng.",
      "serverError": "Lỗi server. Vui lòng thử lại.",
      "rowCount": "{count} xe hợp lệ",
      "errorCount": "{count} lỗi",
      "errorsTitle": "Có {count} lỗi — không có dữ liệu nào được lưu:",
      "errorColumns": {
        "row": "Dòng",
        "driverName": "Tài xế",
        "plateNumber": "Biển số gốc",
        "reason": "Lý do"
      },
      "errors": {
        "emptyPlate": "Biển số rỗng",
        "invalidFormat": "Biển số không đúng định dạng sau chuẩn hóa: {raw}",
        "duplicateInFile": "Biển số trùng với dòng {row}: {plate}",
        "duplicateInDb": "Biển số đã tồn tại: {plate}"
      }
    }
  }
}
```

---

## 6. Sidebar Integration

Thêm nhóm "Quản lý danh mục" mới trong `MainLayout.tsx`, ngay trước nhóm "Thiết lập người dùng":

```tsx
// Route prefix constant
const CATALOG_ROUTES = ['/catalog'];

// State
const [catalogOpen, setCatalogOpen] = useState(
  CATALOG_ROUTES.some((p) => location.pathname.startsWith(p)),
);

// Sub-items
const catalogSubItems = [
  { to: '/catalog/vehicles', icon: Car, label: t('catalog.vehicles') },
];

// Render (hiển thị cho mọi authenticated user, không cần permission gate riêng)
renderSubGroup(
  t('catalog.menuTitle'),
  BookOpen, // hoặc icon khác
  catalogSubItems,
  catalogOpen,
  () => setCatalogOpen((o) => !o),
  CATALOG_ROUTES.some((p) => location.pathname.startsWith(p)),
)
```
