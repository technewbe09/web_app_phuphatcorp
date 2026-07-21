# UI Spec: Lịch sử Sửa xe

**Ngày:** 2026-07-21
**BA Doc:** docs/ba/20260721_vehicle-repair-history-analysis.md
**Role:** ADMIN, ACCOUNTANT (manage), VIEWER (view only)

---

## 1. User Journey

### Happy Path

```
Sidebar → "Vehicle Data" → "Lịch sử sửa xe"
  → Page load: loading skeleton → bảng tổng quan theo xe
  → Search theo biển số hoặc tài xế
  → Click [+ Thêm sửa xe] → Modal form
    → Chọn xe từ dropdown
    → Nhập ngày sửa, tên gara
    → Thêm hạng mục: nhập tên, tiền phụ tùng, tiền công
      → Có thể [+ Thêm hạng mục] để thêm dòng mới
      → Hệ thống hiển thị tổng tiền real-time
    → Lưu → toast success → modal đóng → list refresh
  → Click row → xem chi tiết bill (read-only form + danh sách items)
  → Click icon Lịch sử → modal lịch sử tất cả bill của xe đó
  → Click icon Edit trên 1 bill → mở form edit
  → Click icon Xóa → confirm dialog → soft delete
```

### Alternative Paths

```
- User click "Hủy" trong form → đóng modal, không lưu
- User thêm hạng mục rồi xóa hết → lỗi "Phải có ít nhất 1 hạng mục" khi submit
- User không có quyền manage → nút Thêm/Sửa/Xóa bị ẩn
```

### Error Paths

```
- API submit fail → toast error, form giữ nguyên, data không mất
- Load danh sách fail → error state với nút "Thử lại"
- Submit khi không có hạng mục → inline error dưới khu vực hạng mục
```

---

## 2. Screen Inventory

### Screen 1: RepairPage (Trang tổng quan)
**Route:** `/vehicle-data/repairs`
**Role:** ADMIN, ACCOUNTANT, VIEWER
**Điều kiện hiển thị:** Luôn hiển thị

