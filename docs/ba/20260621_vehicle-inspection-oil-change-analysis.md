# BA Analysis: Quản lý Đăng kiểm & Lịch sử Thay nhớt

**Ngày:** 2026-06-21
**Module:** Quản lý dữ liệu xe

---

## 1. Tổng quan

Hai tính năng mới trong module "Quản lý dữ liệu xe":
- **Quản lý đăng kiểm**: Theo dõi thông tin đăng kiểm của từng xe (ngày đăng kiểm, ngày hết hạn, ghi chú, hình ảnh scan).
- **Quản lý thay nhớt**: Ghi nhận lịch sử thay nhớt động cơ, thiết lập ngưỡng km bắt buộc thay nhớt, tự động đối chiếu với số km từ lần đổ dầu gần nhất để nhắc nhở.

> **Lưu ý:** Đây là chức năng "Thay nhớt" (engine oil/lubricant), phân biệt với module "Đổ dầu" (`fuel_records`) đã có.

---

## 2. User Stories

### A. Quản lý Đăng kiểm

| ID | User Story | Actor |
|----|------------|-------|
| US-A1 | Xem danh sách đăng kiểm của tất cả xe, filter theo trạng thái (còn hạn / hết hạn / sắp hết hạn) | Admin, Accountant |
| US-A2 | Thêm mới bản ghi đăng kiểm cho 1 xe (ngày đăng kiểm, ngày hết hạn, ghi chú, upload ảnh scan) | Admin, Accountant |
| US-A3 | Cập nhật thông tin đăng kiểm (sửa ngày, ghi chú, thêm/xóa ảnh) | Admin, Accountant |
| US-A4 | Xóa bản ghi đăng kiểm (soft delete) | Admin |
| US-A5 | Upload nhiều ảnh giấy chứng nhận đăng kiểm cho 1 bản ghi | Admin, Accountant |
| US-A6 | Xem danh sách xe sắp hết hạn đăng kiểm (trong vòng N ngày, mặc định 30) | Admin, Accountant |

### B. Quản lý Thay nhớt

| ID | User Story | Actor |
|----|------------|-------|
| US-B1 | Xem danh sách lịch sử thay nhớt của tất cả xe, filter theo xe, thời gian | Admin, Accountant |
| US-B2 | Thêm mới bản ghi thay nhớt (ngày thay, số km lúc thay, loại nhớt, ghi chú) | Admin, Accountant |
| US-B3 | Cập nhật / Xóa bản ghi thay nhớt | Admin |
| US-B4 | Thiết lập ngưỡng km bắt buộc thay nhớt cho từng xe (mặc định 5000km) | Admin |
| US-B5 | Xem danh sách xe cần thay nhớt — tự động tính toán từ odometer_new gần nhất - odometer_at của lần thay gần nhất >= ngưỡng km | Admin, Accountant |

---

## 3. Flowchart TO-BE

```mermaid
flowchart TD
  subgraph Inspection["Quản lý Đăng kiểm"]
    I1[Người dùng vào /vehicle-data/inspections] --> I2[Hiển thị bảng danh sách đăng kiểm]
    I2 --> I3[Filter: Tất cả / Còn hạn / Hết hạn / Sắp hết hạn]
    I2 --> I4[Click 'Thêm đăng kiểm']
    I4 --> I5[Chọn xe từ dropdown]
    I5 --> I6[Nhập ngày đăng kiểm, ngày hết hạn, ghi chú]
    I6 --> I7[Upload ảnh scan - tùy chọn]
    I7 --> I8[Lưu → POST /api/vehicle-inspections]
    I2 --> I9[Click row → mở detail/edit]
    I9 --> I10[Sửa thông tin / thêm ảnh / xóa ảnh]
    I10 --> I11[Lưu → PUT /api/vehicle-inspections/:id]
  end

  subgraph OilChange["Quản lý Thay nhớt"]
    O1[Người dùng vào /vehicle-data/oil-changes] --> O2[2 tabs: Lịch sử thay nhớt | Xe cần thay nhớt]
    
    O2 -->|Tab 1| O3[Hiển thị bảng lịch sử thay nhớt]
    O3 --> O4[Filter theo xe, khoảng thời gian]
    O3 --> O5[Click 'Thêm thay nhớt']
    O5 --> O6[Chọn xe, nhập ngày, số km, loại nhớt, ghi chú]
    O6 --> O7[Lưu → POST /api/vehicle-oil-changes]
    O3 --> O8[Click row → edit/delete]

    O2 -->|Tab 2| O9[Hiển thị danh sách xe đến hạn thay nhớt]
    O9 --> O10[Mỗi dòng: biển số, lần thay gần nhất, km hiện tại, km còn lại/đã vượt]
    O10 --> O11[Ngưỡng km: thiết lập riêng cho từng xe]
    O11 --> O12[Công thức: odometer_new gần nhất - odometer_at lần thay gần nhất > oil_change_interval_km]
  end
```

