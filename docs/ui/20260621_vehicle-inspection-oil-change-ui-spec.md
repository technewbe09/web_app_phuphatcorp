# UI Spec: Quản lý Đăng kiểm & Lịch sử Thay nhớt

**Ngày:** 2026-06-21
**BA Doc:** docs/ba/20260621_vehicle-inspection-oil-change-analysis.md
**Role:** ADMIN, ACCOUNTANT (manage), VIEWER (view only)

---

## 1. User Journey

### 1A. Quản lý Đăng kiểm — Happy Path

```
Sidebar → "Vehicle Data" → "Quản lý đăng kiểm"
  → Page load: loading skeleton → bảng danh sách
  → Filter: Tất cả / Còn hạn / Hết hạn / Sắp hết hạn
  → Search theo biển số
  → Click [+ Thêm đăng kiểm] → Modal form
    → Chọn xe, ngày ĐK, ngày HH, ghi chú, upload ảnh
    → Lưu → toast → list refresh
  → Click row → edit/chi tiết (xem ảnh, sửa, thêm/xóa ảnh)
  → Click icon xóa → confirm dialog → soft delete
```

### 1A. Alternative Paths
- Hủy form → đóng modal, reset
- Xe đã có đăng kiểm active → info box "Xe này đã có đăng kiểm còn hạn đến DD/MM/YYYY"
- Upload ảnh > 10MB → inline error

### 1A. Error Paths
- Load list fail → error + [Thử lại]
- Submit fail → toast error, form giữ nguyên

### 1B. Quản lý Thay nhớt — Happy Path

```
Sidebar → "Vehicle Data" → "Quản lý thay nhớt"
  → Page load: 2 pill tabs

Tab "Lịch sử thay nhớt":
  → Bảng: STT | Biển số | Tài xế | Ngày | Km | Loại nhớt | Ghi chú | ✏️🗑️
  → Filter: dropdown xe, date range
  → [+ Thêm] → modal form → save → toast → refresh

Tab "Xe cần thay nhớt":
  → Bảng: Biển số | Tài xế | Lần thay gần nhất | Km LT | Km HT | Đã đi | Ngưỡng | 🟢🟡🔴⚪ | [Thiết lập]
  → Sort: overdue → due_soon → ok
  → [Thiết lập] → modal interval → save
```

---

## 2. Screen Inventory

### Screen 1: InspectionPage
**Route:** `/vehicle-data/inspections`

```
┌─────────────────────────────────────────────────────────────┐
│ Quản lý đăng kiểm                       [+ Thêm đăng kiểm]  │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Search biển số...]  [▼ Tất cả trạng thái]               │
├─────────────────────────────────────────────────────────────┤
│ STT │ Biển số │ Tài xế │ Ngày ĐK │ Ngày HH │ Trạng thái │ ✏️🗑️│
├─────────────────────────────────────────────────────────────┤
│ ◀ 1 2 ... ▶                                                │
└─────────────────────────────────────────────────────────────┘
```

#### States

| State | UI |
|-------|-----|
| Loading | 5 dòng skeleton |
| Empty | "Chưa có dữ liệu đăng kiểm" + nút [+ Thêm] |
| Error | AlertTriangle + "Không thể tải..." + [Thử lại] |
| Populated | Table đầy đủ |

#### Status Badges

| Status | Badge |
|--------|-------|
| active | 🟢 Còn hạn |
| expired | 🔴 Hết hạn |
| superseded | ⚪ Đã thay thế |
| Sắp hết hạn (≤30d) | 🟡 Sắp hết hạn |

### Screen 2: InspectionFormModal
**Loại:** Modal `size="lg"`

```
┌─────────────────────────────────────────┐
│ Thêm/Sửa đăng kiểm                  [X] │
├─────────────────────────────────────────┤
│ Xe *                                    │
│ [▼ Chọn xe...]                          │
│                                         │
│ Ngày đăng kiểm *          Ngày HH *     │
│ [📅]                       [📅]         │
│                                         │
│ Ghi chú                                 │
│ [textarea]                              │
│                                         │
│ Ảnh scan (tùy chọn)                     │
│ ┌───────────────────────────────────┐   │
│ │  📁 Kéo thả ảnh hoặc click chọn  │   │
│ └───────────────────────────────────┘   │
│ [thumb1] [X] [thumb2] [X]               │
├─────────────────────────────────────────┤
│                           [Hủy]  [Lưu]  │
└─────────────────────────────────────────┘
```

#### Validation

