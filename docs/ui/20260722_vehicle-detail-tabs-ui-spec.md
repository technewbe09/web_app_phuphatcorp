# UI Spec: Tab chi tiết xe trong Danh mục xe

**Ngày:** 2026-07-22
**Role liên quan:** Tất cả authenticated users (có permission xem từng module tương ứng)

---

## 1. User Journey

### Happy Path
```
Sidebar → "Quản lý danh mục" → "Danh mục xe"
  → Bảng danh sách xe hiển thị (loading skeleton → data)
  → User click vào biển số xe (link màu xanh)
  → Navigate sang /catalog/vehicles/:id
  → VehicleDetailPage hiển thị:
      - Header: Biển số, Tài xế, Loại xe, Trạng thái + nút "← Quay lại"
      - Quick stats: 5 cards (Đăng kiểm, Bảo hiểm, Thay nhớt, Sửa chữa, Dầu)
      - Tab bar: "Dữ liệu dầu" | "Lịch sử sửa xe" | "Bảo hiểm" | "Thay nhớt" | "Đăng kiểm"
  → Tab mặc định: "Đăng kiểm" (active)
  → User click tab khác → chuyển nội dung bên dưới
  → Mỗi tab hiển thị bảng dữ liệu scoped cho xe đó
  → User click "Thêm mới" trong tab → mở modal tạo record (pre-filled vehicle_id)
  → User click "← Quay lại" → trở về /catalog/vehicles
```

### Alternative Paths
```
- User chưa có dữ liệu nào của xe → tab hiển thị empty state "Chưa có dữ liệu" + nút "Thêm mới"
- User không có permission manage → ẩn nút "Thêm mới" / "Xóa", chỉ xem
- User không có permission view → ẩn tab tương ứng
- User truy cập trực tiếp URL /catalog/vehicles/999 (xe không tồn tại) → error state "Không tìm thấy xe"
```

### Error Paths
```
- Load vehicle info fail → error state + nút "Thử lại"
- Load tab data fail → error state trong tab content + nút "Thử lại"
- Submit form fail trong modal → toast error, form mở lại
- Không có kết nối mạng → toast "Lỗi kết nối"
```

---

## 2. Screen Inventory

### Screen 1: VehicleCatalogPage (cập nhật)

**Route:** `/catalog/vehicles`
**Thay đổi so với hiện tại:** 

| Zone | Thay đổi |
|------|----------|
| Cột "Biển số" | Chuyển từ plain text → link màu xanh (`text-blue-600 hover:underline cursor-pointer`), click → `navigate(/catalog/vehicles/${vehicle.id})` |
| Thao tác | Giữ nguyên: Sửa, Toggle active/deactive |

---

### Screen 2: VehicleDetailPage (MỚI)

**Route:** `/catalog/vehicles/:id`
**Layout:** MainLayout sidebar + content area, `p-6 space-y-6`