```
┌──────────────────────────────────────────────────────────────────┐
│ Lịch sử sửa xe                                 [+ Thêm sửa xe]   │
├──────────────────────────────────────────────────────────────────┤
│ [🔍 Tìm theo biển số hoặc tài xế...]                             │
├──────────────────────────────────────────────────────────────────┤
│ STT │ Biển số │ Tài xế │ Sửa gần nhất │ Gara       │ Tổng tiền   │
│     │         │        │              │            │ đã sửa      │
│     │         │        │              │            │ SL sửa│ ✏️  │
├──────────────────────────────────────────────────────────────────┤
│ ◀ 1 2 ... ▶                                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Cột chi tiết:**
| Cột | Rộng | Nội dung |
|-----|------|----------|
| STT | 60px | Số thứ tự |
| Biển số | 140px | Font mono, in đậm |
| Tài xế | 200px | Tên tài xế |
| Lần sửa gần nhất | 120px | Ngày DD/MM/YYYY, "-" nếu chưa có |
| Gara gần nhất | 180px | Tên gara lần sửa gần nhất, "-" nếu chưa có |
| Tổng tiền đã sửa | 150px | Định dạng tiền VNĐ (vd: 12.500.000 ₫) |
| Số lần sửa | 80px | Số nguyên, canh giữa |
| Thao tác | 150px | Icon: 👁 Xem chi tiết, 📋 Lịch sử, ❌ Xóa |

#### States

| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Loading | Đang fetch data | 5 dòng skeleton |
| Empty | API trả về `[]`, không filter | "Chưa có dữ liệu sửa xe" + nút [+ Thêm sửa xe] |
| Empty (filter) | API trả về `[]`, có filter | "Không tìm thấy xe nào phù hợp" |
| Error | API fail | AlertTriangle + "Không thể tải dữ liệu." + nút [Thử lại] |
| Populated | Có data | Table đầy đủ |

#### Actions

| Action | Trigger | Kết quả |
|--------|---------|---------|
| Thêm sửa xe | Click nút [+ Thêm sửa xe] | Mở RepairFormModal (create mode) |
| Thêm sửa xe (từ row) | Click icon ➕ trên row | Mở RepairFormModal (create mode, xe pre-selected) |
| Xem chi tiết | Click icon 👁 trên row | Mở RepairFormModal (view mode, load bill gần nhất) |
| Lịch sử | Click icon 📋 trên row | Mở RepairHistoryModal cho xe đó |
| Xóa bill | Click icon ❌ trên row | Mở confirm dialog → soft delete |

---

### Screen 2: RepairFormModal (Tạo/Sửa/Xem bill)
**Loại:** Modal `size="lg"`
**Mở khi:** Click Thêm/Sửa/Xem

```
┌──────────────────────────────────────────────────┐
│ Thêm sửa xe mới / Sửa bill sửa xe / Chi tiết  [X]│
├──────────────────────────────────────────────────┤
│ Xe *                                              │
│ [▼ Chọn xe...]                                    │
│                                                   │
│ Ngày sửa *                     Tên gara *         │
│ [📅 DD/MM/YYYY]                [................] │
│                                                   │
│ ─────────────── HẠNG MỤC SỬA CHỮA ───────────────│
│                                                   │
│ ┌─────────────────────────────────────────────┐   │
│ │ # │ Tên hạng mục        │ Tiền phụ tùng    │   │
│ │   │                     │ Tiền công        │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 1 │ [Thay dầu máy     ] │ [ 500.000  ] ₫   │   │
│ │   │                     │ [ 100.000  ] ₫   │   │
│ │   │                                            │
│ │ 2 │ [Thay lọc gió     ] │ [ 200.000  ] ₫   │   │
│ │   │                     │ [  50.000  ] ₫   │   │
│ │   │                                            │
│ ├─────────────────────────────────────────────┤   │
│ │                            [+ Thêm hạng mục]│   │
│ └─────────────────────────────────────────────┘   │
│                                                   │
│ Tổng cộng:                            850.000 ₫  │
│                                                   │
│ Ghi chú                                           │
│ [textarea]                                        │
├──────────────────────────────────────────────────┤
│                                 [Hủy]    [Lưu]    │
└──────────────────────────────────────────────────┘
```

**Mỗi dòng hạng mục gồm:**
- Số thứ tự (1, 2, 3...)
- Input text "Tên hạng mục" (required)
- Input number "Tiền phụ tùng" (>= 0, VNĐ)
- Input number "Tiền công" (>= 0, VNĐ)
- Nút ❌ xóa hạng mục (ẩn nếu chỉ còn 1 dòng và không phải view mode)
- Dòng tổng mỗi item = parts_cost + labor_cost (hiển thị mờ, auto-calc)

**Khu vực hành động:**
- [+ Thêm hạng mục] — thêm dòng mới vào cuối danh sách
- Tổng cộng — auto-calc: SUM(tiền phụ tùng + tiền công), format VNĐ

#### States

| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Default (create) | Bấm [+ Thêm sửa xe] | Form rỗng, 1 dòng hạng mục trống, nút Lưu enabled |
| Default (create, pre-select xe) | Bấm ➕ trên row xe | Form rỗng, xe đã chọn sẵn, 1 dòng hạng mục trống |
| Edit mode | Bấm sửa từ history | Form pre-filled, danh sách items đầy đủ, nút Lưu enabled |
| View mode | Bấm 👁 xem chi tiết | Form read-only, tất cả field disabled, nút [Đóng] |
| Submitting | Click [Lưu] | Nút disabled + spinner, toàn form lock |
| Submit error | API fail | Toast error, form mở lại, data giữ nguyên |
| Submit success | API success | Toast success, modal đóng, list refresh |

#### Validation

| Field | Rule | Error message |
|-------|------|---------------|
| vehicle_id | Required | "Vui lòng chọn xe" |
| repair_date | Required | "Vui lòng chọn ngày sửa" |
| garage_name | Required | "Vui lòng nhập tên gara" |
| items[] | Ít nhất 1 item | "Phải có ít nhất 1 hạng mục" |
| items[].item_name | Required, không rỗng | "Vui lòng nhập tên hạng mục" |
| items[].parts_cost | >= 0, số nguyên | "Tiền phụ tùng không được âm" |
| items[].labor_cost | >= 0, số nguyên | "Tiền công không được âm" |

---

### Screen 3: RepairHistoryModal (Lịch sử sửa xe)
**Loại:** Modal `size="xl"`
**Mở khi:** Click 📋 Lịch sử trên row

```
┌──────────────────────────────────────────────────────────────┐
│ Lịch sử sửa xe: 51H-12345 - Nguyễn Văn A                 [X]│
├──────────────────────────────────────────────────────────────┤
│ STT │ Ngày sửa   │ Gara            │ Tổng tiền   │ H.mục │   │
├──────────────────────────────────────────────────────────────┤
│ 1   │ 15/07/2026 │ Gara Ô Tô ABC   │ 850.000 ₫   │   2   │👁✏️❌│
│ 2   │ 01/06/2026 │ Gara XYZ        │ 2.500.000 ₫ │   4   │👁✏️❌│
│ 3   │ 10/03/2026 │ Gara DEF        │ 450.000 ₫   │   1   │👁✏️❌│
├──────────────────────────────────────────────────────────────┤
│ Tổng cộng: 3 bill — Tổng tiền: 3.800.000 ₫                  │
├──────────────────────────────────────────────────────────────┤
│ ◀ 1 ▶                                                        │
└──────────────────────────────────────────────────────────────┘
```

**Footer tổng kết:** Tổng số bill + tổng tiền sửa xe của xe này.

#### States

| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Loading | Đang fetch data | 3 dòng skeleton |
| Empty | Chưa có bill nào | "Xe này chưa có lịch sử sửa chữa" |
| Error | API fail | AlertTriangle + "Không thể tải lịch sử" + [Thử lại] |
| Populated | Có data | Table + footer tổng kết |

#### Actions trên mỗi dòng

| Action | Icon | Kết quả |
|--------|------|---------|
| Xem chi tiết | 👁 | Mở RepairFormModal (view mode) cho bill đó |
| Sửa | ✏️ | Mở RepairFormModal (edit mode) cho bill đó |
| Xóa | ❌ | Confirm dialog → soft delete → refresh history |

#### Confirm Dialog (Xóa bill)

```
┌─────────────────────────────────────────────┐
│ Xác nhận xóa                            [X] │
├─────────────────────────────────────────────┤
│ Bạn có chắc muốn xóa bill sửa xe ngày       │
│ 15/07/2026 tại Gara Ô Tô ABC?              │
│                                             │
│ Hành động này không thể hoàn tác.            │
├─────────────────────────────────────────────┤
│                               [Hủy]  [Xóa]  │
└─────────────────────────────────────────────┘
```

---

## 3. Component Checklist

### Components mới

| # | Component | Path | Screen |
|---|-----------|------|--------|
| C1 | RepairPage | `pages/admin/vehicle-data/RepairPage.tsx` | 1 |
| C2 | RepairFormModal | `components/vehicle-data/RepairFormModal.tsx` | 2 |
| C3 | RepairHistoryModal | `components/vehicle-data/RepairHistoryModal.tsx` | 3 |

### Components cần cập nhật

| # | Component | Path | Change |
|---|-----------|------|--------|
| U1 | MainLayout | `layouts/MainLayout.tsx` | +1 sidebar sub-item "Lịch sử sửa xe" |
| U2 | Router | `Router.tsx` | +1 route `/vehicle-data/repairs` |

### States bắt buộc

```
[x] Loading (skeleton)
[x] Empty (message + CTA)
[x] Error (message + retry)
[x] Success (toast)
[x] Confirm dialog (delete)
[x] Submitting disabled
```

---

## 4. Validation UX

| Trường hợp | Hiển thị ở đâu | Khi nào show | Ví dụ message |
|------------|---------------|--------------|---------------|
| Required field trống | Inline dưới field | Khi submit | "Vui lòng chọn xe" |
| Không có hạng mục nào | Inline dưới item list | Khi submit | "Phải có ít nhất 1 hạng mục" |
| Tiền âm | Inline dưới field | Khi blur | "Số tiền không được âm" |
| Tên hạng mục rỗng | Inline dưới field | Khi blur/submit | "Vui lòng nhập tên hạng mục" |
| Bill đã bị xóa (404) | Toast error | Sau khi submit | "Không tìm thấy bill sửa xe" |
| Server error (500) | Toast error | Sau khi submit | "Lỗi hệ thống, vui lòng thử lại" |
| Session hết hạn (401) | Redirect login | Khi nhận 401 | — |
| Xóa bill | Confirm dialog | Click icon xóa | "Bạn có chắc muốn xóa bill sửa xe ngày {date} tại {garage}?" |

---

## 5. i18n Keys

```
vehicleData.repairs.title = "Lịch sử sửa xe"
vehicleData.repairs.add = "Thêm sửa xe"
vehicleData.repairs.edit = "Sửa bill sửa xe"
vehicleData.repairs.view = "Chi tiết sửa xe"
vehicleData.repairs.delete = "Xóa bill"
vehicleData.repairs.empty = "Chưa có dữ liệu sửa xe"
vehicleData.repairs.emptyFilter = "Không tìm thấy xe nào phù hợp"
vehicleData.repairs.error = "Không thể tải dữ liệu"
vehicleData.repairs.retry = "Thử lại"
vehicleData.repairs.searchPlaceholder = "Tìm theo biển số hoặc tài xế..."

