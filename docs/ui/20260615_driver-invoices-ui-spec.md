# UI Spec: Ghi nhận hóa đơn từ tài xế

**Ngày:** 2026-06-15
**BA Doc:** docs/ba/20260615_driver-invoices-analysis.md
**Module:** Quản lý dữ liệu kế toán → Hóa đơn tài xế

---

## Section 1 — User Journey

### Happy Path
```
User → Sidebar "Hóa đơn tài xế"
  → DriverInvoicesPage load (skeleton)
  → Danh sách hiện ra (table rows)
  → Push "Tải lên" → DriverInvoiceUploadModal mở
  → Kéo thả hoặc chọn file .xlsx
  → Hệ thống parse file → hiển thị preview table (10 dòng đầu + tổng số dòng)
  → User xác nhận "Import" → POST /api/driver-invoices/upload
  → Toast success "Đã import N bản ghi" → Modal đóng → List refresh
```

### Alternative Paths
```
- User chọn file không có sheet "XE NHỎ" → toast error, modal vẫn mở
- User chọn file không có dữ liệu → toast warning "File không chứa dữ liệu"
- Upload có dòng trùng → DuplicateConfirmDialog hiện danh sách duplicates
  - User chọn "Bỏ qua dòng trùng" → POST với skip_duplicates=true → Import thành công
  - User chọn "Hủy" → quay về preview
- Filter: Nhập text vào các filter box → filter nội bộ realtime (đã fetch data)
- Pagination: Click số trang hoặc Prev/Next → load trang mới
```

### Error Paths
```
- API load list fail → loading → error state với nút "Thử lại"
- API upload fail → toast error, modal vẫn mở, file/state giữ nguyên
- File không phải .xlsx → inline error trong upload modal "File không hợp lệ"
- File quá lớn (>10MB) → inline error
- Xóa record fail → toast error
```

---

## Section 2 — Screen Inventory

### Screen 1: DriverInvoicesPage

**Route:** `/accounting-data/driver-invoices`
**Permission:** `accounting_data.view`

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Page Header]                                                            │
│ Hóa đơn tài xế                                             [+ Tải lên]  │
│                                                                          │
│ [Filter Bar]                                                             │
│ [🔍 Mã...] [🔍 Tên TX...] [Ngày từ] [Ngày đến] [🔍 Số xe...] [...]  │
│                                                                          │
│ [Table]                                                                  │
│ STT │ Mã │ Tên TX │ Ngày │ Số xe │ Nơi giao │ Ghi chú │ HĐ   │ Xóa │
│ 1   │ emp│ b tâm  │ 02/05│ 50H...│ EMART ... │ 8312        │ [1]  │ 🗑️  │
│ 2   │ ems│ a lợi  │ 02/05│ 50H...│ E MART... │ 8313        │ [1]  │ 🗑️  │
│ 3   │bcal│ x1     │ 04/05│ 51C...│ BIG C ... │ 71471+71... │ [3]  │ 🗑️  │
│                                                                          │
│ [Pagination: Prev 1 2 ... 36 Next]                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**States:**
| State | Trigger | UI |
|-------|---------|-----|
| Loading | Đang fetch / page đổi | Skeleton table (5 rows) |
| Empty | API trả `[]` | Icon + "Chưa có hóa đơn nào" + Button "Tải lên" |
| Filter empty | Filter không có kết quả | Icon + "Không tìm thấy hóa đơn nào" |
| Error | API fail | Icon + "Không thể tải danh sách" + Button "Thử lại" |
| Success | Có data | Table hiển thị đầy đủ |

**Columns:**
| Col | Header | Width | Notes |
|-----|--------|-------|-------|
| STT | STT | 50px | 1-based index tính theo pagination |
| ma | Mã | 80px | — |
| ten_tx | Tên TX | 120px | — |
| ngay | Ngày | 100px | format DD/MM/YYYY |
| so_xe | Số xe | 120px | — |
| noi_giao | Nơi giao | 220px | truncate + tooltip |
| so_hoa_don_goc | Ghi chú | 250px | truncate + tooltip hiển thị full text |
| so_hoa_don_count | HĐ | 60px | số lượng invoice đã parse, badge `[N]` clickable → mở InvoiceNumbersPopup |
| actions | Xóa | 60px | icon 🗑️ (chỉ accounting_data.manage) |

**Actions:**
| Action | Trigger | Permission |
|--------|---------|------------|
| Tải lên | Click nút [+ Tải lên] | `accounting_data.manage` |
| Xóa | Click icon 🗑️ | `accounting_data.manage` |
| Filter | Thay đổi input filter | — (lọc client-side trên data đã fetch) |
| Pagination | Click số trang | — |

