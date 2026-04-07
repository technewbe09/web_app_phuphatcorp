# UI Spec — Bảng điều phối xe

**Ngày:** 2026-04-07
**BA Doc:** docs/ba/20260407_bang-dieu-phoi-xe-analysis.md
**Route:** `/dispatch/schedule`

---

## Section 1 — User Journey

### Happy Path: Xem bảng điều phối ngày hôm nay
```
User navigate /dispatch/schedule
  → Loading skeleton (2 bảng song song)
  → Render bảng với ngày hôm nay
  → Hiển thị chuyến xe nhỏ bên trái + xe lớn bên phải
  → User chọn ngày khác → spinner → re-render bảng
```

### Happy Path: Tạo chuyến xe nhà
```
User click "Tạo chuyến"
  → Modal Step 1: [Xe nhà] [Xe ngoài] — user click "Xe nhà"
  → Modal Step 2: [Xe lớn] [Xe nhỏ] — user click "Xe nhỏ"
  → Modal Step 3: Form với các trường
    - Điểm nhận (text input)
    - Điểm trả (text input)
    - Giờ nhận (time input)
    - Mã chuyến (searchable select — trip_codes)
    - Biển số (select dropdown — vehicles filter loai="Xe nhỏ")
    - Tài xế (text read-only — tự điền từ vehicle đã chọn)
    - Ghi chú (textarea)
  → User submit → spinner trên nút Tạo
  → Toast "Tạo chuyến thành công" → Modal đóng → Bảng refresh
```

### Happy Path: Tạo chuyến xe ngoài
```
User click "Tạo chuyến"
  → Step 1: "Xe ngoài"
  → Step 2: "Xe lớn"
  → Step 3: Form
    - Biển số: input tay (không có dropdown)
    - Tài xế: input tay (tùy chọn)
    - Các trường còn lại giống xe nhà
  → Submit → Toast success → Refresh
```

### Alternative Path: Xóa chuyến
```
User hover/click row trong bảng
  → Hiện nút Delete (trash icon) ở cuối row
  → User click Delete
  → AlertDialog: "Xóa chuyến này?" + nút Hủy / Xóa
  → User confirm → spinner → Toast "Đã xóa chuyến xe"
  → Row biến mất khỏi bảng
```

### Error Path: Submit lỗi
```
User submit form thiếu field bắt buộc
  → Inline error dưới field: "Trường này là bắt buộc"
  → Nút "Tạo" vẫn ở trạng thái normal (không spinner)
  → Không đóng modal

Backend trả 400
  → Toast error: "Tạo chuyến thất bại. Vui lòng thử lại."
  → Modal vẫn mở, data giữ nguyên
```

---

## Section 2 — Screen Inventory