vehicleData.repairs.fieldVehicle = "Xe"
vehicleData.repairs.fieldDate = "Ngày sửa"
vehicleData.repairs.fieldGarage = "Tên gara"
vehicleData.repairs.fieldNotes = "Ghi chú"
vehicleData.repairs.fieldItems = "Hạng mục sửa chữa"
vehicleData.repairs.fieldItemName = "Tên hạng mục"
vehicleData.repairs.fieldPartsCost = "Tiền phụ tùng"
vehicleData.repairs.fieldLaborCost = "Tiền công"
vehicleData.repairs.addItem = "Thêm hạng mục"
vehicleData.repairs.total = "Tổng cộng"
vehicleData.repairs.totalAmount = "Tổng tiền đã sửa"

vehicleData.repairs.table.colIndex = "STT"
vehicleData.repairs.table.colPlate = "Biển số"
vehicleData.repairs.table.colDriver = "Tài xế"
vehicleData.repairs.table.colLatestDate = "Sửa gần nhất"
vehicleData.repairs.table.colLatestGarage = "Gara gần nhất"
vehicleData.repairs.table.colTotalAmount = "Tổng tiền đã sửa"
vehicleData.repairs.table.colCount = "Số lần sửa"
vehicleData.repairs.table.colActions = "Thao tác"
vehicleData.repairs.table.colItemCount = "Số hạng mục"

