# BA Analysis: Quản lý bảo hiểm (Vehicle Insurance Management)

**Ngày:** 2026-07-21
**Module:** Quản lý dữ liệu xe (Vehicle Data)
**Tham khảo:** "Quản lý đăng kiểm" (inspection) — cùng module, cùng pattern

---

## 1. Mô tả yêu cầu (Feature Description)

Chức năng "Quản lý bảo hiểm" cho phép người dùng theo dõi và quản lý thông tin bảo hiểm của từng xe trong đội xe. Mỗi xe có thể có nhiều lịch sử mua bảo hiểm, nhưng chỉ có 1 bản ghi active (còn hiệu lực) tại một thời điểm.

**Dữ liệu bắt buộc:**
- Biển số xe (liên kết qua vehicle_id → bảng vehicles)
- Ngày mua bảo hiểm (purchase_date)
- Ngày hết hạn bảo hiểm (expiry_date)

**Dữ liệu tùy chọn:**
- Ghi chú (notes)
- Ảnh/file đính kèm (hợp đồng bảo hiểm, giấy chứng nhận)

---

## 2. Data Model

### 2.1 Bảng `insurance_records`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | SERIAL | PRIMARY KEY | ID tự tăng |
| `vehicle_id` | INTEGER | NOT NULL, FK → vehicles(id) | Xe được bảo hiểm |
| `purchase_date` | DATE | NOT NULL | Ngày mua bảo hiểm |
| `expiry_date` | DATE | NOT NULL | Ngày hết hạn bảo hiểm |
| `notes` | TEXT | NULL | Ghi chú |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active','expired','superseded','deleted') | Trạng thái |
| `created_by` | INTEGER | FK → users(id), ON DELETE SET NULL | Người tạo |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời gian tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời gian cập nhật |

**Indexes:**
- `idx_insurance_records_vehicle` ON (vehicle_id)
- `idx_insurance_records_expiry` ON (expiry_date)
- `idx_insurance_records_status` ON (status)

**Trigger:** `update_insurance_records_updated_at` — tự động cập nhật `updated_at`

### 2.2 Bảng `insurance_images` (tùy chọn — ảnh/file đính kèm)

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | SERIAL | PRIMARY KEY | |
| `insurance_id` | INTEGER | NOT NULL, FK → insurance_records(id) ON DELETE CASCADE | |
| `filename` | VARCHAR(255) | NOT NULL | UUID filename |
| `original_filename` | VARCHAR(255) | NOT NULL | Tên gốc |
| `file_path` | VARCHAR(500) | NOT NULL | Object key trên MinIO |
| `file_size` | BIGINT | NULL | |
| `mime_type` | VARCHAR(100) | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

**Index:** `idx_insurance_images_record` ON (insurance_id)

---

## 3. Business Rules

| # | Rule | Mô tả |
|---|------|-------|
| BR-01 | **Duy nhất active** | Mỗi xe chỉ có 1 bản ghi bảo hiểm active. Khi thêm mới → status bản ghi cũ chuyển thành 'superseded' |
| BR-00 | **Chỉ xe "Xe nhà"** | Chỉ xe có `vehicle_type = 'Xe nhà'` mới được tạo bảo hiểm. Xe ngoài không hiển thị trong danh sách và không cho phép thêm mới bảo hiểm |
| BR-02 | **expiry_date > purchase_date** | Ngày hết hạn phải sau ngày mua |
| BR-03 | **Soft delete** | Không xóa cứng, chỉ chuyển status='deleted' |
| BR-04 | **Trạng thái hết hạn** | 'active' nếu expiry_date >= hôm nay; 'expired' nếu < hôm nay |
| BR-05 | **Sắp hết hạn** | expiry_date trong vòng 30 ngày tới → "Sắp hết hạn" (UI badge) |
| BR-06 | **Chưa có bảo hiểm** | Xe chưa từng có insurance record → hiển thị "Chưa có bảo hiểm" |
| BR-07 | **History** | Giữ lại toàn bộ lịch sử bảo hiểm (superseded + active + expired) |
| BR-08 | **expiry_date mới > expiry_date active hiện tại** | Khi thêm mới bảo hiểm cho xe đã có bản ghi active: `expiry_date` của bản ghi mới PHẢI lớn hơn `expiry_date` của bản ghi active hiện tại. Nếu không → throw ValidationError |

