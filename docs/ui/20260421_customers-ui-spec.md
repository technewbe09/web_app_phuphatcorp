# UI Spec: Danh sách khách nhận hàng (Customers)

**Ngày:** 2026-04-21
**BA Doc:** docs/ba/20260421_customers-analysis.md
**Module:** Quản lý dữ liệu kế toán → Danh sách khách nhận hàng

---

## Section 1 — User Journey

### Happy Path
```
User → Sidebar "Danh sách khách nhận hàng"
  → CustomersPage load (skeleton)
  → Danh sách hiện ra (table rows)
  → [Option A] Click "Thêm mới" → CreateCustomerModal → Điền form → Submit → Toast success → List refresh
  → [Option B] Click "Import Excel" → UploadCustomersModal → Chọn file → Preview → Upload → Toast success
  → [Option C] Click icon Sửa trên row → EditCustomerModal → Chỉnh sửa → Submit → Toast success
  → [Option D] Click icon Xóa trên row → DeleteCustomerDialog → Confirm → Toast success
```

### Alternative Paths
```
- Search: Nhập text vào search box → filter realtime phía client (không gọi API)
- Filter tuyến: Select dropdown → filter realtime
- Upload có lỗi → UploadCustomersModal hiển thị danh sách lỗi → User đóng modal, sửa file, upload lại
```

### Error Paths
```
- API down → loading state → error state với nút "Thử lại"
- Duplicate diem_tra_hang → Toast error "Điểm trả hàng đã tồn tại"
- File không phải .xlsx → hiện inline error trong upload modal
- File rỗng → hiện inline error "File không có dữ liệu"
```

---

## Section 2 — Screen Inventory

### Screen 1: CustomersPage

**Route:** `/accounting-data/customers`
**Permission:** `accounting_data.view`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Page Header]                                               │
│ Danh sách khách nhận hàng                                   │
│                                                             │
│ [Toolbar]                                                   │
│ [🔍 Search...          ] [Tuyến ▼]  [+ Thêm mới] [↑ Import]│
│                                                             │
│ [Table]                                                     │
│ STT │ Điểm trả hàng │ Tên khách hàng │ Tuyến-phường │ Tuyến-cũ │ Bốc xếp │ Hành động │
│ 1   │ Acecook VN    │ CÔNG TY CP...  │ HCM - Tây... │ TP, HCM   │ ✕       │ [✏️][🗑️]  │
│ 2   │ Aeon BT       │ CÔNG TY TNHH.. │ HCM - An L.. │ TP, HCM   │ ✓       │ [✏️][🗑️]  │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- **Loading:** Skeleton table (5 rows)
- **Empty (no data):** Icon + "Chưa có khách hàng nào" + Button "Thêm mới"
- **Empty (search no results):** Icon + "Không tìm thấy khách hàng nào"
- **Error:** Icon + "Không thể tải danh sách" + Button "Thử lại"
- **Success:** Table hiển thị dữ liệu

**Actions:**
- `accounting_data.manage`: hiển thị nút "Thêm mới", "Import Excel", icons Sửa/Xóa
- `accounting_data.view` only: ẩn tất cả nút action

**Columns:**
| Col | Header | Width | Notes |
|-----|--------|-------|-------|
| STT | STT | 60px | 1-based index |
| diem_tra_hang | Điểm trả hàng | 200px | truncate với tooltip |
| ten_khach_hang | Tên khách hàng | 300px | truncate với tooltip |
| tuyen_phuong | Tuyến-phường | 200px | truncate |
| tuyen_cu | Tuyến-cũ | 150px | — |
| boc_xep | Bốc xếp | 80px | ✓ (có) / ✕ (không), centered |
| Actions | Hành động | 80px | icon buttons |

---

### Screen 2: CreateCustomerModal

**Trigger:** Click "Thêm mới"
**Width:** max-w-lg

**Layout:**
```
┌──────────────────────────────────────┐
│ Thêm khách hàng mới            [✕]  │
├──────────────────────────────────────┤
│ Điểm trả hàng *                     │
│ [                              ]    │
│                                     │
│ Tên khách hàng *                    │
│ [                              ]    │
│                                     │
│ Tuyến-phường                        │
│ [                              ]    │
│                                     │
│ Tuyến-cũ                            │
│ [                              ]    │
│                                     │
│ Địa chỉ giao hàng                   │
│ [                              ]    │
│ [                              ]    │  (textarea 2 rows)
│                                     │
│ [☐] Có bốc xếp                     │
├──────────────────────────────────────┤
│                    [Hủy]  [Thêm mới]│
└──────────────────────────────────────┘
```

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| diem_tra_hang | Input text | ✓ | Không được rỗng |
| ten_khach_hang | Input text | ✓ | Không được rỗng |
| tuyen_phuong | Input text | — | — |
| tuyen_cu | Input text | — | — |
| dia_chi_giao_hang | Textarea | — | — |
| boc_xep | Checkbox | — | Default: checked (true = có bốc xếp) |