### Screen 1: SchedulePage — /dispatch/schedule

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Bảng điều phối xe                    [date picker] [Tạo chuyến] │
├──────────────────────────┬──────────────────────────────┤
│  Lịch xe nhỏ             │  Lịch xe lớn                 │
│ ┌─────────────────────── │ ┌──────────────────────────┐ │
│ │ Điểm nhận | Điểm trả | │ │ Điểm nhận | Điểm trả | ..│ │
│ │ Biển số | Giờ nhận  │  │ │                          │ │
│ │ Mã chuyến | Ghi chú │  │ │                          │ │
│ │─────────────────────── │ │──────────────────────────│ │
│ │ row 1                  │ │ row 1                    │ │
│ │ row 2                  │ │ ...                      │ │
│ └─────────────────────── │ └──────────────────────────┘ │
└──────────────────────────┴──────────────────────────────┘
```

#### States
| State | Mô tả |
|-------|-------|
| Loading | Skeleton trong 2 bảng (mỗi bảng 3 skeleton rows) |
| Empty | Text "Chưa có chuyến xe nào" trong bảng tương ứng, có sub-text gợi ý "Nhấn 'Tạo chuyến' để thêm chuyến mới" |
| Error | Text "Không tải được dữ liệu" + nút "Thử lại" |
| Data | Bảng với rows + delete icon khi hover |

#### Header controls
- **Date picker:** `<input type="date">` styled, giá trị default = today (`new Date().toISOString().split('T')[0]`)
- **Nút "Tạo chuyến":** Button variant="default", icon Plus ở trái

#### Bảng xe nhỏ / xe lớn
- Mỗi bảng là một component `ScheduleTable` riêng
- Sort theo gio_nhan ASC (đã sort từ backend)
- Columns (theo thứ tự): Điểm nhận | Điểm trả | Biển số | Giờ nhận | Mã chuyến | Ghi chú | (actions)
- Cột actions: Chỉ hiện khi hover row — trash icon (`Trash2` từ lucide-react)
- Không có pagination (dùng tất cả)

---

### Modal 1: CreateScheduleModal

3-step wizard trong 1 modal, không đổi URL.

#### Step 1 — Chọn loại xe sở hữu
```
┌─────────────────────────────────┐
│  Tạo chuyến xe              [X] │
│                                 │
│  Bước 1/3 — Loại xe sở hữu     │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │          │  │          │    │
│  │  Xe nhà  │  │ Xe ngoài │    │
│  │  (icon)  │  │  (icon)  │    │
│  └──────────┘  └──────────┘    │
│                                 │
└─────────────────────────────────┘
```
- 2 card buttons ngang hàng, chiếm full width
- Click → auto-advance sang Step 2

#### Step 2 — Chọn loại xe
```
┌─────────────────────────────────┐
│  Tạo chuyến xe              [X] │
│                                 │
│  Bước 2/3 — Cỡ xe              │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │          │  │          │    │
│  │  Xe nhỏ  │  │  Xe lớn  │    │
│  │  (icon)  │  │  (icon)  │    │
│  └──────────┘  └──────────┘    │
│                                 │
│           [← Quay lại]          │
└─────────────────────────────────┘
```
- Click → auto-advance sang Step 3

#### Step 3 — Điền thông tin
```
┌──────────────────────────────────────┐
│  Tạo chuyến xe                   [X] │
│                                      │
│  Bước 3/3 — Thông tin chuyến xe     │
│                                      │
│  Điểm nhận *                         │
│  [                              ]    │
│                                      │
│  Điểm trả *                          │
│  [                              ]    │
│                                      │
│  Giờ nhận *           Mã chuyến      │
│  [  HH:MM   ]         [  select  ]   │
│                                      │
│  Biển số *                           │
│  [select dropdown / text input]      │
│                                      │
│  Tài xế                              │
│  [read-only / text input]            │
│                                      │
│  Ghi chú                             │
│  [                              ]    │
│                                      │
│  [← Quay lại]            [Tạo chuyến]│
└──────────────────────────────────────┘
```

**Behavior chi tiết Step 3:**

| Field | Xe nhà | Xe ngoài |
|-------|--------|----------|
| Biển số | Select (vehicles filtered by loai_xe) | Text input |
| Tài xế | Read-only, tự điền từ vehicle.tai_xe[0] | Text input (optional) |

- Khi chọn xe từ dropdown → Tài xế field tự điền giá trị `tai_xe[0]`
- Nếu vehicle không có tài xế (tai_xe = []) → Tài xế field rỗng, placeholder "Không có tài xế"
- Mã chuyến: searchable select — hiển thị `ma — tuyen`, search theo ma
- Gio nhận: `<input type="time">` step="60" (chọn giờ:phút)

---

### Modal 2: DeleteConfirmDialog

AlertDialog component:
```
Tiêu đề: "Xóa chuyến xe"
Body: "Bạn có chắc muốn xóa chuyến này? Hành động này không thể hoàn tác."
Nút: [Hủy] [Xóa]
```

---

## Section 3 — Component Checklist

| Component | File | States bắt buộc |
|-----------|------|-----------------|
| `SchedulePage` | `pages/dispatch/SchedulePage.tsx` | loading, error, empty, data |
| `ScheduleTable` | `components/dispatch/ScheduleTable.tsx` | loading (skeleton), empty, data |
| `CreateScheduleModal` | `components/dispatch/CreateScheduleModal.tsx` | step1, step2, step3, submitting, error |
| `ScheduleTableRow` | (inline trong ScheduleTable) | default, hover (show delete icon) |

**States bắt buộc cho CreateScheduleModal:**
- `step: 1 | 2 | 3`
- `xe_type: 'Xe nhà' | 'Xe ngoài' | null`
- `loai_xe: 'Xe lớn' | 'Xe nhỏ' | null`
- `isSubmitting: boolean`
- `submitError: string | null`

---

## Section 4 — Validation UX

| Field | Rule | Error message | Hiển thị |
|-------|------|---------------|----------|
| diem_nhan | Required | "Điểm nhận là bắt buộc" | Inline dưới field |
| diem_tra | Required | "Điểm trả là bắt buộc" | Inline dưới field |
| gio_nhan | Required, format HH:MM | "Giờ nhận là bắt buộc" | Inline dưới field |
| bien_so (Xe nhà) | Required, must select | "Vui lòng chọn biển số xe" | Inline dưới field |
| bien_so (Xe ngoài) | Required, non-empty | "Biển số là bắt buộc" | Inline dưới field |
| Submit fail (400) | — | "Tạo chuyến thất bại. Vui lòng thử lại." | Toast error |
| Delete success | — | "Đã xóa chuyến xe" | Toast success |
| Create success | — | "Tạo chuyến thành công" | Toast success |

**Validation timing:** `onSubmit` (không validate realtime ở Step 3 — chỉ khi bấm "Tạo chuyến")

---

## Section 5 — i18n Keys

### Thêm vào `vi.json` và `en.json`

```json
"dispatch": {
  "menuTitle": "Điều hành vận tải",
  "schedule": {
    "title": "Bảng điều phối xe",
    "createTrip": "Tạo chuyến",
    "selectDate": "Chọn ngày",
    "tableXeNho": "Lịch xe nhỏ",
    "tableXeLon": "Lịch xe lớn",
    "emptyState": "Chưa có chuyến xe nào cho ngày này",
    "emptyStateSub": "Nhấn 'Tạo chuyến' để thêm chuyến mới",
    "loadError": "Không tải được dữ liệu",
    "retry": "Thử lại",
    "columns": {
      "diemNhan": "Điểm nhận",
      "diemTra": "Điểm trả",
      "bienSo": "Biển số",
      "gioNhan": "Giờ nhận",
      "maChuyen": "Mã chuyến",
      "ghiChu": "Ghi chú",
      "actions": ""
    }
  },
  "createModal": {
    "title": "Tạo chuyến xe",
    "step1Title": "Bước 1/3 — Loại xe sở hữu",
    "step2Title": "Bước 2/3 — Cỡ xe",
    "step3Title": "Bước 3/3 — Thông tin chuyến xe",
    "xeNha": "Xe nhà",
    "xeNgoai": "Xe ngoài",
    "xeNho": "Xe nhỏ",
    "xeLon": "Xe lớn",
    "back": "Quay lại",
    "submit": "Tạo chuyến",
    "submitting": "Đang tạo...",
    "diemNhan": "Điểm nhận",
    "diemTra": "Điểm trả",
    "gioNhan": "Giờ nhận",
    "maChuyen": "Mã chuyến",
    "maChuyenPlaceholder": "Chọn mã chuyến",
    "bienSo": "Biển số",
    "bienSoPlaceholder": "Chọn biển số xe",
    "bienSoInputPlaceholder": "Nhập biển số xe",
    "taiXe": "Tài xế",
    "taiXePlaceholder": "Không có tài xế",
    "taiXeInputPlaceholder": "Nhập tên tài xế (tùy chọn)",
    "ghiChu": "Ghi chú",
    "ghiChuPlaceholder": "Ghi chú thêm...",
    "createSuccess": "Tạo chuyến thành công",
    "createError": "Tạo chuyến thất bại. Vui lòng thử lại."
  },
  "deleteModal": {
    "title": "Xóa chuyến xe",
    "confirm": "Bạn có chắc muốn xóa chuyến này? Hành động này không thể hoàn tác.",
    "cancel": "Hủy",
    "submit": "Xóa",
    "deleteSuccess": "Đã xóa chuyến xe",
    "deleteError": "Xóa thất bại. Vui lòng thử lại."
  },
  "validation": {
    "diemNhanRequired": "Điểm nhận là bắt buộc",
    "diemTraRequired": "Điểm trả là bắt buộc",
    "gioNhanRequired": "Giờ nhận là bắt buộc",
    "bienSoRequired": "Biển số là bắt buộc",
    "bienSoSelectRequired": "Vui lòng chọn biển số xe"
  }
}
```

**English (en.json):**
```json
"dispatch": {
  "menuTitle": "Transport Operations",
  "schedule": {
    "title": "Dispatch Schedule",
    "createTrip": "Create Trip",
    "selectDate": "Select date",
    "tableXeNho": "Small Vehicles",
    "tableXeLon": "Large Vehicles",
    "emptyState": "No trips scheduled for this date",
    "emptyStateSub": "Click 'Create Trip' to add a new trip",
    "loadError": "Failed to load schedule",
    "retry": "Retry",
    "columns": {
      "diemNhan": "Pickup",
      "diemTra": "Dropoff",
      "bienSo": "Plate No.",
      "gioNhan": "Time",
      "maChuyen": "Trip Code",
      "ghiChu": "Note",
      "actions": ""
    }
  },
  "createModal": {
    "title": "Create Trip",
    "step1Title": "Step 1/3 — Vehicle Ownership",
    "step2Title": "Step 2/3 — Vehicle Size",
    "step3Title": "Step 3/3 — Trip Details",
    "xeNha": "Company Vehicle",
    "xeNgoai": "External Vehicle",
    "xeNho": "Small",
    "xeLon": "Large",
    "back": "Back",
    "submit": "Create Trip",
    "submitting": "Creating...",
    "diemNhan": "Pickup Point",
    "diemTra": "Dropoff Point",
    "gioNhan": "Pickup Time",
    "maChuyen": "Trip Code",
    "maChuyenPlaceholder": "Select trip code",
    "bienSo": "Plate Number",
    "bienSoPlaceholder": "Select vehicle",
    "bienSoInputPlaceholder": "Enter plate number",
    "taiXe": "Driver",
    "taiXePlaceholder": "No driver",
    "taiXeInputPlaceholder": "Enter driver name (optional)",
    "ghiChu": "Note",
    "ghiChuPlaceholder": "Additional notes...",
    "createSuccess": "Trip created successfully",
    "createError": "Failed to create trip. Please try again."
  },
  "deleteModal": {
    "title": "Delete Trip",
    "confirm": "Are you sure you want to delete this trip? This action cannot be undone.",
    "cancel": "Cancel",
    "submit": "Delete",
    "deleteSuccess": "Trip deleted",
    "deleteError": "Failed to delete. Please try again."
  },
  "validation": {
    "diemNhanRequired": "Pickup point is required",
    "diemTraRequired": "Dropoff point is required",
    "gioNhanRequired": "Pickup time is required",
    "bienSoRequired": "Plate number is required",
    "bienSoSelectRequired": "Please select a vehicle"
  }
}
```

---

## Section 6 — Web Design Guidelines Check

✅ **Tailwind classes** — dùng Tailwind v3 utility classes
✅ **Dark mode** — tất cả text/bg có `dark:` variant
✅ **Loading states** — skeleton cho table rows khi loading
✅ **Empty states** — text + sub-text + CTA
✅ **Error states** — message + retry button
✅ **Toast feedback** — sau mọi create/delete action
✅ **Confirm dialog** — trước khi delete
✅ **Disabled submit** — nút "Tạo chuyến" disabled khi isSubmitting=true
✅ **Responsive** — 2 bảng song song trên desktop (lg+), stack dọc trên mobile (sm)
✅ **i18n** — tất cả text qua i18n keys, KHÔNG hardcode

**Layout responsive:**
- Desktop (lg+): 2 bảng `grid grid-cols-2 gap-4`
- Mobile (< lg): `grid grid-cols-1` — xe nhỏ trên, xe lớn dưới

---

## Section 7 — Dependencies

- `vehicles` table: cần `GET /api/vehicles` để lấy danh sách biển số (filter by loai_xe)
- `trip_codes` table: cần `GET /api/trip-codes` để lấy danh sách mã chuyến
- Cả hai đã có API từ feature trước → reuse hooks `useVehicles` và `useTripCodes`
