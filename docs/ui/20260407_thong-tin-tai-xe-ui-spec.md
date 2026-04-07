# UI Spec — Thông tin tài xế (Driver Master Data)

**Ngày:** 2026-04-07
**BA Doc:** docs/ba/20260407_thong-tin-tai-xe-analysis.md
**Designer:** UI/UX Agent

---

## Section 1 — User Journey

### Happy Path: Tạo mới tài xế
```
User click "Quản lý dữ liệu xe" → sidebar expand
  → click "Thông tin tài xế"
  → DriverPage load, hiển thị table data (active drivers)
  → click nút "Tạo mới"
  → DriverFormModal mở (mode=create)
  → Nhập Tên ký hiệu (bắt buộc), optionals: Họ tên, Liên hệ, CCCD, Ghi chú
  → click "Lưu"
  → Loading spinner trên nút
  → API success → modal đóng → toast "Tạo tài xế thành công!" → table refresh
```

### Happy Path: Edit tài xế
```
User click icon Edit trên row
  → DriverFormModal mở (mode=edit), pre-fill data hiện tại
  → ten_ky_hieu hiển thị warning: "Thay đổi tên ký hiệu có thể ảnh hưởng đến lịch sử dữ liệu xe."
  → Chỉnh sửa
  → click "Lưu"
  → API success → modal đóng → toast "Cập nhật tài xế thành công!" → table refresh
```

### Happy Path: Xem & quản lý tài liệu
```
User click icon Tài liệu (📎) trên row
  → DriverDocumentsModal mở
  → Hiển thị danh sách tài liệu đã upload (metadata only)
  → click "Upload tài liệu"
    → File picker mở → chọn file (bất kỳ loại, max 5MB)
    → FE validate size → POST base64 JSON → upload success → list refresh
  → click Download icon → FE decode base64 → trigger download
  → click Delete icon → confirm → DELETE → list refresh
```

### Happy Path: Delete tài xế
```
User click icon Delete trên row
  → ConfirmDialog mở: "Xác nhận xóa tài xế '[ten_ky_hieu]'?"
  → Note: "Tất cả tài liệu đính kèm sẽ bị xóa."
  → click "Xác nhận"
  → API success → dialog đóng → toast "Đã xóa tài xế!" → table refresh
```

### Happy Path: Tạo xe với multi-select tài xế
```
User vào VehicleFormModal (create hoặc edit)
  → Field "Tài xế" hiển thị dropdown từ danh sách drivers active
  → Search/filter by ten_ky_hieu
  → Click chọn driver → thêm vào selected tags
  → Click [×] trên tag → bỏ chọn
  → click "Lưu" → vehicles.tai_xe = array of ten_ky_hieu selected
```

### Alternative Path: Duplicate Tên ký hiệu
```
Tạo/edit với ten_ky_hieu đã tồn tại:
  → API trả 409 → inline error dưới field: "Tên ký hiệu '[x]' đã tồn tại"
```

### Alternative Path: File > 5MB
```
User chọn file > 5MB:
  → FE kiểm tra trước khi upload → toast/inline error: "File không được vượt quá 5MB"
  → Không gửi lên backend
```

### Alternative Path: Drivers load fail (VehicleFormModal)
```
GET /api/drivers fail:
  → Hiển thị warning inline trong field Tài xế: "Không thể tải danh sách tài xế. Vui lòng thử lại."
  → Nút "Thử lại" để reload danh sách
  → Fallback: input free-text + "+ Thêm" (graceful degradation)
```

### Error Path
```
Network error → toast "Lỗi kết nối. Vui lòng thử lại."
Server 500 → toast "Lỗi hệ thống. Vui lòng thử lại sau."
```

---

## Section 2 — Screen Inventory

