# UI Spec: Import dữ liệu 5 nhà & Đối chiếu hóa đơn
**Ngày:** 2026-06-15
**BA Doc:** docs/ba/20260615_delivery-data-import-analysis.md

---

## 1. User Journey

### Happy Path
```
Upload Excel File → Xem progress → Nhận kết quả import (thống kê) → Xem danh sách hóa đơn đối chiếu
```

### Alternative Paths
- **Re-upload:** User upload file mới (batch mới) → kết quả mới, không ảnh hưởng batch cũ
- **View history:** User vào xem danh sách các batch đã import trước đó
- **Filter invoices:** User lọc hóa đơn theo batch, ngày, số xe, trạng thái

### Error Paths
- File sai định dạng → toast báo lỗi đỏ
- File trống hoặc không có dữ liệu → toast báo lỗi
- Không có quyền upload → redirect hoặc ẩn nút

---

## 2. Screen Inventory

### 2.1 Screen: Delivery Data Import (`/accounting-data/delivery-import`)

**Layout:** Kế thừa `MainLayout` + sidebar với sub-item mới trong nhóm "Accounting Data".

**States:**

| State | Mô tả | UI |
|-------|-------|-----|
| **idle** | Chưa upload gì cả | Drop zone + nút chọn file |
| **uploading** | Đang upload file lên server | Progress indicator + spinner |
| **processing** | Server đang xử lý import | Progress message ("Đang import {n} dòng...") |
| **success** | Import hoàn tất | Card kết quả: batch_id, total_rows, matched/unmatched counts + link "Xem danh sách hóa đơn" |
| **error** | Import thất bại | Alert đỏ với message lỗi |

**Actions:**
- [Primary] Chọn file / Kéo thả file `.xlsx`
- [Primary] Nút Upload (chỉ hiện khi file được chọn)
- [Link] "Xem danh sách hóa đơn" → chuyển đến `/accounting-data/invoice-matching?batch_id=xxx`
- [Link] "Xem lịch sử import" → mở panel lịch sử batch

**Components required:**
- `FileDropZone` (tái sử dụng pattern từ `DriverInvoiceUploadModal`)
- `ImportResultCard` — card hiển thị kết quả thống kê sau import
- `BatchHistoryTable` — bảng lịch sử các batch đã import

**Location:** `frontend/src/pages/admin/accounting-data/DeliveryImportPage.tsx`

---

### 2.2 Screen: Accountant Invoices List (`/accounting-data/invoice-matching`)

**Layout:** Kế thừa `MainLayout`.

**States:**

| State | Mô tả | UI |
|-------|-------|-----|
| **loading** | Đang load danh sách | Skeleton table |
| **empty** | Chưa có dữ liệu | Empty state: "Chưa có dữ liệu hóa đơn. Import file trước." + nút "Import ngay" |
| **data** | Có danh sách hóa đơn | Table + filters + pagination |
| **error** | Lỗi khi load | Alert đỏ + nút Retry |

**Filters (row trên cùng của table):**
- `batch_id` — Select dropdown: chọn batch (lấy từ API batches)
- `ngay_from` / `ngay_to` — Date picker
- `so_xe` — Input text (search)
- `so_hoa_don` — Input text (search)
- `trang_thai` — Select: Tất cả / Đã có / Không có

**Table Columns:**
| Column | Key | Width | Sortable |
|--------|-----|-------|----------|
| Ngày | `ngay` | 120px | Yes |
| Số xe | `so_xe` | 130px | Yes |
| Số hóa đơn | `so_hoa_don` | auto | Yes |
| Trạng thái | `trang_thai` | 120px | Yes |

**Trạng thái badge:**
- `'đã có'` → badge màu xanh (green), icon CheckCircle2
- `'không có'` → badge màu xám (gray), icon XCircle

**Actions:**
- [Secondary] Nút "Export Excel" — xuất danh sách hiện tại ra file
- [Link] "Quay lại import" → chuyển đến delivery-import page

**Components required:**
- `InvoiceMatchingTable` — data table với filter + pagination
- `InvoiceStatusBadge` — badge cho trạng thái

**Location:** `frontend/src/pages/admin/accounting-data/InvoiceMatchingPage.tsx`

---

## 3. Component Checklist

### Components tạo mới