---

## 4. Business Rules

### Đăng kiểm

| ID | Rule |
|----|------|
| BR-A01 | Một xe có thể có nhiều bản ghi đăng kiểm (lưu lịch sử các kỳ đăng kiểm) |
| BR-A02 | Khi thêm mới đăng kiểm, nếu xe đã có đăng kiểm đang active (chưa hết hạn và chưa bị xóa), cập nhật status bản cũ thành 'superseded' |
| BR-A03 | Status tự động tính: ngày hết hạn < hôm nay → 'expired'; ngược lại → 'active'; bị xóa → 'deleted' |
| BR-A04 | Cảnh báo sắp hết hạn: expiry_date ≤ CURRENT_DATE + N ngày (mặc định N=30) |
| BR-A05 | Hỗ trợ upload nhiều ảnh cho 1 bản ghi đăng kiểm (lưu vào disk, giống fuel_record_images) |
| BR-A06 | Soft delete: status = 'deleted', không xóa vật lý |
| BR-A07 | Form đăng kiểm: ngày đăng kiểm ≤ ngày hết hạn (validate) |

### Thay nhớt

| ID | Rule |
|----|------|
| BR-B01 | Mỗi xe có 1 ngưỡng km thay nhớt (`oil_change_interval_km`), mặc định **5000km** |
| BR-B02 | Công thức nhắc thay nhớt: `MAX(fuel_records.odometer_new) - MAX(oil_change_records.odometer_at) >= oil_change_interval_km` |
| BR-B03 | odometer_new gần nhất lấy từ bảng `fuel_records` (lần đổ dầu gần nhất) |
| BR-B04 | Xe chưa có bản ghi thay nhớt → tính từ km=0 |
| BR-B05 | Sau khi ghi nhận thay nhớt mới → reset cột mốc tính toán |
| BR-B06 | Xe không có fuel_record → hiển thị "Không có dữ liệu km" |
| BR-B07 | Soft delete cho `oil_change_records` |
| BR-B08 | Bỏ qua bản ghi thay nhớt có status='deleted' khi tính nhắc nhở |
| BR-B09 | Xe deactive → ẩn khỏi danh sách nhắc nhở, giữ nguyên lịch sử |

---

## 5. Data Model

### 5.1 Bảng mới: `inspection_records`