### Screen 1: DriverPage (`/vehicle-data/drivers`)

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR                  │ MAIN CONTENT                      │
│                          │                                    │
│ ▼ Quản lý dữ liệu xe    │  [Header]                         │
│   • Mã chuyến            │  Thông tin tài xế                 │
│   • Dữ liệu xe           │                     [Tạo mới]     │
│   • Thông tin tài xế←   │                                    │
│                          │  [Search bar]                     │
│                          │  🔍 Tìm theo Tên ký hiệu          │
│                          │                                    │
│                          │  ┌──────────────────────────────┐ │
│                          │  │ Tên KH │ Họ tên │ Liên hệ │..│ │
│                          │  ├──────────────────────────────┤ │
│                          │  │ TX01  │ Nguyễn A│ 0909...  │..│ │
│                          │  │ TX02  │ Trần B  │  —       │..│ │
│                          │  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Table columns:**
| # | Column | Width | Notes |
|---|--------|-------|-------|
| 1 | Tên ký hiệu | 120px | Bold, ten_ky_hieu |
| 2 | Họ tên | 180px | ho_ten; "—" nếu rỗng |
| 3 | Liên hệ | 140px | lien_he (phone/email); "—" nếu rỗng |
| 4 | CCCD | 140px | cccd; "—" nếu rỗng |
| 5 | Ghi chú | auto | ghi_chu, truncate với tooltip; "—" nếu rỗng |
| 6 | Thao tác | 96px | Edit + Tài liệu + Delete icons |

**States:**
- **Loading:** Table skeleton (5 rows × 6 cols)
- **Empty:** Icon + "Chưa có tài xế. Nhấn 'Tạo mới' để bắt đầu."
- **Error:** Icon + "Không thể tải dữ liệu. [Thử lại]"
- **Data:** Table (không cần pagination, dữ liệu tài xế thường nhỏ)

**Actions:**
- `[Tạo mới]` → open DriverFormModal(mode=create) — Button primary
- `[🔍 Search]` → filter client-side theo ten_ky_hieu hoặc ho_ten
- Row Edit icon (✏️) → open DriverFormModal(mode=edit, data=row)
- Row Tài liệu icon (📎) → open DriverDocumentsModal(driver=row)
- Row Delete icon (🗑️) → open ConfirmDialog

---

### Screen 2: DriverFormModal (Create / Edit)

```
┌──────────────────────────────────────────┐
│ [X]  Tạo mới tài xế                      │
│ ──────────────────────────────────────── │
│ Tên ký hiệu *                            │
│ [___________________________]            │
│                                          │
│ ── [edit mode only] ────────────────     │
│ ⚠️ Thay đổi tên ký hiệu có thể ảnh      │
│    hưởng đến lịch sử dữ liệu xe.        │
│ ─────────────────────────────────────── │
│                                          │
│ Họ tên                                   │
│ [___________________________]            │
│                                          │
│ Liên hệ                                  │
│ [___________________________]            │
│                                          │
│ CCCD                                     │
│ [___________________________]            │
│                                          │
│ Ghi chú                                  │
│ [___________________________]            │
│                                          │
│              [Hủy]  [Lưu ▶]             │
└──────────────────────────────────────────┘
```

**Mode=create:** Title = "Tạo mới tài xế", tất cả fields trống, không hiển thị warning.
**Mode=edit:** Title = "Chỉnh sửa tài xế", fields pre-filled, hiển thị warning dưới Tên ký hiệu.

**Field specs:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Tên ký hiệu | text input | ✅ | min 1 ký tự, max 100 |
| Họ tên | text input | ❌ | max 255 ký tự |
| Liên hệ | text input | ❌ | max 100 ký tự |
| CCCD | text input | ❌ | max 50 ký tự |
| Ghi chú | textarea | ❌ | không giới hạn |

**States:**
- Default: fields empty/pre-filled
- Validation error: inline error dưới field, màu đỏ `text-red-500`
- Edit mode: warning banner dưới Tên ký hiệu (neutral/amber tone, not an error)
- Submitting: nút "Lưu" disabled + spinner
- API error (409 duplicate): inline error dưới field Tên ký hiệu

**Kích thước modal:** `max-w-md`

---

### Screen 3: DriverDocumentsModal