| Component | File | Props | States |
|-----------|------|-------|--------|
| `DeliveryImportPage` | `pages/admin/accounting-data/DeliveryImportPage.tsx` | — | idle, uploading, processing, success, error |
| `InvoiceMatchingPage` | `pages/admin/accounting-data/InvoiceMatchingPage.tsx` | — | loading, empty, data, error |
| `ImportResultCard` | `components/accounting-data/ImportResultCard.tsx` | `{ result: ImportResult }` | — |
| `BatchHistoryTable` | `components/accounting-data/BatchHistoryTable.tsx` | `{ onSelect: (batchId) => void }` | loading, empty, data |
| `InvoiceStatusBadge` | `components/accounting-data/InvoiceStatusBadge.tsx` | `{ status: 'đã có' \| 'không có' }` | — |

### Components tái sử dụng (existing)
- `DragDropFile` (từ `DriverInvoiceUploadModal` pattern)
- `Table`, `Pagination` (ui/)
- `Input`, `Select`, `DatePicker` (ui/)
- `Badge` (ui/)
- `EmptyState` (ui/)
- `Alert` (ui/)
- `Button` (ui/)
- `Card`, `CardHeader`, `CardContent` (ui/)
- `Skeleton` (ui/ hoặc pattern)

---

## 4. Validation UX

| Trigger | Validation | UX |
|---------|------------|-----|
| File chọn sai định dạng (không phải .xlsx) | Client-side: check extension | Toast error đỏ: "Vui lòng chọn file .xlsx" |
| File > 10MB | Client-side: check file.size | Toast error đỏ: "File quá lớn (tối đa 10MB)" |
| Upload lỗi network | Server trả 500/timeout | Toast error đỏ: "Lỗi kết nối, vui lòng thử lại" |
| File không có dữ liệu | Server trả 400 | Toast error đỏ + message từ server |
| Filter không có kết quả | Client-side: data array empty | Empty state trong table "Không tìm thấy hóa đơn nào" |

---

## 5. i18n Keys

Thêm vào `frontend/src/i18n/vi.json`:

```json
{
  "deliveryImport": {
    "title": "Import dữ liệu 5 nhà",
    "dropzone": "Kéo thả file Excel vào đây hoặc click để chọn",
    "uploadBtn": "Import vào database",
    "uploading": "Đang upload...",
    "processing": "Đang xử lý dữ liệu...",
    "success": "Import hoàn tất",
    "error": "Import thất bại",
    "fileInvalid": "File không đúng định dạng hoặc không có dữ liệu",
    "fileWrongType": "Vui lòng chọn file .xlsx",
    "fileTooLarge": "File quá lớn (tối đa 10MB)",
    "result": {
      "batchId": "Mã batch",
      "totalRows": "Tổng số dòng",
      "totalInvoices": "Tổng hóa đơn",
      "matched": "Đã có",
      "unmatched": "Không có",
      "dateRange": "Khoảng ngày",
      "viewInvoices": "Xem danh sách hóa đơn",
      "history": "Lịch sử import"
    }
  },
  "invoiceMatching": {
    "title": "Đối chiếu hóa đơn",
    "empty": "Chưa có dữ liệu hóa đơn. Import file trước.",
    "importNow": "Import ngay",
    "status": {
      "matched": "Đã có",
      "unmatched": "Không có",
      "all": "Tất cả"
    },
    "filter": {
      "batch": "Batch",
      "dateFrom": "Từ ngày",
      "dateTo": "Đến ngày",
      "plateNumber": "Số xe",
      "invoiceNumber": "Số hóa đơn",
      "status": "Trạng thái"
    },
    "table": {
      "date": "Ngày",
      "plate": "Số xe",
      "invoice": "Số hóa đơn",
      "status": "Trạng thái"
    },
    "export": "Xuất Excel",
    "back": "Quay lại import",
    "deleteBatch": "Xóa batch",
    "deleteConfirm": "Xác nhận xóa batch này và toàn bộ dữ liệu liên quan?"
  }
}
```

---

## 6. Sidebar Navigation Update

Thêm vào nhóm "Accounting Data" trong `MainLayout.tsx`:

```typescript
const accountingDataSubItems = [
  // ... existing items
  { to: '/accounting-data/delivery-import', icon: Upload, label: t('deliveryImport.title') },
  { to: '/accounting-data/invoice-matching', icon: FileSearch, label: t('invoiceMatching.title') },
];
```