```sql
CREATE TABLE inspection_records (
  id                SERIAL PRIMARY KEY,
  vehicle_id        INTEGER NOT NULL REFERENCES vehicles(id),
  inspection_date   DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  notes             TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'superseded', 'deleted')),
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_records_vehicle ON inspection_records(vehicle_id);
CREATE INDEX idx_inspection_records_expiry ON inspection_records(expiry_date);
CREATE INDEX idx_inspection_records_status ON inspection_records(status);

CREATE TRIGGER update_inspection_records_updated_at
  BEFORE UPDATE ON inspection_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### 5.2 Bảng mới: `inspection_images`

```sql
CREATE TABLE inspection_images (
  id                SERIAL PRIMARY KEY,
  inspection_id     INTEGER NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
  filename          VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path         VARCHAR(500) NOT NULL,
  file_size         BIGINT,
  mime_type         VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_images_record ON inspection_images(inspection_id);
```

### 5.3 Bảng mới: `oil_change_records`

```sql
CREATE TABLE oil_change_records (
  id                SERIAL PRIMARY KEY,
  vehicle_id        INTEGER NOT NULL REFERENCES vehicles(id),
  change_date       DATE NOT NULL,
  odometer_at       NUMERIC(10,1) NOT NULL,
  oil_type          VARCHAR(100),
  notes             TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deleted')),
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oil_change_records_vehicle ON oil_change_records(vehicle_id, change_date);

CREATE TRIGGER update_oil_change_records_updated_at
  BEFORE UPDATE ON oil_change_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### 5.4 Alter bảng `vehicles`

```sql
ALTER TABLE vehicles ADD COLUMN oil_change_interval_km INTEGER NOT NULL DEFAULT 5000;
```

---

## 6. API Contract

### 6.1 Vehicle Inspections (`/api/vehicle-inspections`)

| Method | Endpoint | Permission | Mô tả |
|--------|----------|-----------|-------|
| GET | `/api/vehicle-inspections?vehicle_id=&status=&search=&page=&limit=` | `vehicle_data.view` | List đăng kiểm |
| GET | `/api/vehicle-inspections/expiring?days=30` | `vehicle_data.view` | Xe sắp hết hạn |
| GET | `/api/vehicle-inspections/:id` | `vehicle_data.view` | Chi tiết (kèm images) |
| POST | `/api/vehicle-inspections` | `vehicle_data.manage` | Thêm mới |
| PUT | `/api/vehicle-inspections/:id` | `vehicle_data.manage` | Cập nhật |
| DELETE | `/api/vehicle-inspections/:id` | `vehicle_data.manage` | Soft delete |
| POST | `/api/vehicle-inspections/:id/images` | `vehicle_data.manage` | Upload ảnh |
| DELETE | `/api/vehicle-inspections/:id/images/:imageId` | `vehicle_data.manage` | Xóa ảnh |

### 6.2 Vehicle Oil Changes (`/api/vehicle-oil-changes`)

| Method | Endpoint | Permission | Mô tả |
|--------|----------|-----------|-------|
| GET | `/api/vehicle-oil-changes?vehicle_id=&page=&limit=` | `vehicle_data.view` | List lịch sử |
| GET | `/api/vehicle-oil-changes/due` | `vehicle_data.view` | Xe cần thay nhớt |
| POST | `/api/vehicle-oil-changes` | `vehicle_data.manage` | Thêm mới |
| PUT | `/api/vehicle-oil-changes/:id` | `vehicle_data.manage` | Cập nhật |
| DELETE | `/api/vehicle-oil-changes/:id` | `vehicle_data.manage` | Soft delete |

### 6.3 Vehicle Interval (`/api/vehicles/:id/oil-interval`)

| Method | Endpoint | Permission | Mô tả |
|--------|----------|-----------|-------|
| PUT | `/api/vehicles/:id/oil-interval` | `vehicle_data.manage` | Cập nhật ngưỡng km |

---

## 7. Permissions

| Code | Mô tả | ADMIN | ACCOUNTANT | VIEWER |
|------|-------|-------|------------|--------|
| `vehicle_data.view` | Xem dữ liệu xe (đăng kiểm, thay nhớt) | ✓ | ✓ | ✓ |
| `vehicle_data.manage` | Quản lý dữ liệu xe (CRUD) | ✓ | ✓ | ✗ |

---

## 8. UI Screens

| Route | Component | Mô tả |
|-------|-----------|-------|
| `/vehicle-data/inspections` | `InspectionPage.tsx` | Bảng đăng kiểm + filter + CRUD + upload ảnh |
| `/vehicle-data/oil-changes` | `OilChangePage.tsx` | 2 tabs: Lịch sử thay nhớt + Xe cần thay nhớt |

---

## 9. Edge Cases

| # | Case | Xử lý |
|---|------|-------|
| EC-01 | Xe chưa có bản ghi thay nhớt nào | Tính từ km=0 |
| EC-02 | Xe không có fuel_record nào | "Không có dữ liệu km" |
| EC-03 | Xe deactive | Ẩn khỏi danh sách nhắc nhở |
| EC-04 | Thêm đăng kiểm → xe đã có active | Auto superseded bản cũ |
| EC-05 | Upload ảnh > 10MB | Từ chối |
| EC-06 | Ngày hết hạn < ngày đăng kiểm | Lỗi validation |
| EC-07 | Xóa đăng kiểm cuối cùng | Xe vào trạng thái "Chưa đăng kiểm" |
| EC-08 | Ghi sai km thấp hơn lần trước | Warning, không block |
| EC-09 | Lần thay gần nhất deleted | Dùng bản active trước đó |
| EC-10 | Nhiều đăng kiểm active (lỗi) | Ưu tiên expiry_date lớn nhất |
| EC-11 | odometer_at = 0 (xe reset đồng hồ) | Cho phép, tính nhắc nhở từ 0 |