---

## 4. API Contract

### 4.1 API Endpoints

| Method | Endpoint | Auth | Permission | Mô tả |
|--------|----------|------|------------|-------|
| GET | `/api/vehicle-insurances` | JWT | `vehicle_data.view` | Danh sách (phân trang, filter) |
| GET | `/api/vehicle-insurances/summary` | JWT | `vehicle_data.view` | Tổng quan theo xe |
| GET | `/api/vehicle-insurances/expiring` | JWT | `vehicle_data.view` | Danh sách sắp hết hạn |
| GET | `/api/vehicle-insurances/:id` | JWT | `vehicle_data.view` | Chi tiết 1 bản ghi |
| POST | `/api/vehicle-insurances` | JWT | `vehicle_data.manage` | Tạo mới |
| PUT | `/api/vehicle-insurances/:id` | JWT | `vehicle_data.manage` | Cập nhật |
| DELETE | `/api/vehicle-insurances/:id` | JWT | `vehicle_data.manage` | Xóa mềm |
| POST | `/api/vehicle-insurances/:id/images` | JWT | `vehicle_data.manage` | Upload ảnh/file |
| DELETE | `/api/vehicle-insurances/:id/images/:imageId` | JWT | `vehicle_data.manage` | Xóa ảnh/file |

### 4.2 Request/Response

#### GET /vehicle-insurances (List)