| Field | Rule | Error |
|-------|------|-------|
| vehicle_id | Required | "Vui lòng chọn xe" |
| inspection_date | Required | "Vui lòng chọn ngày" |
| expiry_date | Required, > inspection_date | "Ngày HH phải sau ngày ĐK" |
| File ảnh | ≤ 10MB, image/* | "File quá lớn" / "Chỉ chấp nhận ảnh" |

### Screen 3: OilChangePage
**Route:** `/vehicle-data/oil-changes`

```
┌─────────────────────────────────────────────────────────────┐
│ Quản lý thay nhớt                                           │
├─────────────────────────────────────────────────────────────┤
│  [Lịch sử thay nhớt]  [Xe cần thay nhớt]                   │
├─────────────────────────────────────────────────────────────┤
│ TAB 1: [▼ Xe] [Từ ngày] [Đến ngày]          [+ Thêm]       │
│  STT │ Biển số │ Tài xế │ Ngày │ Km │ Loại nhớt │ Ghi chú │
│  ◀ Pagination ▶                                            │
│                                                             │
│ TAB 2:                                                      │
│  Biển số │ Tài xế │ Lần thay GN │ Km LT │ Km HT │ Đã đi │...│
│  ... │ 🔴 Quá hạn / 🟡 Sắp đến / 🟢 OK / ⚪ Ko data       │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 2 Badges

| Status | Badge | Condition |
|--------|-------|-----------|
| overdue | 🔴 Quá hạn | km_since_change > interval |
| due_soon | 🟡 Sắp đến hạn | km_since_change ≥ 0.8 × interval |
| ok | 🟢 OK | km_since_change < 0.8 × interval |
| no_data | ⚪ Ko dữ liệu | Không có fuel_record |

### Screen 4: OilChangeFormModal
**Loại:** Modal `size="md"`

```
┌─────────────────────────────────────┐
│ Thêm/Sửa thay nhớt              [X] │
├─────────────────────────────────────┤
│ Xe *                                │
│ [▼ Chọn xe]                         │
│ Ngày thay *              Số km *    │
│ [📅]                     [.... km]  │
│ Loại nhớt                           │
│ [▼ 15W-40 / 20W-50 / Khác]          │
│ Ghi chú                             │
│ [textarea]                          │
├─────────────────────────────────────┤
│                       [Hủy]  [Lưu]  │
└─────────────────────────────────────┘
```

### Screen 5: OilIntervalModal
**Loại:** Modal `size="sm"`

```
┌───────────────────────────────────────┐
│ Thiết lập ngưỡng thay nhớt        [X] │
├───────────────────────────────────────┤
│ Xe: 51C12345 - Nguyễn Văn A           │
│                                       │
│ Ngưỡng km thay nhớt *                 │
│ [  5000  ] km                         │
│ (Mặc định: 5000km)                    │
├───────────────────────────────────────┤
│                         [Hủy]  [Lưu]  │
└───────────────────────────────────────┘
```

---

## 3. Component Checklist

### Components mới

| # | Component | Path | Screen |
|---|-----------|------|--------|
| C1 | InspectionPage | `pages/admin/vehicle-data/InspectionPage.tsx` | 1 |
| C2 | InspectionFormModal | `components/vehicle-data/InspectionFormModal.tsx` | 2 |
| C3 | InspectionImagePreview | `components/vehicle-data/InspectionImagePreview.tsx` | 2 |
| C4 | OilChangePage | `pages/admin/vehicle-data/OilChangePage.tsx` | 3 |
| C5 | OilChangeFormModal | `components/vehicle-data/OilChangeFormModal.tsx` | 4 |
| C6 | OilIntervalModal | `components/vehicle-data/OilIntervalModal.tsx` | 5 |

### States required for every data component

```
[x] Loading (skeleton)
[x] Empty (message + CTA)
[x] Error (message + retry)
[x] Success (toast)
[x] Confirm dialog (delete)
[x] Submitting disabled
```

### Components cần cập nhật

| # | Component | Path | Change |
|---|-----------|------|--------|
| U1 | MainLayout | `layouts/MainLayout.tsx` | +2 sidebar sub-items |
| U2 | Router | `Router.tsx` | +2 routes |
| U3 | Vehicle type | `api/vehicleCatalogApi.ts` | +`oil_change_interval_km` |

---

## 4. Validation UX

| Case | Position | Message |
|------|----------|---------|
| Required empty | Inline | "Vui lòng..." |
| Date invalid | Inline | "Ngày hết hạn phải sau..." |
| File too large | Inline | "File quá lớn (tối đa 10MB)" |
| Existing active inspection | Info box | "Xe này đã có đăng kiểm..." |
| API validation fail | Toast error | Nội dung API |
| Server error | Toast error | "Lỗi hệ thống, thử lại" |
| Delete confirm | Dialog | "Bạn có chắc muốn xóa?" |

---

## 5. i18n Keys

```
vehicleData.inspections.title = "Quản lý đăng kiểm"
vehicleData.inspections.add = "Thêm đăng kiểm"
vehicleData.inspections.edit = "Sửa đăng kiểm"
vehicleData.inspections.delete = "Xóa đăng kiểm"
vehicleData.inspections.empty = "Chưa có dữ liệu đăng kiểm"
vehicleData.inspections.error = "Không thể tải dữ liệu"
vehicleData.inspections.searchPlaceholder = "Tìm theo biển số..."
vehicleData.inspections.filterAll = "Tất cả trạng thái"
vehicleData.inspections.filterActive = "Còn hạn"
vehicleData.inspections.filterExpired = "Hết hạn"
vehicleData.inspections.filterExpiring = "Sắp hết hạn"
vehicleData.inspections.filterSuperseded = "Đã thay thế"
vehicleData.inspections.statusActive = "Còn hạn"
vehicleData.inspections.statusExpired = "Hết hạn"
vehicleData.inspections.statusExpiring = "Sắp hết hạn"
vehicleData.inspections.statusSuperseded = "Đã thay thế"
vehicleData.inspections.fieldVehicle = "Xe"
vehicleData.inspections.fieldDate = "Ngày đăng kiểm"
vehicleData.inspections.fieldExpiry = "Ngày hết hạn"
vehicleData.inspections.fieldNotes = "Ghi chú"
vehicleData.inspections.fieldImages = "Ảnh scan"
vehicleData.inspections.uploadHint = "Kéo thả ảnh hoặc click để chọn"
vehicleData.inspections.fileTooLarge = "File quá lớn (tối đa 10MB)"
vehicleData.inspections.existingActive = "Xe này đã có đăng kiểm còn hạn đến {date}"
vehicleData.inspections.confirmDelete = "Bạn có chắc muốn xóa?"
vehicleData.inspections.message.saveSuccess = "Đã lưu đăng kiểm"
vehicleData.inspections.message.deleteSuccess = "Đã xóa bản ghi đăng kiểm"

vehicleData.oilChanges.title = "Quản lý thay nhớt"
vehicleData.oilChanges.tabHistory = "Lịch sử thay nhớt"
vehicleData.oilChanges.tabDue = "Xe cần thay nhớt"
vehicleData.oilChanges.add = "Thêm thay nhớt"
vehicleData.oilChanges.edit = "Sửa thay nhớt"
vehicleData.oilChanges.delete = "Xóa thay nhớt"
vehicleData.oilChanges.empty = "Chưa có lịch sử thay nhớt"
vehicleData.oilChanges.error = "Không thể tải dữ liệu"
vehicleData.oilChanges.fieldVehicle = "Xe"
vehicleData.oilChanges.fieldDate = "Ngày thay"
vehicleData.oilChanges.fieldOdometer = "Số km"
vehicleData.oilChanges.fieldOilType = "Loại nhớt"
vehicleData.oilChanges.fieldNotes = "Ghi chú"
vehicleData.oilChanges.oilType15W40 = "15W-40"
vehicleData.oilChanges.oilType20W50 = "20W-50"
vehicleData.oilChanges.oilTypeOther = "Khác (nhập tay)"
vehicleData.oilChanges.confirmDelete = "Bạn có chắc muốn xóa?"
vehicleData.oilChanges.message.saveSuccess = "Đã lưu thay nhớt"
vehicleData.oilChanges.message.deleteSuccess = "Đã xóa bản ghi"

vehicleData.oilDue.lastChange = "Lần thay gần nhất"
vehicleData.oilDue.kmAtChange = "Km lúc thay"
vehicleData.oilDue.currentKm = "Km hiện tại"
vehicleData.oilDue.kmSinceChange = "Đã đi"
vehicleData.oilDue.interval = "Ngưỡng"
vehicleData.oilDue.setInterval = "Thiết lập"
vehicleData.oilDue.statusOverdue = "Quá hạn"
vehicleData.oilDue.statusDueSoon = "Sắp đến hạn"
vehicleData.oilDue.statusOk = "OK"
vehicleData.oilDue.statusNoData = "Không có dữ liệu"
vehicleData.oilDue.allOk = "Tất cả xe đều trong hạn thay nhớt"
vehicleData.oilDue.intervalTitle = "Thiết lập ngưỡng thay nhớt"
vehicleData.oilDue.intervalLabel = "Ngưỡng km thay nhớt"
vehicleData.oilDue.intervalDefault = "Mặc định: 5000km"
vehicleData.oilDue.message.intervalSuccess = "Đã cập nhật ngưỡng thay nhớt"
```