```
┌──────────────────────────────────────────────┐
│ [X]  Tài liệu — TX01 (Nguyễn Văn A)          │
│ ──────────────────────────────────────────── │
│                       [+ Upload tài liệu]    │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Tên file          │ Kích thước │ Ngày  │  │
│  ├────────────────────────────────────────┤  │
│  │ CCCD_mat_truoc.jpg│ 204 KB    │ 07/04 │📥│🗑│
│  │ Bang_lai_xe.pdf   │ 1.2 MB    │ 07/04 │📥│🗑│
│  └────────────────────────────────────────┘  │
│                                              │
│  [Trống: "Chưa có tài liệu nào."]           │
│                                              │
│                            [Đóng]           │
└──────────────────────────────────────────────┘
```

**Upload flow (inline trong modal):**
```
Click "+ Upload tài liệu"
  → native file input (hidden, click-triggered)
  → FE validate: file.size ≤ 5MB
    → Fail: inline error "File không được vượt quá 5MB"
    → Pass: FE read FileReader → base64 → POST /api/drivers/:id/documents
  → Loading spinner trên nút Upload
  → Success → list refresh
```

**Table columns:**
| # | Column | Width | Notes |
|---|--------|-------|-------|
| 1 | Tên file | auto | file_name, truncate |
| 2 | Kích thước | 100px | formatFileSize(file_size): "204 KB", "1.2 MB" |
| 3 | Ngày upload | 100px | formatDate(created_at) |
| 4 | Tải xuống | 40px | icon 📥, onClick → FE decode base64 + download |
| 5 | Xóa | 40px | icon 🗑️ + inline confirm (nút xóa đổi màu đỏ khi hover) |

**States:**
- **Loading:** Spinner nhỏ khi fetch danh sách
- **Empty:** "Chưa có tài liệu nào. Nhấn 'Upload tài liệu' để thêm."
- **Uploading:** nút "+ Upload tài liệu" disabled + spinner
- **Deleting:** nút xóa tương ứng disabled + spinner nhỏ
- **Upload error (5MB):** inline error dưới nút upload
- **Upload error (server):** toast error

**Xóa tài liệu — không cần confirm dialog riêng.** Khi hover nút xóa → đổi màu đỏ như visual cue. Click → xóa ngay (hành động nhỏ, có thể upload lại).

**Kích thước modal:** `max-w-lg`

---

### Screen 4: ConfirmDialog (Delete Driver)

```
┌──────────────────────────────────────┐
│  ⚠️  Xác nhận xóa                   │
│ ─────────────────────────────────── │
│  Bạn có chắc muốn xóa tài xế        │
│  "TX01"?                             │
│                                      │
│  Tất cả tài liệu đính kèm sẽ bị     │
│  xóa theo.                           │
│                                      │
│           [Hủy]  [Xác nhận]         │
└──────────────────────────────────────┘
```

---

### Screen 5: VehicleFormModal — Cập nhật field Tài xế

**Thay đổi:** field Tài xế đổi từ free-text input thành multi-select dropdown từ danh sách drivers active.

```
┌──────────────────────────────────────────┐
│ [X]  Tạo mới xe                          │
│ ──────────────────────────────────────── │
│ Biển số *                                │
│ [___________________________]            │
│                                          │
│ Loại *                                   │
│ [Chọn loại xe ▼]                        │
│                                          │
│ Tài xế                                   │
│ [🔍 Tìm tài xế...         ▼]            │
│  ┌─ Dropdown ──────────────────────────┐ │
│  │ ☑ TX01 — Nguyễn Văn A              │ │
│  │ ☐ TX02 — Trần Văn B                │ │
│  │ ☐ TX03 — Lê Văn C                  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Selected tags:                          │
│  [TX01 ×]  [TX03 ×]                     │
│                                          │
│  ── nếu load fail ────────────────────  │
│  ⚠️ Không thể tải danh sách tài xế.     │
│     [Thử lại] — hoặc nhập thủ công      │
│  → fallback: free-text + "+ Thêm"       │
│  ─────────────────────────────────────  │
│                                          │
│              [Hủy]  [Lưu ▶]             │
└──────────────────────────────────────────┘
```

