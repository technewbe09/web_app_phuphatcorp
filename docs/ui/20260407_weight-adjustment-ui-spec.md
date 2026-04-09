# UI Spec: Điều chỉnh trọng lượng
**Date:** 2026-04-07
**BA Doc:** docs/ba/20260407_weight-adjustment-analysis.md
**Feature:** Quản lý dữ liệu kế toán → Điều chỉnh trọng lượng

---

## 1. User Journey

### Happy Path
```
User có accounting_data.view
  → Sidebar: click "Quản lý dữ liệu kế toán" (accordion expand)
    → click "Điều chỉnh trọng lượng"
      → WeightAdjustmentPage load
        → table hiển thị danh sách active records

User có accounting_data.manage
  → Tạo mới: click "Tạo mới" → mở WeightAdjustmentFormModal
    → nhập form → submit → toast success → table refresh
  → Sửa: click icon Pencil → mở WeightAdjustmentFormModal (edit mode)
    → chỉnh sửa → submit → toast success → table refresh
  → Xóa: click icon Trash2 → mở delete confirm dialog
    → nhấn "Xác nhận" → soft delete → toast success → table refresh
  → Upload: click "Upload Excel" → mở WeightAdjustmentUploadModal
    → chọn file → parse preview → submit → toast success với số bản ghi → table refresh
```

### Alternative Paths
```
- Search: nhập từ khóa → lọc realtime theo Mã hàng hoặc Tên hàng
- Upload file lỗi: hiển thị danh sách lỗi từng dòng, không đóng modal
- Form submit fail: hiển thị error inline trong modal, không đóng modal
```

### Error Paths
```
- API load fail: empty+error state với nút Thử lại
- Create/Edit conflict 409: toast error "Mã hàng hóa đã tồn tại"
- Delete 404: toast error "Bản ghi không tồn tại"
- Upload duplicate: hiển thị bảng lỗi chi tiết từng dòng trong modal
```

---

## 2. Screen Inventory

### Screen 1: WeightAdjustmentPage

**Route:** `/accounting-data/weight-adjustments`
**File:** `frontend/src/pages/admin/accounting-data/WeightAdjustmentPage.tsx`