vehicleData.repairs.history.title = "Lịch sử sửa xe: {plate} - {driver}"
vehicleData.repairs.history.empty = "Xe này chưa có lịch sử sửa chữa"
vehicleData.repairs.history.summary = "{count} bill — Tổng tiền: {amount}"

vehicleData.repairs.validation.vehicleRequired = "Vui lòng chọn xe"
vehicleData.repairs.validation.dateRequired = "Vui lòng chọn ngày sửa"
vehicleData.repairs.validation.garageRequired = "Vui lòng nhập tên gara"
vehicleData.repairs.validation.itemsRequired = "Phải có ít nhất 1 hạng mục"
vehicleData.repairs.validation.itemNameRequired = "Vui lòng nhập tên hạng mục"
vehicleData.repairs.validation.amountNegative = "Số tiền không được âm"

vehicleData.repairs.confirmDelete = "Bạn có chắc muốn xóa bill sửa xe ngày {date} tại {garage}?"
vehicleData.repairs.confirmDeleteWarning = "Hành động này không thể hoàn tác."

vehicleData.repairs.message.createSuccess = "Đã thêm bill sửa xe"
vehicleData.repairs.message.updateSuccess = "Đã cập nhật bill sửa xe"
vehicleData.repairs.message.deleteSuccess = "Đã xóa bill sửa xe"
vehicleData.repairs.message.error = "Lỗi. Vui lòng thử lại."
```
