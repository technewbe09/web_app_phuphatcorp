# UI Spec — Quản lý dữ liệu xe / Mã chuyến

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_ma-chuyen-analysis.md
**Designer:** UI/UX Agent

---

## Section 1 — User Journey

### Happy Path: Tạo mới Mã chuyến
```
User click "Quản lý dữ liệu xe" → sidebar expand
  → click "Mã chuyến"
  → TripCodePage load, hiển thị table data (active rows)
  → click nút "Tạo mới"
  → TripCodeFormModal mở (mode=create)
  → Nhập Mã, Tuyến (bắt buộc), optionally: Số tiền, Bốc xếp, Ghi chú
  → click "Lưu"
  → Loading spinner trên nút
  → API success → modal đóng → toast "Tạo mã chuyến thành công!" → table refresh
```

### Happy Path: Upload Excel
```
User click "Upload Excel"
  → TripCodeUploadModal mở
  → Drag & drop hoặc click chọn file .xlsx
  → Preview tên file
  → click "Upload"
  → Loading spinner
  → API success → toast "Đã upload X dòng thành công!" → modal đóng → table refresh
  → Nếu có lỗi: hiển thị bảng lỗi (row number, mã, lý do) — không đóng modal
```

### Happy Path: Edit
```
User click icon Edit trên row
  → TripCodeFormModal mở (mode=edit), pre-fill data hiện tại
  → Chỉnh sửa
  → click "Lưu"
  → API success: row cũ deactive, row mới tạo
  → modal đóng → toast "Cập nhật thành công!" → table refresh
```

### Happy Path: Delete
```
User click icon Delete trên row
  → ConfirmDialog mở: "Xác nhận xóa mã chuyến '[ma]'?"
  → click "Xác nhận"
  → Loading spinner trên nút xác nhận
  → API success → dialog đóng → toast "Đã xóa mã chuyến!" → table refresh
```

### Alternative Path: Duplicate Mã
```
Tạo mới với Mã đã tồn tại:
  → API trả 409 → hiển thị inline error dưới field Mã: "Mã '[ma]' đã tồn tại"
Upload Excel có mã trùng:
  → Hiển thị bảng lỗi trong modal, không insert dữ liệu
```

### Error Path
```
Network error → toast "Lỗi kết nối. Vui lòng thử lại."
Server 500 → toast "Lỗi hệ thống. Vui lòng thử lại sau."
```

---

## Section 2 — Screen Inventory

### Screen 1: TripCodePage (`/vehicle-data/trip-codes`)

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR                  │ MAIN CONTENT                      │
│                          │                                    │
│ ▼ Quản lý dữ liệu xe    │  [Header]                         │
│   • Mã chuyến  ← active │  Quản lý Mã chuyến                │
│                          │  [Tạo mới] [Upload Excel]         │
│                          │                                    │
│                          │  [Search/Filter bar]              │
│                          │  🔍 Tìm theo Mã hoặc Tuyến        │
│                          │                                    │
│                          │  ┌────────────────────────────┐   │
│                          │  │ Mã │ Tuyến │ Số tiền │ ...  │  │
│                          │  ├────────────────────────────┤   │
│                          │  │ MC01│ HN-SG │ 500,000 │ ... │  │
│                          │  │ MC02│ HN-DN │    —    │ ... │  │
│                          │  └────────────────────────────┘   │
│                          │                                    │
│                          │  [Pagination]                     │
└─────────────────────────────────────────────────────────────┘
```

**Table columns:**
| # | Column | Width | Notes |
|---|--------|-------|-------|
| 1 | Mã | 120px | Bold |
| 2 | Tuyến | 200px | |
| 3 | Số tiền | 140px | Right-align, formatCurrency |
| 4 | Số lượt | 96px | Right-align, số nguyên |
| 5 | Bốc xếp | 96px | Badge: Có (green) / Không (neutral) |
| 6 | Ghi chú | 200px | Truncate với tooltip |
| 7 | Start Date | 150px | formatDateTime |
| 8 | Thao tác | 80px | Edit + Delete icons |

**States:**
- **Loading:** Table skeleton (5 rows x 7 cols)
- **Empty:** Icon + "Chưa có dữ liệu. Nhấn 'Tạo mới' để bắt đầu."
- **Error:** Icon + "Không thể tải dữ liệu. [Thử lại]"
- **Data:** Table với pagination

**Actions:**
- `[Tạo mới]` → open TripCodeFormModal(mode=create) — Button primary
- `[Upload Excel]` → open TripCodeUploadModal — Button outline
- `[🔍 Search]` → filter trong kết quả load về (client-side search)
- Row Edit icon (✏️) → open TripCodeFormModal(mode=edit, data=row)
- Row Delete icon (🗑️) → open ConfirmDialog


---

### Screen 2: TripCodeFormModal (Create / Edit)

```
┌──────────────────────────────────────────┐
│ [X]  Tạo mới Mã chuyến                   │
│ ──────────────────────────────────────── │
│ Mã *                                     │
│ [___________________________]            │
│                                          │
│ Tuyến *                                  │
│ [___________________________]            │
│                                          │
│ Số tiền                                  │
│ [___________________________] VNĐ        │
│                                          │
│ Bốc xếp                                  │
│ [___________________________]            │
│                                          │
│ Ghi chú                                  │
│ [___________________________]            │
│ [___________________________]            │
│                                          │
│              [Hủy]  [Lưu ▶]             │
└──────────────────────────────────────────┘
```

**Mode=create:** Title = "Tạo mới Mã chuyến", tất cả fields trống.
**Mode=edit:** Title = "Chỉnh sửa Mã chuyến", fields pre-filled.

**Field specs:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Mã | text input | ✅ | min 1 ký tự, max 100 |
| Tuyến | text input | ✅ | min 1 ký tự, max 255 |
| Số tiền | number input | ❌ | >= 0, số thực |
| Số lượt | number input | ✅ | integer >= 1, default 1 |
| Bốc xếp | select (Có/Không) | ✅ | values: 'yes'/'no', default 'no' |
| Ghi chú | textarea | ❌ | max 1000 ký tự |

**States:**
- Default: fields empty/pre-filled
- Validation error: inline error dưới field, màu đỏ `text-red-500`
- Submitting: nút "Lưu" disabled + spinner icon
- API error (409 duplicate): inline error dưới field Mã

**Kích thước modal:** `max-w-md`

---

### Screen 3: TripCodeUploadModal

```
┌──────────────────────────────────────────┐
│ [X]  Upload Mã chuyến từ Excel           │
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
│  │ Dòng │ Mã    │ Lý do            │   │
│  │  3   │ MC01  │ Mã đã tồn tại    │   │
│  │  7   │ MC01  │ Mã trùng trong file│  │
│  └──────────────────────────────────┘   │
│                                          │
│              [Hủy]  [Upload ▶]          │
└──────────────────────────────────────────┘
```

**Template Excel format:** Header row = `Mã | Tuyến | Số tiền | Số lượt | Bốc xếp | Ghi chú`

**States:**
- Initial: drop zone empty
- File selected: show filename, enable Upload button
- Uploading: Upload button disabled + spinner
- Success: close modal + toast
- Error: show error table, keep modal open, user can fix file & re-upload

**Kích thước modal:** `max-w-lg`

---

### Screen 4: ConfirmDialog (Delete)

```
┌──────────────────────────────────────┐
│  ⚠️  Xác nhận xóa                   │
│ ─────────────────────────────────── │
│  Bạn có chắc muốn xóa mã chuyến     │
│  "MC01"?                             │
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
| `TripCodePage` | `pages/admin/vehicle-data/TripCodePage.tsx` | loading, empty, error, data |
| `TripCodeFormModal` | `components/vehicle-data/TripCodeFormModal.tsx` | default, submitting, API error |
| `TripCodeUploadModal` | `components/vehicle-data/TripCodeUploadModal.tsx` | initial, file-selected, uploading, error |
| `useTripCodes` hook | `hooks/useTripCodes.ts` | list, create, update, delete, upload |