**Filter Bar chi tiết:**
- Mã: text input (debounce 300ms)
- Tên TX: text input (debounce 300ms)
- Ngày từ: date input
- Ngày đến: date input
- Số xe: text input (debounce 300ms)
- Số HĐ: text input (debounce 300ms) — filter theo số hóa đơn đã parse
- Tất cả filter: filter client-side, không query API riêng

---

### Screen 2: DriverInvoiceUploadModal

**Loại:** Modal (size: xl, full-width near-screen)
**Mở khi:** Click nút "Tải lên" trên DriverInvoicesPage
**Permission:** `accounting_data.manage`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Tải lên hóa đơn từ tài xế                                   [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                    📁 Kéo thả file vào đây                   │ │
│ │                                                             │ │
│ │                    hoặc Chọn file .xlsx                      │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─────────────── Preview (hiện sau khi parse) ──────────────── │
│                                                                 │
│ Tổng: 707 dòng | Hóa đơn: 1,234 số                             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ # │ Mã  │ Tên TX │ Ngày     │ Số xe    │ Nơi giao   │ HĐ   │ │
│ │ 1 │ emp │ b tâm  │ 02/05/26 │ 50H-70216│ EMART P.H. │ [1]  │ │
│ │ 2 │ ems │ a lợi  │ 02/05/26 │ 50H 87442│ E MART SA. │ [1]  │ │
│ │ ... (10 dòng đầu hiển thị)                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Và 697 dòng khác...                                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                       [Hủy]    [Xác nhận import] │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
| State | Trigger | UI |
|-------|---------|-----|
| Idle | Mở modal | Upload zone, chưa có preview |
| Drag-over | Kéo file vào zone | Border đổi màu (primary) + text "Thả file để tải lên" |
| Parsing | File được chọn | Spinner "Đang đọc file..." |
| Parse error | File sai format | Icon error + message cụ thể (vd: "Không tìm thấy sheet 'XE NHỎ'") |
| Preview | Parse thành công | Bảng preview 10 dòng đầu + tổng số dòng + tổng số hóa đơn |
| Uploading | Click "Xác nhận import" | Nút disabled + spinner, modal lock |
| Upload success | API 200 | Toast success, modal đóng, list refresh |
| Upload duplicate | API 409 | Mở DuplicateConfirmDialog (overlay trên modal hoặc đóng modal hiện dialog mới) |

**Actions:**
| Action | Trigger | Kết quả |
|--------|---------|---------|
| Chọn file | Click upload zone / kéo thả | Mở file picker, filter .xlsx |
| Parse file | File selected | Chạy parse ở frontend, hiện preview |
| Hủy | Click [Hủy] hoặc [X] | Đóng modal |
| Xác nhận import | Click [Xác nhận import] | Gọi API upload |

---

### Screen 3: DuplicateConfirmDialog

**Loại:** Dialog (Modal nhỏ hơn, size: md)
**Mở khi:** API upload trả về 409 (có dòng trùng lặp)

**Layout:**
```
┌───────────────────────────────────────────────────────────┐
│ Phát hiện dòng trùng                                  [X] │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Có 5 dòng đã tồn tại trong hệ thống.                      │
│ Bạn có muốn bỏ qua các dòng trùng và chỉ import 45 dòng   │
│ mới không?                                                │
│                                                           │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ # │ Mã  │ Tên TX │ Ngày     │ Số xe    │ Ghi chú   │ │
│ │ 1 │ emp │ b tâm  │ 02/05/26 │ 50H-70216│ 8312        │ │
│ │ 2 │ ems │ a lợi  │ 02/05/26 │ 50H 87442│ 8313        │ │
│ │ ...                                                  │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                     [Hủy]    [Bỏ qua dòng trùng, import mới]│
└───────────────────────────────────────────────────────────┘
```

**States:** Chỉ 1 state duy nhất — hiển thị khi có duplicate.

**Actions:**
| Action | Trigger | Kết quả |
|--------|---------|---------|
| Hủy | Click [Hủy] hoặc [X] | Đóng dialog, quay về Upload Modal (vẫn ở state preview) |
| Bỏ qua trùng | Click [Bỏ qua dòng trùng...] | POST lại với skip_duplicates=true → Toast success → Đóng tất cả modal → List refresh |

---

## Section 3 — Component Checklist

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| DriverInvoicesPage | `frontend/src/pages/admin/accounting-data/DriverInvoicesPage.tsx` | Mới | Page chính |
| DriverInvoiceUploadModal | `frontend/src/components/accounting-data/DriverInvoiceUploadModal.tsx` | Mới | Upload |
| DuplicateConfirmDialog | `frontend/src/components/accounting-data/DuplicateConfirmDialog.tsx` | Mới | Xử lý trùng |
| DriverInvoiceFilterBar | Có thể inline trong page hoặc component riêng | Mới | Filter |

### States bắt buộc

- [x] Loading state — skeleton table (5 rows) cho list, spinner "Đang đọc file..." cho upload
- [x] Empty state — "Chưa có hóa đơn nào" + CTA "Tải lên"
- [x] Error state — Message + nút "Thử lại"
- [x] Success feedback — Toast sau import thành công
- [x] Confirm dialog — DuplicateConfirmDialog
- [x] Disabled state — Nút "Xác nhận import" disabled + spinner khi đang uploading
- [x] Drag-over state — highlight border khi kéo file vào upload zone

---

## Section 4 — Validation UX

| Trường hợp | Hiển thị ở đâu | Khi nào show | Ví dụ message |
|------------|---------------|--------------|---------------|
| File sai định dạng (không phải .xlsx) | Inline trong upload modal | Sau khi chọn file | "File không hợp lệ. Vui lòng chọn file .xlsx" |
| File không có sheet "XE NHỎ" | Toast trong upload modal | Sau khi parse | "Không tìm thấy sheet 'XE NHỎ' trong file" |
| File không có dữ liệu | Toast warning | Sau khi parse | "File không chứa dữ liệu hóa đơn" |
| File quá lớn | Inline upload zone | Khi chọn file | "File quá lớn. Kích thước tối đa 10MB" |
| Duplicate (409) | DuplicateConfirmDialog | Sau khi submit upload | "Phát hiện N dòng trùng lặp" |
| Server error (500) | Toast error | Sau khi submit | "Lỗi hệ thống, vui lòng thử lại" |
| Session hết hạn (401) | Redirect login | Khi nhận 401 | — |
| Không đủ quyền (403) | Toast error | Khi nhận 403 | "Bạn không có quyền thực hiện thao tác này" |

---

## Section 5 — i18n Keys

```
driverInvoices.title = "Hóa đơn tài xế"
driverInvoices.upload = "Tải lên"
driverInvoices.uploadTitle = "Tải lên hóa đơn từ tài xế"
driverInvoices.empty = "Chưa có hóa đơn nào"
driverInvoices.emptyFilter = "Không tìm thấy hóa đơn nào"
driverInvoices.error = "Không thể tải danh sách"
driverInvoices.retry = "Thử lại"
driverInvoices.ma = "Mã"
driverInvoices.tenTx = "Tên TX"
driverInvoices.ngay = "Ngày"
driverInvoices.soXe = "Số xe"
driverInvoices.noiGiao = "Nơi giao"
driverInvoices.soHoaDonGoc = "Ghi chú"
driverInvoices.soHoaDon = "HĐ"
driverInvoices.totalRows = "Tổng số dòng"
driverInvoices.totalInvoices = "Tổng số hóa đơn"
driverInvoices.actions = "Thao tác"
driverInvoices.delete = "Xóa"
driverInvoices.confirm = "Xác nhận import"
driverInvoices.cancel = "Hủy"
driverInvoices.dragDrop = "Kéo thả file vào đây"
driverInvoices.or = "hoặc"
driverInvoices.chooseFile = "Chọn file .xlsx"
driverInvoices.parsing = "Đang đọc file..."
driverInvoices.noSheet = "Không tìm thấy sheet 'XE NHỎ' trong file"
driverInvoices.noData = "File không chứa dữ liệu hóa đơn"
driverInvoices.invalidFile = "File không hợp lệ. Vui lòng chọn file .xlsx"
driverInvoices.fileTooLarge = "File quá lớn. Kích thước tối đa 10MB"
driverInvoices.previewTitle = "Xem trước dữ liệu"
driverInvoices.andMore = "Và {count} dòng khác..."
driverInvoices.importSuccess = "Đã import {count} bản ghi"
driverInvoices.importSuccessWithSkip = "Đã import {inserted} bản ghi, bỏ qua {skipped} dòng trùng"
driverInvoices.duplicatesFound = "Phát hiện dòng trùng"
driverInvoices.duplicatesMessage = "Có {count} dòng đã tồn tại trong hệ thống. Bạn có muốn bỏ qua các dòng trùng và chỉ import {newCount} dòng mới không?"
driverInvoices.skipDuplicates = "Bỏ qua dòng trùng, import mới"
driverInvoices.importError = "Lỗi khi import dữ liệu"

# Menu sidebar
accountingData.driverInvoices = "Hóa đơn tài xế"
```
