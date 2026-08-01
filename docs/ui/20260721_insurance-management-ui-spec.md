# UI Spec: Quản lý bảo hiểm (Vehicle Insurance)
**Ngày:** 2026-07-21
**BA Doc:** docs/ba/20260721_insurance-management-analysis.md
**Role liên quan:** ADMIN, ACCOUNTANT, VIEWER

---

## 1. User Journey

### Happy Path
```
Sidebar → "Quản lý dữ liệu xe" → "Quản lý bảo hiểm"
  → Trang summary hiển thị (loading skeleton → data)
  → User xem danh sách bảo hiểm theo từng xe
  → User tìm kiếm biển số hoặc filter trạng thái
  → User click "+" trên 1 xe → Modal "Thêm bảo hiểm" mở (xe pre-selected)
  → User nhập: Ngày mua, Ngày hết hạn, Ghi chú, upload file
  → User click "Lưu" → API tạo → toast success → modal đóng → list refresh
```

### Alternative Paths
```
- User click "Hủy" trong form → đóng modal, không lưu
- User click icon mắt → mở modal view (read-only)
- User click icon bút → mở modal edit (pre-filled)
- User click icon lịch sử → mở modal lịch sử bảo hiểm của xe đó
- User click icon xóa → confirm dialog → confirm → soft delete → refresh
- VIEWER: không thấy nút thêm/sửa/xóa, chỉ thấy icon mắt + lịch sử
- User không có quyền vehicle_data.view → menu ẩn, không truy cập được
```

### Error Paths
```
- API submit fail → toast error, form vẫn mở, data không mất
- Load danh sách fail → error state với icon AlertTriangle + nút "Thử lại"
- Upload file > 50MB → toast error "File quá lớn (tối đa 50MB)"
- expiry_date < purchase_date → inline error "Ngày hết hạn phải sau ngày mua"
- expiry_date mới ≤ expiry_date active hiện tại → toast error "Ngày hết hạn phải sau ngày hết hạn hiện tại (dd/mm/yyyy)"
- Chưa chọn xe → inline error "Vui lòng chọn xe"
```

---

## 2. Screen Inventory