**Tài xế multi-select UX:**
- Searchable: gõ vào input → filter danh sách theo ten_ky_hieu
- Dropdown hiển thị: `{ten_ky_hieu} — {ho_ten}` (ho_ten có thể rỗng → chỉ hiện ten_ky_hieu)
- Click item → thêm vào selected tags; click lại → bỏ chọn
- Selected tags hiển thị phía dưới dropdown input, mỗi tag có [×] để bỏ chọn
- Khi modal mở edit: drivers deactivated hiện trong selected tags với suffix " (đã xóa)" — không thể click thêm nhưng vẫn hiển thị và có thể xóa khỏi tag
- Fallback khi load fail: hiển thị warning + nút Thử lại + fallback về free-text mode

**States:**
- Loading drivers: skeleton hoặc spinner nhỏ trong dropdown
- Empty drivers list: "Chưa có tài xế. [Tạo tài xế →]" (link mở tab mới tới /vehicle-data/drivers)
- Loaded: dropdown với search
- Load error: warning banner + Thử lại + fallback mode

---

## Section 3 — Component Checklist

### Mới cần tạo:

| Component | File path | States bắt buộc |
|-----------|-----------|-----------------|
| `DriverPage` | `pages/admin/vehicle-data/DriverPage.tsx` | loading, empty, error, data |
| `DriverFormModal` | `components/vehicle-data/DriverFormModal.tsx` | default, edit-warning, submitting, API error |
| `DriverDocumentsModal` | `components/vehicle-data/DriverDocumentsModal.tsx` | loading, empty, list, uploading, deleting |
| `useDrivers` hook | `hooks/useDrivers.ts` | list, create, update, delete |
| `useDriverDocuments` hook | `hooks/useDriverDocuments.ts` | list, upload, delete |
| `driverApi` | `api/driverApi.ts` | fetchDrivers, create, update, delete, getDocuments, uploadDocument, deleteDocument, downloadDocument |

### Cần cập nhật:

| Component | Thay đổi |
|-----------|----------|
| `MainLayout` (sidebar) | Thêm sub-item "Thông tin tài xế" dưới "Quản lý dữ liệu xe" |
| `Router.tsx` | Thêm route `/vehicle-data/drivers` |
| `VehicleFormModal` | Đổi tai_xe field từ free-text thành multi-select dropdown từ active drivers |

---

## Section 4 — Validation UX

| Field | Rule | Khi hiển thị | Vị trí | Message |
|-------|------|-------------|--------|---------|
| Tên ký hiệu | Required | onBlur + onSubmit | Inline dưới field | "Tên ký hiệu là bắt buộc" |
| Tên ký hiệu | Max 100 chars | onBlur + onSubmit | Inline dưới field | "Tên ký hiệu tối đa 100 ký tự" |
| Tên ký hiệu | Duplicate (409) | sau API call | Inline dưới field | "Tên ký hiệu '[x]' đã tồn tại" |
| Tên ký hiệu | Edit mode warning | khi modal mở edit | Inline dưới field (amber) | "Thay đổi tên ký hiệu có thể ảnh hưởng đến lịch sử dữ liệu xe." |
| Họ tên | Max 255 chars | onBlur + onSubmit | Inline dưới field | "Họ tên tối đa 255 ký tự" |
| Liên hệ | Max 100 chars | onBlur + onSubmit | Inline dưới field | "Liên hệ tối đa 100 ký tự" |
| CCCD | Max 50 chars | onBlur + onSubmit | Inline dưới field | "CCCD tối đa 50 ký tự" |
| File upload | Max 5MB | khi chọn file | Inline dưới nút upload | "File không được vượt quá 5MB" |
| Delete driver success | — | sau API call | Toast (success) | "Đã xóa tài xế!" |
| Create driver success | — | sau API call | Toast (success) | "Tạo tài xế thành công!" |
| Update driver success | — | sau API call | Toast (success) | "Cập nhật tài xế thành công!" |
| Upload doc success | — | sau API call | Toast (success) | "Upload tài liệu thành công!" |
| Delete doc success | — | sau API call | Toast (success) | "Đã xóa tài liệu!" |
| Network error | — | sau API call | Toast (error) | "Lỗi kết nối. Vui lòng thử lại." |
| Drivers load fail (VehicleFormModal) | — | khi fetch fail | Inline warning trong field | "Không thể tải danh sách tài xế. [Thử lại]" |