#### Layout
```
┌─ Page ─────────────────────────────────────────────────────────┐
│ [Header]                                                        │
│   h1: "Điều chỉnh trọng lượng"         [Upload Excel] [Tạo mới]│
│                                                                 │
│ [Search Card]                                                   │
│   Input: "Tìm theo Mã hàng hoặc Tên hàng..."                   │
│                                                                 │
│ [Table Card]                                                    │
│   ┌──────────┬──────────┬──────────┬──────────┬───┬──────────┐ │
│   │ Mã hàng  │Tên hàng  │Giá trị cũ│GT điều   │...│ Thao tác │ │
│   │ hóa      │ hóa      │          │chỉnh     │   │          │ │
│   ├──────────┼──────────┼──────────┼──────────┼───┼──────────┤ │
│   │ A001     │Gạo 25kg  │  100.000 │  102.500 │...│ ✏️ 🗑️    │ │
│   └──────────┴──────────┴──────────┴──────────┴───┴──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Table Columns (display order)
| Column | Source | Width | Notes |
|--------|--------|-------|-------|
| Mã hàng hóa | ma_hang | w-32 | font-medium |
| Tên hàng hóa | ten_hang | flex-1 | |
| Giá trị cũ | gia_tri_cu | w-36 text-right | "—" nếu null; tabular-nums |
| Giá trị điều chỉnh | gia_tri_dieu_chinh | w-36 text-right | tabular-nums |
| Version | version | w-20 text-center | badge: "v{N}" |
| Hành động | action_type | w-28 | badge màu (xem bên dưới) |
| Người thực hiện | action_by_name | w-36 | "—" nếu null |
| Ngày hiệu lực | start_date | w-44 | formatDateTime |
| Thao tác | — | w-24 | ✏️ Pencil + 🗑️ Trash2 (chỉ hiện nếu có accounting_data.manage) |

#### Action type badges
| action_type | Label | Style |
|-------------|-------|-------|
| create | Tạo mới | bg-green-100 text-green-700 |
| update | Cập nhật | bg-blue-100 text-blue-700 |
| delete | Đã xóa | (không hiển thị trong active list) |
| upload | Upload | bg-purple-100 text-purple-700 |

#### States
| State | Render |
|-------|--------|
| Loading | 5 skeleton rows (h-10, animate-pulse) trong Card |
| Empty (no data) | Center text "Chưa có dữ liệu. Nhấn "Tạo mới" để bắt đầu." + nút Tạo mới |
| Empty (search) | Center text "Không tìm thấy kết quả phù hợp." |
| Error | AlertTriangle + "Không thể tải dữ liệu." + nút Thử lại |
| Success | Bảng với data |

#### Buttons (header)
- **Upload Excel** (`variant="outline"`): chỉ hiển thị nếu có `accounting_data.manage` hoặc ADMIN
- **Tạo mới** (`variant="default"`): chỉ hiển thị nếu có `accounting_data.manage` hoặc ADMIN

---

### Modal 1: WeightAdjustmentFormModal (Create / Edit)

**File:** `frontend/src/components/accounting-data/WeightAdjustmentFormModal.tsx`

#### Layout
```
┌─ Modal ──────────────────────────────────┐
│ [Create mode] Thêm điều chỉnh trọng lượng│
│ [Edit mode]   Sửa điều chỉnh trọng lượng │
│                                          │
│ Mã hàng hóa *                            │
│ [________________________]               │
│                                          │
│ Tên hàng hóa *                           │
│ [________________________]               │
│                                          │
│ Giá trị cũ                               │
│ [________________________] (type=number) │
│                                          │
│ Giá trị điều chỉnh *                     │
│ [________________________] (type=number) │
│                                          │
│                         [Hủy] [Lưu]     │
└──────────────────────────────────────────┘
```

#### Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Mã hàng hóa | text | Yes | max 100 ký tự |
| Tên hàng hóa | text | Yes | max 255 ký tự |
| Giá trị cũ | number | No | >= 0, nullable |
| Giá trị điều chỉnh | number | Yes | >= 0, not null |

#### States
- **Create mode:** title "Thêm điều chỉnh trọng lượng", fields rỗng
- **Edit mode:** title "Sửa điều chỉnh trọng lượng", fields pre-filled với data hiện tại
- **Submitting:** nút "Lưu" disabled + loading spinner
- **Error:** toast error hoặc inline error dưới field (409 conflict)

---

### Modal 2: WeightAdjustmentUploadModal

**File:** `frontend/src/components/accounting-data/WeightAdjustmentUploadModal.tsx`

#### Layout
```
┌─ Modal ─────────────────────────────────────┐
│ Upload Excel — Điều chỉnh trọng lượng       │
│                                             │
│ ┌─ Upload Zone ──────────────────────────┐  │
│ │  📄 Kéo thả file hoặc click để chọn   │  │
│ │     Chấp nhận: .xlsx                  │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ [Sau khi chọn file — Preview]               │
│ Tên file: abc.xlsx | 5 bản ghi              │
│                                             │
│ [Nếu có lỗi]                                │
│ ┌─ Error Table ─────────────────────────┐   │
│ │ Dòng │ Mã hàng │ Lý do               │   │
│ │  3   │ A001    │ Mã đã tồn tại       │   │
│ └───────────────────────────────────────┘   │
│                                             │
│                          [Hủy] [Import]     │
└─────────────────────────────────────────────┘
```

#### Excel Format
```
Row 1 (header): Mã hàng hóa | Tên hàng hóa | Giá trị cũ | Giá trị điều chỉnh
Row 2+: data
```

#### States
- **Initial:** upload zone (dashed border, icon + text)
- **File selected (no errors):** preview số dòng + nút Import active
- **File selected (parse errors):** hiển thị error table, nút Import disabled
- **Submitting:** nút Import disabled + loading
- **API errors (duplicate):** hiển thị error table từ server response, không đóng modal
- **Success:** đóng modal, toast "Đã import X bản ghi"

---

### Dialog: Delete Confirm (inline trong Page)

```
┌─ Modal sm ─────────────────────────────┐
│ Xác nhận xóa                           │
│                                        │
│ ⚠️ Bạn có chắc muốn xóa bản ghi       │
│    Mã hàng: "[ma_hang]"?               │
│    Hành động này sẽ deactivate bản ghi.│
│                                        │
│               [Hủy] [Xác nhận]         │
└────────────────────────────────────────┘
```

---

## 3. Component Checklist

| Component | States bắt buộc | File |
|-----------|----------------|------|
| WeightAdjustmentPage | loading, empty, empty-search, error, success | pages/admin/accounting-data/WeightAdjustmentPage.tsx |
| WeightAdjustmentFormModal | create-mode, edit-mode, submitting, error | components/accounting-data/WeightAdjustmentFormModal.tsx |
| WeightAdjustmentUploadModal | initial, file-selected, parse-error, submitting, api-error | components/accounting-data/WeightAdjustmentUploadModal.tsx |

---

## 4. Validation UX

| Trigger | Hành động |
|---------|-----------|
| Submit form với field trống | Inline error dưới field: "Trường này là bắt buộc" |
| Giá trị âm | Inline error: "Giá trị phải >= 0" |
| Mã hàng quá dài | Inline error: "Tối đa 100 ký tự" |
| API 409 conflict | Toast error: "Mã hàng hóa đã tồn tại" (không đóng modal) |
| Upload parse error | Inline error table trong modal (không đóng modal) |
| Upload API error (duplicate) | Error table trong modal (không đóng modal) |
| API load error | Error state trong page + nút Thử lại |
| Create/Edit success | Toast success: "Thêm thành công!" / "Cập nhật thành công!" → modal đóng |
| Delete success | Toast success: "Đã xóa bản ghi." → dialog đóng |
| Upload success | Toast success: "Đã import X bản ghi." → modal đóng |

---

## 5. i18n Keys

### vi.json — thêm section `accountingData`
```json
{
  "accountingData": {
    "menuTitle": "Quản lý dữ liệu kế toán",
    "weightAdjustment": "Điều chỉnh trọng lượng"
  },
  "weightAdjustment": {
    "pageTitle": "Điều chỉnh trọng lượng",
    "addNew": "Tạo mới",
    "uploadExcel": "Upload Excel",
    "search": "Tìm theo Mã hàng hoặc Tên hàng...",
    "columns": {
      "maHang": "Mã hàng hóa",
      "tenHang": "Tên hàng hóa",
      "giaTriCu": "Giá trị cũ",
      "giaTriDieuChinh": "Giá trị điều chỉnh",
      "version": "Version",
      "actionType": "Hành động",
      "actionBy": "Người thực hiện",
      "startDate": "Ngày hiệu lực",
      "actions": "Thao tác"
    },
    "actionTypes": {
      "create": "Tạo mới",
      "update": "Cập nhật",
      "upload": "Upload"
    },
    "form": {
      "createTitle": "Thêm điều chỉnh trọng lượng",
      "editTitle": "Sửa điều chỉnh trọng lượng",
      "maHang": "Mã hàng hóa",
      "tenHang": "Tên hàng hóa",
      "giaTriCu": "Giá trị cũ",
      "giaTriDieuChinh": "Giá trị điều chỉnh",
      "cancel": "Hủy",
      "save": "Lưu",
      "saving": "Đang lưu..."
    },
    "upload": {
      "title": "Upload Excel — Điều chỉnh trọng lượng",
      "dropzone": "Kéo thả file hoặc click để chọn",
      "accepts": "Chấp nhận: .xlsx",
      "preview": "{count} bản ghi",
      "import": "Import",
      "importing": "Đang import...",
      "errorTableRow": "Dòng",
      "errorTableMaHang": "Mã hàng",
      "errorTableReason": "Lý do"
    },
    "delete": {
      "title": "Xác nhận xóa",
      "confirm": "Bạn có chắc muốn xóa bản ghi Mã hàng: \"{maHang}\"? Hành động này sẽ deactivate bản ghi.",
      "cancel": "Hủy",
      "submit": "Xác nhận"
    },
    "empty": "Chưa có dữ liệu. Nhấn \"Tạo mới\" để bắt đầu.",
    "emptySearch": "Không tìm thấy kết quả phù hợp.",
    "loadError": "Không thể tải dữ liệu.",
    "retry": "Thử lại",
    "createSuccess": "Thêm thành công!",
    "updateSuccess": "Cập nhật thành công!",
    "deleteSuccess": "Đã xóa bản ghi.",
    "uploadSuccess": "Đã import {count} bản ghi.",
    "duplicateError": "Mã hàng hóa đã tồn tại",
    "validation": {
      "maHangRequired": "Mã hàng hóa là bắt buộc",
      "maHangMaxLength": "Tối đa 100 ký tự",
      "tenHangRequired": "Tên hàng hóa là bắt buộc",
      "tenHangMaxLength": "Tối đa 255 ký tự",
      "giaTriDieuChinhRequired": "Giá trị điều chỉnh là bắt buộc",
      "giaTriMin": "Giá trị phải >= 0"
    }
  },
  "permissions": {
    "modules": {
      "accounting_data": "Dữ liệu kế toán"
    },
    "permCodes": {
      "accounting_data_view": "Xem dữ liệu kế toán",
      "accounting_data_manage": "Quản lý dữ liệu kế toán"
    }
  }
}
```

---

## 6. Sidebar Integration

### Thêm menu group "Quản lý dữ liệu kế toán"
```
Pattern: Giống "Quản lý dữ liệu xe" (accordion collapsible group)

State:
  const [accountingDataOpen, setAccountingDataOpen] = useState(
    location.pathname.startsWith('/accounting-data')
  )

Show condition: hasAnyPermission(['accounting_data.view', 'accounting_data.manage']) || user?.role === 'ADMIN'

Icon: BookOpen (lucide-react)
Route prefix: /accounting-data
```

Sub-items:
```
{ to: '/accounting-data/weight-adjustments', icon: Scale, label: t('accountingData.weightAdjustment') }
```

---

## 7. Web Design Guidelines Compliance

- **Accessibility:** Input labels đầy đủ, aria-required cho required fields
- **Dark mode:** Tất cả classes có `dark:` variant (theo pattern của TripCodePage)
- **Loading states:** Skeleton animation thay vì spinner cho table rows
- **Error states:** AlertTriangle icon + message + Retry button
- **Actions:** Confirm dialog trước khi xóa (destructive action)
- **Feedback:** Toast notification cho create/update/delete/upload success và error
- **Responsive:** Table với `overflow-x-auto` wrapper
- **Button states:** disabled + isLoading cho submit buttons