```
┌──────────────────────────────────────────────────────┐
│ [← Quay lại]                                         │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 51H-12345                    [Active badge]      │ │
│ │ Nguyễn Văn A - Xe nhà                           │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ │Đăng kiểm │ │Bảo hiểm │ │Thay nhớt│ │ Sửa chữa │ │ Dữ liệu │
│ │Còn hạn  │ │Hết hạn  │ │Quá hạn  │ │ 3 lần    │ │  dầu    │
│ │15/09/26 │ │01/06/26 │ │2,500 km │ │45.2 tr   │ │5.2 L/100│
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
│                                                      │
│ ┌──────┬──────┬──────┬──────┬──────┐                │
│ │Dữ liệu│LS sửa│Bảo   │Thay  │Đăng  │                │
│ │ dầu  │ xe   │hiểm  │nhớt  │kiểm  │                │
│ └──────┴──────┴──────┴──────┴──────┘                │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [Filter/Search]              [+ Thêm đăng kiểm]  │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ Table (scoped to this vehicle)                   │ │
│ │ STT | Ngày ĐK | Ngày HH | Ghi chú | Thao tác    │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ [Pagination]                                     │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Điều kiện hiển thị:**
- Tab chỉ hiển thị nếu user có permission view tương ứng:
  - `fuel.view` → tab "Dữ liệu dầu"
  - `vehicle_data.view` → các tab còn lại
- Nút "Thêm mới" chỉ hiển thị nếu user có permission manage
- ADMIN luôn thấy tất cả

**States:**

| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Loading (vehicle info) | Đang fetch GET /api/vehicles (detail) | Skeleton: block xám cho header + stats cards + tab bar |
| Error (vehicle info) | API fail | "Không tìm thấy xe" + nút "← Quay lại" |
| Loading (tab data) | Đang fetch data cho tab | Skeleton rows trong table (5 dòng) |
| Empty (tab) | API trả về [] | "Chưa có dữ liệu [tên tab]" + nút "Thêm mới" (nếu có permission) |
| Error (tab data) | API fail | "Không thể tải dữ liệu" + nút "Thử lại" |
| Populated | Có data | Table với data |

**Actions:**

| Action | Trigger | Kết quả |
|--------|---------|---------|
| Quay lại | Click "← Quay lại" | Navigate về `/catalog/vehicles` |
| Chọn tab | Click tab button | Fetch data cho tab đó, hiển thị bảng |
| Thêm mới | Click "+ Thêm [tên]" | Mở modal form tương ứng, vehicle_id pre-filled |
| Sửa | Click icon Pencil trong table | Mở modal edit |
| Xóa | Click icon Trash2 trong table | Confirm dialog → soft/hard delete → refresh tab |

---

## 3. Tab Content Specifications

### Tab 1: Dữ liệu dầu (Fuel Data)

**API:** `GET /api/fuel-records?vehicle_id=:id&page=&limit=`
**Hiển thị:**

| Cột | Width | Source |
|-----|-------|--------|
| STT | 14 | Index |
| Ngày đổ | 32 | record_date |
| Km cũ | 28 (right) | odometer_old |
| Km mới | 28 (right) | odometer_new |
| Khoảng cách | 28 (right) | distance |
| Lít | 24 (right) | liters |
| Tiêu hao (L/100km) | 28 (right) | fuel_rate |
| Đơn giá | 28 (right) | unit_price |
| Thành tiền | 28 (right) | total_cost |
| Địa điểm | 36 | location |
| Ghi chú | flexible | notes |
| Thao tác | 24 (center) | Edit + Delete icons |

**Permission:** `fuel.view` (view), `fuel.manage` (add/edit/delete)

**Stats card:** Hiển thị tiêu hao trung bình (L/100km) từ fuel_rate các lần gần nhất

---

### Tab 2: Lịch sử sửa xe (Repair History)

**API:** `GET /api/vehicle-repairs/vehicle/:id?page=&limit=`
**Hiển thị:**

| Cột | Width | Source |
|-----|-------|--------|
| STT | 14 | Index |
| Ngày sửa | 32 | repair_date |
| Garage | flexible | garage_name |
| Chi tiết sửa chữa | flexible | item_name (items[0]) + " (+N)" nếu nhiều items |
| Tổng tiền | 28 (right) | total_amount |
| Ghi chú | flexible | notes |
| Thao tác | 24 (center) | Eye (view detail) + Edit + Delete |

**Permission:** `vehicle_data.view` (view), `vehicle_data.manage` (add/edit/delete)

**Stats card:** Số lần sửa chữa + tổng tiền sửa chữa

---

### Tab 3: Bảo hiểm (Insurance)

**API:** `GET /api/vehicle-insurances?vehicle_id=:id&page=&limit=`
**Hiển thị:**

| Cột | Width | Source |
|-----|-------|--------|
| STT | 14 | Index |
| Ngày mua | 32 | purchase_date |
| Ngày hết hạn | 32 | expiry_date |
| Trạng thái | 28 (center) | status badge (active/expired/superseded) |
| Ghi chú | flexible | notes |
| Thao tác | 24 (center) | Eye (view images) + Edit + Delete |

**Note:** Chỉ hiển thị cho xe có `vehicle_type = 'Xe nhà'`. Với `Xe ngoài`, hiển thị message "Xe ngoài không áp dụng bảo hiểm."

**Permission:** `vehicle_data.view` (view), `vehicle_data.manage` (add/edit/delete)

**Stats card:** Trạng thái bảo hiểm hiện tại (Còn hạn / Hết hạn / Chưa có) + ngày hết hạn

---

### Tab 4: Thay nhớt (Oil Change)

**API:** `GET /api/vehicle-oil-changes?vehicle_id=:id&page=&limit=`
**Hiển thị:**

| Cột | Width | Source |
|-----|-------|--------|
| STT | 14 | Index |
| Ngày thay | 32 | change_date |
| Số km | 28 (right) | odometer_at |
| Loại nhớt | 32 | oil_type |
| Ghi chú | flexible | notes |
| Thao tác | 24 (center) | Edit + Delete |

**Permission:** `vehicle_data.view` (view), `vehicle_data.manage` (add/edit/delete)

**Stats card:** Km hiện tại, km đã đi từ lần thay gần nhất, trạng thái (OK / Sắp đến hạn / Quá hạn / Chưa có dữ liệu)

---

### Tab 5: Đăng kiểm (Inspection) — **Tab mặc định**

**API:** `GET /api/vehicle-inspections?vehicle_id=:id&page=&limit=`
**Hiển thị:**

| Cột | Width | Source |
|-----|-------|--------|
| STT | 14 | Index |
| Ngày đăng kiểm | 32 | inspection_date |
| Ngày hết hạn | 32 | expiry_date |
| Trạng thái | 28 (center) | status badge (active/expired/superseded) |
| Ghi chú | flexible | notes |
| Thao tác | 24 (center) | Eye (view images) + Edit + Delete |

**Permission:** `vehicle_data.view` (view), `vehicle_data.manage` (add/edit/delete)

**Stats card:** Trạng thái đăng kiểm hiện tại (Còn hạn / Sắp hết hạn / Hết hạn / Chưa đăng kiểm) + ngày hết hạn

---

## 4. Stats Cards (Vehicle Summary)

Backend cần cung cấp 1 API `GET /api/vehicles/:id/summary` để lấy nhanh thông tin summary cho 5 cards, tránh gọi 5 API riêng.

```json
// Response format
{
  "success": true,
  "data": {
    "inspection": {
      "status": "active" | "expiring" | "expired" | "none",
      "expiry_date": "2026-09-15",
      "count": 3
    },
    "insurance": {
      "status": "active" | "expiring" | "expired" | "none" | "not_applicable",
      "expiry_date": "2026-06-01",
      "count": 2
    },
    "oil_change": {
      "status": "ok" | "due_soon" | "overdue" | "no_data",
      "current_km": 125000,
      "km_since_change": 2500
    },
    "repair": {
      "count": 3,
      "total_amount": 45200000
    },
    "fuel": {
      "avg_fuel_rate": 5.2,
      "last_odometer": 125000,
      "record_count": 45
    }
  }
}
```

**Card colors:**
| Status | Card accent |
|--------|-------------|
| Còn hạn / OK | Green border-left (`border-green-500`) |
| Sắp hết hạn / Sắp đến hạn | Yellow border-left (`border-yellow-500`) |
| Hết hạn / Quá hạn | Red border-left (`border-red-500`) |
| Chưa có / No data | Neutral border-left (`border-neutral-300`) |

---

## 5. Component Checklist

### Danh sách components cần tạo / cập nhật

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| VehicleDetailPage | `frontend/src/pages/admin/catalog/VehicleDetailPage.tsx` | Mới | Screen 2 |
| VehicleDetailHeader | `frontend/src/components/vehicle-detail/VehicleDetailHeader.tsx` | Mới | Header zone |
| VehicleStatsCards | `frontend/src/components/vehicle-detail/VehicleStatsCards.tsx` | Mới | Stats cards zone |
| VehicleTabBar | `frontend/src/components/vehicle-detail/VehicleTabBar.tsx` | Mới | Tab navigation |
| FuelTab | `frontend/src/components/vehicle-detail/FuelTab.tsx` | Mới | Tab 1 content |
| RepairTab | `frontend/src/components/vehicle-detail/RepairTab.tsx` | Mới | Tab 2 content |
| InsuranceTab | `frontend/src/components/vehicle-detail/InsuranceTab.tsx` | Mới | Tab 3 content |
| OilChangeTab | `frontend/src/components/vehicle-detail/OilChangeTab.tsx` | Mới | Tab 4 content |
| InspectionTab | `frontend/src/components/vehicle-detail/InspectionTab.tsx` | Mới | Tab 5 content |
| VehicleCatalogPage | `frontend/src/pages/admin/catalog/VehicleCatalogPage.tsx` | Cập nhật | Screen 1 (clickable biển số) |
| Router | `frontend/src/Router.tsx` | Cập nhật | Thêm route |

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

## 6. Validation UX

Giữ nguyên logic validation từ các standalone page hiện tại. Giờ apply trong context tab:

| Trường hợp | Hiển thị ở đâu | Khi nào show |
|------------|---------------|--------------|
| Form validation error | Inline dưới field | Khi blur hoặc submit |
| Business rule vi phạm | Toast error | Sau khi submit |
| Server error (500) | Toast error | Sau khi submit |
| Delete confirm | `window.confirm()` dialog | Trước khi xóa |

---

## 7. i18n Keys cần thêm

```json
{
  "vehicleDetail": {
    "back": "← Quay lại",
    "notFound": "Không tìm thấy xe",
    "loadError": "Không thể tải thông tin xe.",
    "retry": "Thử lại",
    
    "tabs": {
      "fuel": "Dữ liệu dầu",
      "repair": "Lịch sử sửa xe",
      "insurance": "Bảo hiểm",
      "oilChange": "Thay nhớt",
      "inspection": "Đăng kiểm"
    },
    
    "stats": {
      "inspection": "Đăng kiểm",
      "insurance": "Bảo hiểm",
      "oilChange": "Thay nhớt",
      "repair": "Sửa chữa",
      "fuel": "Dữ liệu dầu",
      "noData": "Chưa có",
      "notApplicable": "Không áp dụng",
      "times": "{count} lần",
      "amount": "{amount} đ"
    },
    
    "empty": "Chưa có dữ liệu \"{tab}\".",
    "emptyInsurance": "Xe ngoài không áp dụng bảo hiểm.",
    
    "add": "Thêm {feature}",
    "delete": {
      "confirm": "Bạn có chắc muốn xóa bản ghi này?"
    },
    "message": {
      "createSuccess": "Đã thêm {feature} thành công.",
      "updateSuccess": "Đã cập nhật {feature} thành công.",
      "deleteSuccess": "Đã xóa {feature} thành công.",
      "error": "Không thể thực hiện thao tác."
    }
  }
}
```

---

## 8. Sidebar Integration

Không thêm menu mới. Route `/catalog/vehicles/:id` nằm dưới `CATALOG_ROUTES` prefix có sẵn → sidebar tự động active group "Quản lý danh mục" và highlight "Danh mục xe".

---

## 9. Backend API cần thêm

### `GET /api/vehicles/:id/summary`

**Permission:** `vehicle_data.view` hoặc authenticated
**Response:** Vehicle summary (stats for 5 cards) — chi tiết xem section 4

**Logic:** 1 query tổng hợp từ các bảng liên quan, dùng LEFT JOIN để lấy:
- `inspection_records`: latest active record (status, expiry_date, count)
- `insurance_records`: latest active record (status, expiry_date, count) — chỉ cho Xe nhà
- `oil_change_records`: latest active record + cross-ref fuel_records cho current_km
- `repair_records`: count + sum total_amount
- `fuel_records`: latest odometer + avg fuel_rate (10 records gần nhất) + total count