### Screen 1: InsurancePage (Trang danh sách tổng quan)
**Route:** `/vehicle-data/insurances`
**Role:** ADMIN, ACCOUNTANT, VIEWER
**Điều kiện hiển thị:** Có permission `vehicle_data.view` hoặc `vehicle_data.manage`

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Quản lý bảo hiểm                           [+ Thêm bảo hiểm]│
├──────────────────────────┬──────────────────────────────────┤
│ 🔍 Tìm kiếm biển số...   │ [Trạng thái: Tất cả ▾]          │
├──────────────────────────┴──────────────────────────────────┤
│ # │ Biển số   │ Tài xế   │ Mua gần nhất │ Hết hạn   │ TT   │ Số lần │ Thao tác   │
│───┼───────────┼──────────┼──────────────┼───────────┼──────┼────────┼────────────│
│ 1 │ 51C-12345 │ Nguyễn A │ 15/07/2026   │ 15/07/2027│Còn hạn│ 3      │ 👁️ 📋 ✏️ 🗑️ │
│ 2 │ 51C-67890 │ Trần B   │ --           │ --        │Chưa có│ 0      │ ➕          │
├─────────────────────────────────────────────────────────────┤
│                          ← 1 2 3 ... 5 →                    │
└─────────────────────────────────────────────────────────────┘
```

#### States
| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Loading | Đang fetch summary | 5 dòng skeleton (animate-pulse) |
| Empty (no data at all) | API trả về [] | Icon + "Chưa có dữ liệu bảo hiểm." + nút "Thêm bảo hiểm" (nếu có quyền manage) |
| Empty (filter no match) | Search/filter không có kết quả | "Không tìm thấy xe nào phù hợp." |
| Error | API fail | AlertTriangle + "Không thể tải dữ liệu." + nút "Thử lại" |
| Populated | Có data | Table đầy đủ với badge trạng thái |

#### Badge Trạng thái
| Điều kiện | Màu | Text |
|-----------|------|------|
| Không có bảo hiểm | neutral/gray | "Chưa có" |
| expiry_date < today | red | "Hết hạn" |
| expiry_date trong 30 ngày tới | yellow | "Sắp hết hạn" |
| expiry_date >= today và > 30 ngày | green | "Còn hạn" |

#### Actions
| Action | Trigger | Hiển thị với role | Kết quả |
|--------|---------|-------------------|---------|
| Thêm bảo hiểm mới | Click nút "+ Thêm bảo hiểm" | ADMIN, ACCOUNTANT | Mở InsuranceFormModal (create, chưa chọn xe) |
| Thêm cho xe cụ thể | Click "+" trên dòng xe | ADMIN, ACCOUNTANT | Mở InsuranceFormModal (create, pre-selected xe) |
| Xem chi tiết | Click 👁️ | Tất cả | Mở InsuranceFormModal (view mode) |
| Sửa | Click ✏️ | ADMIN, ACCOUNTANT | Mở InsuranceFormModal (edit mode) |
| Xem lịch sử | Click 📋 | Tất cả | Mở InsuranceHistoryModal |
| Xóa | Click 🗑️ | ADMIN, ACCOUNTANT | Confirm dialog → API delete → refresh |

---

### Screen 2: InsuranceFormModal (Modal thêm/sửa/xem)
**Loại:** Modal
**Mở khi:** Click "Thêm bảo hiểm", "+" trên dòng xe, ✏️, hoặc 👁️
**Size:** max-w-lg (tương tự InspectionFormModal)

#### Layout
```
┌─────────────────────────────────────┐
│ Thêm bảo hiểm / Sửa bảo hiểm    [X] │
├─────────────────────────────────────┤
│                                     │
│ Xe                                  │
│ [Chọn xe... (51C-12345 - Nguyễn A)] │
│                                     │
│ Ngày mua bảo hiểm *                 │
│ [DD/MM/YYYY              📅]       │
│                                     │
│ Ngày hết hạn bảo hiểm *             │
│ [DD/MM/YYYY              📅]       │
│                                     │
│ Ghi chú                             │
│ [                              ...] │
│                                     │
│ File đính kèm                       │
│ ┌───────────────────────────────┐   │
│ │   📎 Kéo thả hoặc click       │   │
│ │   để tải file lên             │   │
│ └───────────────────────────────┘   │
│ 📄 hop-dong-BV.pdf          [X]    │
│ 📄 giay-chung-nhan.jpg      [X]    │
│                                     │
├─────────────────────────────────────┤
│              [Hủy]    [Lưu]        │
└─────────────────────────────────────┘
```

#### Mode variants:
| Mode | Tiêu đề | Form fields | File upload | Nút |
|------|---------|-------------|-------------|-----|
| Create | "Thêm bảo hiểm" | Rỗng/Pre-selected xe | Hiển thị | Hủy + Lưu |
| Edit | "Sửa bảo hiểm" | Pre-filled, xe disabled | Hiển thị (thêm + xóa ảnh cũ) | Hủy + Lưu |
| View | "Chi tiết bảo hiểm" | Read-only, tất cả disabled | Chỉ xem file (không thêm/xóa) | Đóng |

#### States
| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Default | Mở modal create | Form rỗng, nút Lưu enabled, chưa có lỗi |
| Edit mode | Mở từ nút sửa | Form pre-filled, xe disabled, nút Lưu enabled |
| View mode | Mở từ nút xem | Tất cả read-only, chỉ có nút Đóng |
| Submitting | Click Lưu | Nút disabled + spinner "Đang lưu...", form lock |
| Validation error | Submit với field thiếu/sai | Inline error đỏ dưới field vi phạm |
| Submit error | API trả lỗi | Toast error, form mở lại, data giữ nguyên |
| Submit success | API success | Toast success, modal đóng, list refresh |

---

### Screen 3: InsuranceHistoryModal (Modal lịch sử bảo hiểm)
**Loại:** Modal
**Mở khi:** Click 📋 trên dòng xe
**Size:** max-w-3xl

#### Layout
```
┌──────────────────────────────────────────────────────────┐
│ Lịch sử bảo hiểm - 51C-12345 (Nguyễn Văn A)         [X] │
├──────────────────────────────────────────────────────────┤
│ # │ Ngày mua   │ Ngày hết hạn │ Trạng thái │ Ghi chú │File│
│───┼────────────┼──────────────┼────────────┼─────────┼────│
│ 1 │ 15/07/2026 │ 15/07/2027   │ Còn hạn 🟢 │ Bảo Việt│ 2  │
│   │ ▸ File: hop-dong-BV.pdf (1.2MB)                      │
│   │ ▸ File: giay-chung-nhan.jpg (500KB)                  │
│ 2 │ 15/07/2025 │ 15/07/2026   │ Đã thay thế⚫│ PTI     │ 1  │
│ 3 │ 15/07/2024 │ 15/07/2025   │ Hết hạn 🔴  │ MIC     │ 0  │
├──────────────────────────────────────────────────────────┤
│                                            [Đóng]        │
└──────────────────────────────────────────────────────────┘
```

#### States
| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Loading | Đang fetch history | Spinner giữa modal |
| Empty | Xe chưa có lịch sử | "Xe chưa có lịch sử bảo hiểm." |
| Error | API fail | "Không thể tải lịch sử." + Retry |
| Populated | Có data | Table với expandable rows |

#### Expand behavior
- Mỗi dòng có nút ▸/▾ để expand/collapse
- Khi expand: hiển thị danh sách file đính kèm (thumbnail cho ảnh, icon FileText cho PDF/khác)
- Click file → mở presigned URL trong tab mới

---

## 3. Component Checklist

### Danh sách components cần tạo / cập nhật

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| InsurancePage | `frontend/src/pages/admin/vehicle-data/InsurancePage.tsx` | Mới | Screen 1 |
| InsuranceFormModal | `frontend/src/components/vehicle-data/InsuranceFormModal.tsx` | Mới | Screen 2 |
| InsuranceHistoryModal | `frontend/src/components/vehicle-data/InsuranceHistoryModal.tsx` | Mới | Screen 3 |
| vehicleInsuranceApi | `frontend/src/api/vehicleInsuranceApi.ts` | Mới | API calls |
| useVehicleInsurances | `frontend/src/hooks/useVehicleInsurances.ts` | Mới | React Query hooks |
| Router.tsx | `frontend/src/Router.tsx` | Cập nhật | Thêm route `/vehicle-data/insurances` |
| MainLayout.tsx | `frontend/src/layouts/MainLayout.tsx` | Cập nhật | Thêm menu "Quản lý bảo hiểm" |

### States bắt buộc mọi component data phải có

```
- [x] Loading state  — skeleton hoặc spinner (không để blank)
- [x] Empty state    — message rõ ràng, có CTA nếu user có thể tạo data
- [x] Error state    — thông báo lỗi + nút "Thử lại"
- [x] Success feedback — toast message sau mọi create / update / delete
- [x] Confirm dialog — trước mọi action destructive (delete)
- [x] Disabled state — nút submit khi đang submitting
```

---

## 4. Validation UX

| Trường hợp | Hiển thị ở đâu | Khi nào show | Ví dụ message |
|------------|---------------|--------------|---------------|
| Chưa chọn xe | Inline dưới select | Khi submit | "Vui lòng chọn xe" |
| purchase_date trống | Inline dưới field | Khi submit | "Vui lòng chọn ngày mua bảo hiểm" |
| expiry_date trống | Inline dưới field | Khi submit | "Vui lòng chọn ngày hết hạn" |
| expiry_date < purchase_date | Inline dưới expiry_date | Khi submit | "Ngày hết hạn phải sau ngày mua" |
| expiry_date mới ≤ expiry_date active hiện tại (BR-08) | Toast error | API trả lỗi 400 | "Ngày hết hạn phải sau ngày hết hạn hiện tại (dd/mm/yyyy)" |
| File > 50MB | Toast error | Khi chọn file | "File quá lớn (tối đa 50MB)" |
| Business rule vi phạm (API) | Toast error | Sau khi submit | "Lỗi hệ thống, vui lòng thử lại" |
| Server error (500) | Toast error | Sau khi submit | "Lỗi hệ thống, vui lòng thử lại" |
| Session hết hạn (401) | Redirect login | Khi nhận 401 | — |

---

## 5. i18n Keys cần thêm

```
insurance.page.title = "Quản lý bảo hiểm"
insurance.page.empty = "Chưa có dữ liệu bảo hiểm."
insurance.page.emptyFilter = "Không tìm thấy xe nào phù hợp."
insurance.page.error = "Không thể tải dữ liệu."
insurance.page.addButton = "Thêm bảo hiểm"
insurance.page.retry = "Thử lại"