**States:**
- Submit button disabled khi form invalid hoặc đang submitting
- Submit button show spinner khi submitting
- Lỗi validation: inline dưới field
- Lỗi 409 duplicate: Toast error

---

### Screen 3: EditCustomerModal

**Trigger:** Click icon Sửa trên row
**Width:** max-w-lg
**Layout:** Giống CreateCustomerModal, title = "Chỉnh sửa khách hàng"
**Pre-fill:** Tất cả fields với dữ liệu hiện tại
**States:** Như CreateCustomerModal

---

### Screen 4: DeleteCustomerDialog

**Trigger:** Click icon Xóa trên row

**Layout:**
```
┌──────────────────────────────────────┐
│ Xóa khách hàng                 [✕]  │
├──────────────────────────────────────┤
│ ⚠️  Bạn có chắc muốn xóa khách hàng │
│    "Acecook Việt Nam" không?         │
│                                     │
│ Hành động này không thể hoàn tác.   │
├──────────────────────────────────────┤
│                    [Hủy]  [Xóa]     │
└──────────────────────────────────────┘
```

**States:**
- Nút "Xóa" màu đỏ (`variant="destructive"`)
- Nút "Xóa" disabled + spinner khi đang xử lý

---

### Screen 5: UploadCustomersModal

**Trigger:** Click "Import Excel"
**Width:** max-w-xl

**Step 1 — Chọn file:**
```
┌──────────────────────────────────────┐
│ Import khách hàng từ Excel     [✕]  │
├──────────────────────────────────────┤
│ Định dạng file: .xlsx               │
│                                     │
│ Cột bắt buộc (theo đúng thứ tự):   │
│ • Điểm trả hàng (cột 1)            │
│ • Tuyến-phường (cột 2)             │
│ • Tuyến-cũ (cột 3)                 │
│ • [bỏ qua] (cột 4)                 │
│ • Tên khách hàng (cột 5)           │
│ • Địa chỉ giao hàng (cột 6)        │
│ • Bốc xếp (cột 7)                  │
│                                     │
│ [📂 Chọn file .xlsx          ]      │
│                                     │
│ [Tải file mẫu]                      │
├──────────────────────────────────────┤
│                    [Hủy]  [Tiếp →]  │
└──────────────────────────────────────┘
```

**Step 2 — Preview & Xác nhận:**
```
┌──────────────────────────────────────┐
│ Import khách hàng từ Excel     [✕]  │
├──────────────────────────────────────┤
│ ✅ File hợp lệ: filename.xlsx        │
│ Phát hiện 6 khách hàng cần import  │
│                                     │
│ [Xem trước 3 dòng đầu...]           │
│  - Acecook Việt Nam                 │
│  - Aeon Bình Tân                    │
│  - Aeon Citimart                    │
├──────────────────────────────────────┤
│               [← Quay lại]  [Upload]│
└──────────────────────────────────────┘
```

**Step 3a — Upload thành công:**
```
│ ✅ Import thành công!               │
│ Đã thêm 6 khách hàng mới           │
```

**Step 3b — Upload có lỗi:**
```
│ ❌ Import thất bại                  │
│                                     │
│ Danh sách lỗi:                      │
│ • Dòng 3: Điểm trả hàng "Aeon BT"  │
│   đã tồn tại trong hệ thống        │
│ • Dòng 5: Thiếu tên khách hàng     │
│                                     │
│ Vui lòng sửa file và upload lại    │
```

---

## Section 3 — Component Checklist

| Component | States bắt buộc | Notes |
|-----------|----------------|-------|
| CustomersPage | loading (skeleton), empty (no data), empty (no results), error, success | Filter search + tuyen realtime |
| CreateCustomerModal | idle, submitting, error (inline + toast) | — |
| EditCustomerModal | idle, submitting, error (inline + toast) | Pre-fill data |
| DeleteCustomerDialog | idle, deleting, error | Tên KH trong confirm text |
| UploadCustomersModal | step1, step2 (preview), uploading, success, error (lỗi từng dòng) | — |

---

## Section 4 — Validation UX