**Query params:** `vehicle_id?`, `status?` (all/active/expiring/expired), `search?`, `page?` (default 1), `limit?` (default 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "insurances": [
      {
        "id": 1,
        "vehicle_id": 5,
        "plate_number": "51C-12345",
        "driver_name": "Nguyễn Văn A",
        "purchase_date": "2026-01-15",
        "expiry_date": "2027-01-15",
        "notes": "Bảo hiểm Bảo Việt",
        "status": "active",
        "images": [{"id": 1, "filename": "abc123.pdf", ...}],
        "created_at": "2026-01-15T08:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

#### GET /vehicle-insurances/summary

**Query params:** `search?`, `status?`, `page?`, `limit?`

**Response:**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "vehicle_id": 5,
        "plate_number": "51C-12345",
        "driver_name": "Nguyễn Văn A",
        "latest_insurance_id": 1,
        "latest_purchase_date": "2026-01-15",
        "latest_expiry_date": "2027-01-15",
        "latest_status": "active",
        "insurance_count": 3
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

#### POST /vehicle-insurances

**Body:**
```json
{
  "vehicle_id": 5,
  "purchase_date": "2026-07-15",
  "expiry_date": "2027-07-15",
  "notes": "Bảo hiểm PTI"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "vehicle_id": 5,
    "plate_number": "51C-12345",
    "driver_name": "Nguyễn Văn A",
    "purchase_date": "2026-07-15",
    "expiry_date": "2027-07-15",
    "notes": "Bảo hiểm PTI",
    "status": "active",
    "created_at": "2026-07-21T10:00:00Z"
  }
}
```

#### PUT /vehicle-insurances/:id

**Body (partial — only fields to update):**
```json
{
  "purchase_date": "2026-08-01",
  "expiry_date": "2027-08-01",
  "notes": "Cập nhật"
}
```

#### GET /vehicle-insurances/expiring?days=30

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vehicle_id": 5,
      "plate_number": "51C-12345",
      "expiry_date": "2026-08-01",
      "days_remaining": 11
    }
  ]
}
```

---

## 5. Use Cases

### UC-01: Xem danh sách bảo hiểm (tổng quan theo xe)
- **Actor:** ADMIN, ACCOUNTANT, VIEWER
- **Flow:**
  1. Vào sidebar → "Quản lý bảo hiểm"
  2. Hiển thị bảng summary: mỗi xe 1 dòng (Biển số, Tài xế, Mua gần nhất, Hết hạn, Trạng thái, Số lần mua)
  3. Có thể tìm kiếm theo biển số, lọc theo trạng thái (còn hạn/sắp hết/hết hạn/chưa có)
  4. Phân trang 20 items/page
- **States:** Loading (skeleton), Empty ("Chưa có dữ liệu bảo hiểm"), Error ("Không thể tải dữ liệu" + Retry)

### UC-02: Thêm bảo hiểm mới
- **Actor:** ADMIN, ACCOUNTANT
- **Flow:**
  1. Click "+" trên dòng xe hoặc nút "Thêm bảo hiểm"
  2. Modal form: Chọn xe (nếu từ + thì pre-selected), Ngày mua, Ngày hết hạn, Ghi chú, File đính kèm
  3. Validate FE: expiry_date > purchase_date
  4. Submit → BE kiểm tra:
     - Nếu xe đang có bản ghi active → kiểm tra `expiry_date` mới > `expiry_date` active hiện tại. Nếu không → lỗi "Ngày hết hạn phải sau ngày hết hạn hiện tại (dd/mm/yyyy)"
     - Nếu hợp lệ → auto supersede bản cũ → INSERT bản mới
  5. Toast success → refresh list

### UC-03: Xem chi tiết / Sửa bảo hiểm
- **Actor:** ADMIN, ACCOUNTANT
- **Flow:**
  1. Click icon mắt → xem chi tiết (view mode)
  2. Click icon bút → sửa (edit mode)
  3. Cập nhật các trường → validate → submit → toast success

### UC-04: Xem lịch sử bảo hiểm của xe
- **Actor:** ADMIN, ACCOUNTANT, VIEWER
- **Flow:**
  1. Click icon lịch sử trên dòng xe
  2. Modal hiển thị toàn bộ lịch sử bảo hiểm của xe đó (tất cả status)
  3. Mỗi dòng: Ngày mua, Ngày hết hạn, Trạng thái, Ghi chú
  4. Expand để xem file đính kèm

### UC-05: Xóa bảo hiểm
- **Actor:** ADMIN, ACCOUNTANT
- **Flow:**
  1. Click icon xóa → confirm dialog
  2. Confirm → soft delete (status='deleted') → toast success

---

## 6. Role & Permissions

| Role | vehicle_data.view | vehicle_data.manage | Có thể |
|------|-------------------|---------------------|--------|
| ADMIN | Yes | Yes | Xem + CRUD |
| ACCOUNTANT | Yes | Yes | Xem + CRUD |
| VIEWER | Yes | **No** | Chỉ xem |

- Sử dụng lại permissions `vehicle_data.view` và `vehicle_data.manage` đã có (không cần seed permission mới).
- Sidebar menu item hiển thị khi có `vehicle_data.view` hoặc `vehicle_data.manage`.

---

## 7. Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Sidebar có menu "Quản lý bảo hiểm" trong group "Quản lý dữ liệu xe" |
| AC-02 | Menu chỉ hiển thị khi user có permission `vehicle_data.view` |
| AC-03 | Trang summary hiển thị đúng tất cả xe active (kể cả xe chưa có bảo hiểm) |
| AC-04 | Xe chưa có bảo hiểm hiển thị badge "Chưa có bảo hiểm" (neutral) |
| AC-05 | Trạng thái hiển thị đúng: Còn hạn (green), Sắp hết hạn (yellow, ≤30 ngày), Hết hạn (red) |
| AC-06 | Filter trạng thái hoạt động đúng: all/active/expiring/expired/no_insurance |
| AC-07 | Tạo bảo hiểm mới tự động chuyển bản ghi cũ sang 'superseded' |
| AC-07b | Khi xe đang có bản ghi active: expiry_date mới phải > expiry_date active hiện tại, nếu không → lỗi |
| AC-08 | Validate: expiry_date > purchase_date (cả BE + FE) |
| AC-09 | Xóa là soft delete (status='deleted'), không xóa cứng |
| AC-10 | VIEWER không thấy nút thêm/sửa/xóa/upload |
| AC-11 | Upload file hỗ trợ đa định dạng, max 50MB |
| AC-12 | File được lưu trên MinIO, truy cập qua presigned URL (24h) |

---

## 8. UI/UX Requirements

- Giao diện tương tự "Quản lý đăng kiểm": table summary 1 dòng/xe, modal form, history modal
- Skeleton loading khi fetch data
- Empty state với CTA "Thêm bảo hiểm" (nếu có quyền manage)
- Toast notification sau mọi action create/update/delete (success/error)
- Confirm dialog trước delete
- Nút submit disabled khi đang submitting
- Các badge trạng thái: green (còn hạn), yellow (sắp hết hạn), red (hết hạn), neutral (chưa có)