insurance.status.active = "Còn hạn"
insurance.status.expiring = "Sắp hết hạn"
insurance.status.expired = "Hết hạn"
insurance.status.noInsurance = "Chưa có"
insurance.status.superseded = "Đã thay thế"
insurance.status.deleted = "Đã xóa"

insurance.filter.all = "Tất cả"
insurance.filter.active = "Còn hạn"
insurance.filter.expiring = "Sắp hết hạn"
insurance.filter.expired = "Hết hạn"
insurance.filter.noInsurance = "Chưa có bảo hiểm"

insurance.table.no = "#"
insurance.table.plateNumber = "Biển số"
insurance.table.driver = "Tài xế"
insurance.table.latestPurchase = "Mua gần nhất"
insurance.table.expiryDate = "Ngày hết hạn"
insurance.table.status = "Trạng thái"
insurance.table.count = "Số lần"
insurance.table.actions = "Thao tác"

insurance.form.createTitle = "Thêm bảo hiểm"
insurance.form.editTitle = "Sửa bảo hiểm"
insurance.form.viewTitle = "Chi tiết bảo hiểm"
insurance.form.vehicle = "Xe"
insurance.form.vehiclePlaceholder = "Chọn xe..."
insurance.form.purchaseDate = "Ngày mua bảo hiểm"
insurance.form.expiryDate = "Ngày hết hạn bảo hiểm"
insurance.form.notes = "Ghi chú"
insurance.form.attachments = "File đính kèm"
insurance.form.dropzone = "Kéo thả hoặc click để tải file lên"
insurance.form.cancel = "Hủy"
insurance.form.save = "Lưu"
insurance.form.close = "Đóng"
insurance.form.saving = "Đang lưu..."