| Scenario | Hiển thị |
|----------|----------|
| Field required rỗng | Inline dưới field, màu đỏ |
| Submit form invalid | Submit button disabled |
| API 409 duplicate | Toast error: "Điểm trả hàng đã tồn tại" |
| API 404 not found | Toast error: "Không tìm thấy khách hàng" |
| Tạo/Sửa/Xóa thành công | Toast success |
| Upload thành công | Toast success: "Đã import X khách hàng" |
| Upload fail | Hiển thị danh sách lỗi trong modal (không toast) |
| Upload file sai định dạng | Inline error trong modal |
| Upload file rỗng | Inline error trong modal |

---

## Section 5 — i18n Keys

```json
"customers": {
  "title": "Danh sách khách nhận hàng",
  "addCustomer": "Thêm mới",
  "importExcel": "Import Excel",
  "search": "Tìm kiếm theo tên...",
  "filterTuyen": "Lọc theo tuyến",
  "allTuyen": "Tất cả tuyến",
  "columns": {
    "stt": "STT",
    "diemTraHang": "Điểm trả hàng",
    "tenKhachHang": "Tên khách hàng",
    "tuyenPhuong": "Tuyến-phường",
    "tuyenCu": "Tuyến-cũ",
    "diaChiGiaoHang": "Địa chỉ giao hàng",
    "bocXep": "Bốc xếp",
    "actions": "Hành động"
  },
  "bocXep": {
    "true": "Có",
    "false": "Không"
  },
  "empty": "Chưa có khách hàng nào",
  "noResults": "Không tìm thấy khách hàng nào",
  "errorLoad": "Không thể tải danh sách khách hàng",
  "retry": "Thử lại",
  "create": {
    "title": "Thêm khách hàng mới",
    "submit": "Thêm mới",
    "success": "Đã thêm khách hàng thành công"
  },
  "edit": {
    "title": "Chỉnh sửa khách hàng",
    "submit": "Lưu thay đổi",
    "success": "Đã cập nhật khách hàng thành công"
  },
  "delete": {
    "title": "Xóa khách hàng",
    "confirm": "Bạn có chắc muốn xóa khách hàng \"{{name}}\" không?",
    "warning": "Hành động này không thể hoàn tác.",
    "submit": "Xóa",
    "success": "Đã xóa khách hàng thành công"
  },
  "upload": {
    "title": "Import khách hàng từ Excel",
    "format": "Định dạng file: .xlsx",
    "columnGuide": "Cột bắt buộc theo đúng thứ tự:",
    "selectFile": "Chọn file .xlsx",
    "downloadTemplate": "Tải file mẫu",
    "preview": "Phát hiện {{count}} khách hàng cần import",
    "confirm": "Upload",
    "uploading": "Đang import...",
    "success": "Đã import {{count}} khách hàng thành công",
    "errorTitle": "Import thất bại",
    "errorList": "Danh sách lỗi:",
    "fixAndRetry": "Vui lòng sửa file và upload lại",
    "invalidFormat": "File không hợp lệ, vui lòng chọn file .xlsx",
    "emptyFile": "File không có dữ liệu"
  },
  "fields": {
    "diemTraHang": "Điểm trả hàng",
    "tenKhachHang": "Tên khách hàng",
    "tuyenPhuong": "Tuyến-phường",
    "tuyenCu": "Tuyến-cũ",
    "diaChiGiaoHang": "Địa chỉ giao hàng",
    "bocXep": "Có bốc xếp"
  },
  "errors": {
    "diemTraHangRequired": "Điểm trả hàng không được rỗng",
    "tenKhachHangRequired": "Tên khách hàng không được rỗng",
    "diemTraHangDuplicate": "Điểm trả hàng đã tồn tại",
    "notFound": "Không tìm thấy khách hàng"
  }
}
```

---

## Section 6 — Web Design Guidelines Compliance

- **Accessibility:** Labels gắn với inputs, error messages có aria-live
- **Responsive:** Table responsive, trên mobile ẩn cột phụ (tuyenCu, diaChi)
- **Loading:** Skeleton cho table, spinner cho button submit
- **Empty state:** Có icon + message + CTA khi không có data
- **Error state:** Có icon + message + retry button
- **Destructive actions:** Confirm dialog bắt buộc trước khi xóa
- **Form UX:** Submit disabled khi invalid, spinner khi submitting
- **Feedback:** Toast notifications cho mọi action thành công/thất bại
- **Color:** Bốc xếp "Có" = badge xanh, "Không" = badge xám
