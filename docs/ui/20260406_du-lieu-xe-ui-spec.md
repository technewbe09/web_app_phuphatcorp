# UI Spec — Quản lý dữ liệu xe / Dữ liệu xe

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_du-lieu-xe-analysis.md
**Designer:** UI/UX Agent

---

## Section 1 — User Journey

### Happy Path: Tạo mới xe
```
User click "Quản lý dữ liệu xe" → sidebar expand
  → click "Dữ liệu xe"
  → VehiclePage load, hiển thị table data (active rows)
  → click nút "Tạo mới"
  → VehicleFormModal mở (mode=create)
  → Nhập Biển số (bắt buộc), chọn Loại (bắt buộc), thêm Tài xế (optional, multi-value)
  → click "Lưu"
  → Loading spinner trên nút
  → API success → modal đóng → toast "Tạo xe thành công!" → table refresh
```

### Happy Path: Upload Excel
```
User click "Upload Excel"
  → VehicleUploadModal mở
  → Drag & drop hoặc click chọn file .xlsx
  → Preview tên file
  → click "Upload"
  → Loading spinner
  → API success → toast "Đã upload X xe thành công!" → modal đóng → table refresh
  → Nếu có lỗi: hiển thị bảng lỗi (row number, biển số, lý do) — không đóng modal
```

### Happy Path: Edit
```
User click icon Edit trên row
  → VehicleFormModal mở (mode=edit), pre-fill data hiện tại
  → Chỉnh sửa
  → click "Lưu"
  → API success: row cũ deactive, row mới tạo
  → modal đóng → toast "Cập nhật xe thành công!" → table refresh
```

### Happy Path: Delete
```
User click icon Delete trên row
  → ConfirmDialog mở: "Xác nhận xóa xe '[bien_so]'?"
  → click "Xác nhận"
  → Loading spinner trên nút xác nhận
  → API success → dialog đóng → toast "Đã xóa xe!" → table refresh
```

### Alternative Path: Duplicate Biển số
```
Tạo mới với Biển số đã tồn tại:
  → API trả 409 → hiển thị inline error dưới field Biển số: "Biển số '[x]' đã tồn tại"
Upload Excel có biển số trùng:
  → Hiển thị bảng lỗi trong modal, không insert dữ liệu
```

### Error Path
```
Network error → toast "Lỗi kết nối. Vui lòng thử lại."
Server 500 → toast "Lỗi hệ thống. Vui lòng thử lại sau."
```

---

## Section 2 — Screen Inventory