### Cần cập nhật:
| Component | Thay đổi |
|-----------|----------|
| `MainLayout` (sidebar) | Thêm mục "Quản lý dữ liệu xe" collapsible + sub-item "Mã chuyến" |
| `Router.tsx` | Thêm routes `/vehicle-data/*` |

---

## Section 4 — Validation UX

| Field | Rule | Khi hiển thị | Vị trí | Message |
|-------|------|-------------|--------|---------|
| Mã | Required | onBlur + onSubmit | Inline dưới field | "Mã là bắt buộc" |
| Mã | Max 100 chars | onBlur + onSubmit | Inline dưới field | "Mã tối đa 100 ký tự" |
| Mã | Duplicate (409) | sau API call | Inline dưới field | "Mã '[ma]' đã tồn tại" |
| Tuyến | Required | onBlur + onSubmit | Inline dưới field | "Tuyến là bắt buộc" |
| Tuyến | Max 255 chars | onBlur + onSubmit | Inline dưới field | "Tuyến tối đa 255 ký tự" |
| Số tiền | >= 0 | onBlur + onSubmit | Inline dưới field | "Số tiền không được âm" |
| File upload | .xlsx only | khi chọn file | Toast | "Chỉ chấp nhận file .xlsx" |
| Network error | — | sau API call | Toast (error) | "Lỗi kết nối. Vui lòng thử lại." |
| Delete success | — | sau API call | Toast (success) | "Đã xóa mã chuyến!" |
| Create success | — | sau API call | Toast (success) | "Tạo mã chuyến thành công!" |
| Update success | — | sau API call | Toast (success) | "Cập nhật mã chuyến thành công!" |
| Upload success | — | sau API call | Toast (success) | "Đã upload [n] dòng thành công!" |

---

## Section 5 — Accessibility & Design

- Font: Inter (đồng nhất với hệ thống)
- Colors: Tailwind CSS v3 — neutral palette
- Table row hover: `hover:bg-neutral-50`
- Buttons:
  - Primary (Tạo mới, Lưu): `bg-neutral-900 text-white`
  - Outline (Upload Excel, Hủy): `border border-neutral-300`
  - Danger (Xác nhận xóa): `bg-red-600 text-white`
- Status badge: Active → `bg-green-100 text-green-700`, Deactive → `bg-neutral-100 text-neutral-500`
- Mobile responsive: table scroll ngang trên mobile
- ARIA: modal có `role="dialog"` + `aria-labelledby`

---

## Section 6 — Web Design Guidelines Check

- [x] Buttons đủ tap target (min 44px height)
- [x] Form labels rõ ràng, gắn với input
- [x] Error messages không chỉ dùng màu (có text kèm theo)
- [x] Loading states không để blank screen
- [x] Confirm dialog trước destructive action
- [x] Toast tự động dismiss sau 4-5 giây
- [x] Table có header sticky khi scroll (nếu nhiều dữ liệu)
- [x] Empty state có CTA rõ ràng