---

## Section 5 — i18n Keys

```json
"drivers": {
  "title": "Thông tin tài xế",
  "createNew": "Tạo mới",
  "searchPlaceholder": "Tìm theo Tên ký hiệu...",
  "columns": {
    "tenKyHieu": "Tên ký hiệu",
    "hoTen": "Họ tên",
    "lienHe": "Liên hệ",
    "cccd": "CCCD",
    "ghiChu": "Ghi chú",
    "actions": "Thao tác"
  },
  "form": {
    "createTitle": "Tạo mới tài xế",
    "editTitle": "Chỉnh sửa tài xế",
    "tenKyHieu": "Tên ký hiệu",
    "tenKyHieuRequired": "Tên ký hiệu là bắt buộc",
    "editWarning": "Thay đổi tên ký hiệu có thể ảnh hưởng đến lịch sử dữ liệu xe.",
    "save": "Lưu",
    "cancel": "Hủy"
  },
  "documents": {
    "title": "Tài liệu",
    "upload": "Upload tài liệu",
    "fileName": "Tên file",
    "fileSize": "Kích thước",
    "uploadedAt": "Ngày upload",
    "empty": "Chưa có tài liệu nào.",
    "fileTooLarge": "File không được vượt quá 5MB"
  },
  "delete": {
    "confirm": "Xác nhận xóa",
    "warning": "Tất cả tài liệu đính kèm sẽ bị xóa theo.",
    "success": "Đã xóa tài xế!"
  },
  "toast": {
    "createSuccess": "Tạo tài xế thành công!",
    "updateSuccess": "Cập nhật tài xế thành công!",
    "uploadDocSuccess": "Upload tài liệu thành công!",
    "deleteDocSuccess": "Đã xóa tài liệu!"
  }
},
"vehicleForm": {
  "driversLoadError": "Không thể tải danh sách tài xế. Vui lòng thử lại.",
  "driversEmpty": "Chưa có tài xế.",
  "driversDeactivated": "(đã xóa)"
}
```

---

## Section 6 — Accessibility & Design

- Font: Inter (đồng nhất với hệ thống)
- Colors: Tailwind CSS v3 — neutral palette (đồng nhất với TripCodePage, VehiclePage)
- Table row hover: `hover:bg-neutral-50 dark:hover:bg-neutral-800/50`
- Buttons:
  - Primary (Tạo mới, Lưu): `bg-neutral-900 text-white`
  - Outline (Hủy): `border border-neutral-300`
  - Danger (Xác nhận xóa): `bg-red-600 text-white`
  - Ghost icon (Edit, Docs, Delete): icon buttons với hover states
- Edit warning banner: `bg-amber-50 border border-amber-200 text-amber-700` (dark: `bg-amber-900/20 border-amber-700/50 text-amber-400`)
- Drivers load error (VehicleFormModal): `bg-red-50 border border-red-200 text-red-600` (dark variants)
- Driver selected tags: `bg-neutral-100 text-neutral-700 rounded` (dark variants) + × button
- Dark mode: tuân thủ pattern của TripCodePage và VehiclePage
- Mobile responsive: table scroll ngang trên mobile
- ARIA: modal có `role="dialog"` + `aria-labelledby`

---

## Section 7 — Web Design Guidelines Check

- [x] Buttons đủ tap target (min 44px height)
- [x] Form labels rõ ràng, gắn với input
- [x] Error messages không chỉ dùng màu (có text kèm theo)
- [x] Loading states không để blank screen
- [x] Confirm dialog trước destructive action (delete driver)
- [x] Toast tự động dismiss sau 4 giây
- [x] Table có overflow-x-auto khi scroll ngang (mobile)
- [x] Empty state có CTA rõ ràng
- [x] Warning (edit ten_ky_hieu) phân biệt rõ với error (màu amber, không phải đỏ)
- [x] File upload: validate size ở FE trước khi gửi
- [x] Driver delete: note rõ tài liệu bị xóa theo
- [x] VehicleFormModal: graceful degradation khi drivers load fail
- [x] Deactivated driver in tai_xe: hiển thị với "(đã xóa)" hint, không ẩn đi