### Screen 1: VehiclePage (`/vehicle-data/vehicles`)

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR                  │ MAIN CONTENT                      │
│                          │                                    │
│ ▼ Quản lý dữ liệu xe    │  [Header]                         │
│   • Mã chuyến            │  Dữ liệu xe                       │
│   • Dữ liệu xe ← active │  [Tạo mới] [Upload Excel]         │
│                          │                                    │
│                          │  [Search/Filter bar]              │
│                          │  🔍 Tìm theo Biển số              │
│                          │                                    │
│                          │  ┌────────────────────────────┐   │
│                          │  │ Biển số │ Loại │ Tài xế │ ..│  │
│                          │  ├────────────────────────────┤   │
│                          │  │ 51A-123 │ Xe lớn │ A, B  │..│  │
│                          │  │ 51B-456 │ Xe nhỏ │  —    │..│  │
│                          │  └────────────────────────────┘   │
│                          │                                    │
│                          │  [Pagination]                     │
└─────────────────────────────────────────────────────────────┘
```

**Table columns:**
| # | Column | Width | Notes |
|---|--------|-------|-------|
| 1 | Biển số | 140px | Bold |
| 2 | Loại | 160px | Badge: Xe lớn (blue) / Xe nhỏ (green) / Xe trung chuyển (orange) |
| 3 | Tài xế | auto | Comma-separated names, truncate với tooltip; "—" nếu rỗng |
| 4 | Start Date | 150px | formatDateTime |
| 5 | Thao tác | 80px | Edit + Delete icons |

**Badge colors for Loại:**
- Xe lớn: `bg-blue-100 text-blue-700`
- Xe nhỏ: `bg-green-100 text-green-700`

**States:**
- **Loading:** Table skeleton (5 rows x 5 cols)
- **Empty:** Icon + "Chưa có dữ liệu. Nhấn 'Tạo mới' để bắt đầu."
- **Error:** Icon + "Không thể tải dữ liệu. [Thử lại]"
- **Data:** Table với pagination

**Actions:**
- `[Tạo mới]` → open VehicleFormModal(mode=create) — Button primary
- `[Upload Excel]` → open VehicleUploadModal — Button outline
- `[🔍 Search]` → filter client-side theo Biển số
- Row Edit icon (✏️) → open VehicleFormModal(mode=edit, data=row)
- Row Delete icon (🗑️) → open ConfirmDialog

---

### Screen 2: VehicleFormModal (Create / Edit)

```
┌──────────────────────────────────────────┐
│ [X]  Tạo mới xe                          │
│ ──────────────────────────────────────── │
│ Biển số *                                │
│ [___________________________]            │
│                                          │
│ Loại *                                   │
│ [Chọn loại xe ▼]                        │
│   • Xe lớn                               │
│   • Xe nhỏ                               │
│   • Xe trung chuyển                      │
│                                          │
│ Tài xế                                   │
│ [___________________________] [+ Thêm]  │
│  • Nguyễn Văn A              [×]        │
│  • Trần Văn B                [×]        │
│                                          │
│              [Hủy]  [Lưu ▶]             │
└──────────────────────────────────────────┘
```

**Mode=create:** Title = "Tạo mới xe", tất cả fields trống, Tài xế rỗng.
**Mode=edit:** Title = "Chỉnh sửa xe", fields pre-filled.

**Field specs:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Biển số | text input | ✅ | min 1 ký tự, max 50 |
| Loại | select | ✅ | one of: 'Xe lớn', 'Xe nhỏ' |
| Tài xế | dynamic list (add/remove tags) | ❌ | mỗi tên: max 100 ký tự; có thể để rỗng |

**Tài xế UX:**
- Input text + nút "+ Thêm" → thêm vào list bên dưới
- Mỗi item hiển thị tên + nút [×] để xóa
- Enter key trong input cũng trigger thêm
- Duplicate names trong list: chấp nhận (BE không validate)

**States:**
- Default: fields empty/pre-filled
- Validation error: inline error dưới field, màu đỏ `text-red-500`
- Submitting: nút "Lưu" disabled + spinner icon
- API error (409 duplicate): inline error dưới field Biển số

**Kích thước modal:** `max-w-md`

---

### Screen 3: VehicleUploadModal

```
┌──────────────────────────────────────────┐
│ [X]  Upload Dữ liệu xe từ Excel          │
│ ──────────────────────────────────────── │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │         📄                          │ │
│  │   Kéo thả file .xlsx vào đây        │ │
│  │   hoặc [Chọn file]                  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  [filename.xlsx ✓]   ← sau khi chọn    │
│                                          │
│  Template: [Tải file mẫu ↓]             │
│                                          │
│  ─────── Kết quả lỗi (nếu có) ───────   │
│  ┌──────────────────────────────────┐   │
│  │ Dòng │ Biển số │ Lý do           │   │
│  │  3   │ 51A-123 │ Biển số đã tồn tại│ │
│  └──────────────────────────────────┘   │
│                                          │
│              [Hủy]  [Upload ▶]          │
└──────────────────────────────────────────┘
```

**Template Excel format:** Header row = `Biển số | Loại | Tài xế`
- Tài xế: comma-separated, ví dụ: "Nguyễn Văn A, Trần Văn B"
- Loại: phải đúng 1 trong 3 giá trị

**States:**
- Initial: drop zone empty
- File selected: show filename, enable Upload button
- Uploading: Upload button disabled + spinner
- Success: close modal + toast
- Error: show error table, keep modal open

**Kích thước modal:** `max-w-lg`

---

### Screen 4: ConfirmDialog (Delete)

```
┌──────────────────────────────────────┐
│  ⚠️  Xác nhận xóa                   │
│ ─────────────────────────────────── │
│  Bạn có chắc muốn xóa xe            │
│  "51A-12345"?                        │
│                                      │
│  Hành động này sẽ chuyển trạng thái │
│  thành "Deactive".                   │
│                                      │
│           [Hủy]  [Xác nhận]         │
└──────────────────────────────────────┘
```

---

## Section 3 — Component Checklist

### Mới cần tạo:

| Component | File path | States bắt buộc |
|-----------|-----------|-----------------|
| `VehiclePage` | `pages/admin/vehicle-data/VehiclePage.tsx` | loading, empty, error, data |
| `VehicleFormModal` | `components/vehicle-data/VehicleFormModal.tsx` | default, submitting, API error |
| `VehicleUploadModal` | `components/vehicle-data/VehicleUploadModal.tsx` | initial, file-selected, uploading, error |
| `useVehicles` hook | `hooks/useVehicles.ts` | list, create, update, delete, upload |

### Cần cập nhật:
| Component | Thay đổi |
|-----------|----------|
| `MainLayout` (sidebar) | Thêm sub-item "Dữ liệu xe" dưới "Quản lý dữ liệu xe" |
| `Router.tsx` | Thêm route `/vehicle-data/vehicles` |

---

## Section 4 — Validation UX

| Field | Rule | Khi hiển thị | Vị trí | Message |
|-------|------|-------------|--------|---------|
| Biển số | Required | onBlur + onSubmit | Inline dưới field | "Biển số là bắt buộc" |
| Biển số | Max 50 chars | onBlur + onSubmit | Inline dưới field | "Biển số tối đa 50 ký tự" |
| Biển số | Duplicate (409) | sau API call | Inline dưới field | "Biển số '[x]' đã tồn tại" |
| Loại | Required | onBlur + onSubmit | Inline dưới field | "Loại xe là bắt buộc" |
| File upload | .xlsx only | khi chọn file | Toast/inline | "Chỉ chấp nhận file .xlsx" |
| Network error | — | sau API call | Toast (error) | "Lỗi kết nối. Vui lòng thử lại." |
| Delete success | — | sau API call | Toast (success) | "Đã xóa xe!" |
| Create success | — | sau API call | Toast (success) | "Tạo xe thành công!" |
| Update success | — | sau API call | Toast (success) | "Cập nhật xe thành công!" |
| Upload success | — | sau API call | Toast (success) | "Đã upload [n] xe thành công!" |

---

## Section 5 — Accessibility & Design

- Font: Inter (đồng nhất với hệ thống)
- Colors: Tailwind CSS v3 — neutral palette (đồng nhất với TripCodePage)
- Table row hover: `hover:bg-neutral-50`
- Buttons:
  - Primary (Tạo mới, Lưu): `bg-neutral-900 text-white`
  - Outline (Upload Excel, Hủy): `border border-neutral-300`
  - Danger (Xác nhận xóa): `bg-red-600 text-white`
- Badge Loại:
  - Xe lớn: `bg-blue-100 text-blue-700` (dark: `bg-blue-900/30 text-blue-400`)
  - Xe nhỏ: `bg-green-100 text-green-700` (dark: `bg-green-900/30 text-green-400`)
  - Xe trung chuyển: `bg-orange-100 text-orange-700` (dark: `bg-orange-900/30 text-orange-400`)
- Dark mode: tuân thủ pattern của TripCodePage (dark: variants)
- Mobile responsive: table scroll ngang trên mobile
- ARIA: modal có `role="dialog"` + `aria-labelledby`

---

## Section 6 — Web Design Guidelines Check

- [x] Buttons đủ tap target (min 44px height)
- [x] Form labels rõ ràng, gắn với input
- [x] Error messages không chỉ dùng màu (có text kèm theo)
- [x] Loading states không để blank screen
- [x] Confirm dialog trước destructive action
- [x] Toast tự động dismiss sau 4 giây
- [x] Table có overflow-x-auto khi scroll ngang (mobile)
- [x] Empty state có CTA rõ ràng
- [x] Tài xế list: mỗi tag có nút xóa rõ ràng