insurance.history.title = "Lịch sử bảo hiểm"
insurance.history.empty = "Xe chưa có lịch sử bảo hiểm."
insurance.history.error = "Không thể tải lịch sử."

insurance.validation.vehicleRequired = "Vui lòng chọn xe"
insurance.validation.purchaseDateRequired = "Vui lòng chọn ngày mua bảo hiểm"
insurance.validation.expiryDateRequired = "Vui lòng chọn ngày hết hạn"
insurance.validation.expiryAfterPurchase = "Ngày hết hạn phải sau ngày mua"
insurance.validation.expiryAfterActiveExpiry = "Ngày hết hạn phải sau ngày hết hạn hiện tại"
insurance.validation.fileTooLarge = "File quá lớn (tối đa 50MB)"

insurance.confirm.delete = "Bạn có chắc muốn xóa bảo hiểm này?"

insurance.message.success.create = "Đã thêm bảo hiểm thành công"
insurance.message.success.update = "Đã cập nhật bảo hiểm thành công"
insurance.message.success.delete = "Đã xóa bảo hiểm thành công"
insurance.message.success.uploadImage = "Đã tải file lên thành công"
insurance.message.error.create = "Không thể thêm bảo hiểm"
insurance.message.error.update = "Không thể cập nhật bảo hiểm"
insurance.message.error.delete = "Không thể xóa bảo hiểm"

sidebar.insurance = "Quản lý bảo hiểm"
```
