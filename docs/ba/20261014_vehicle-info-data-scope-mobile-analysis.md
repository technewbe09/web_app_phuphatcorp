# BA Analysis: Quản lý & Xem thông tin xe theo phân quyền người dùng trên Mobile

**Ngày:** 2026-10-14
**Feature:** Thông tin xe theo phân quyền tài khoản (My Assigned Vehicles - Inspection, Insurance, Oil Change)
**Module:** Dữ liệu & Bảo trì xe (Mobile Client & Backend Data Scope)
**Phạm vi:** Mobile Client (`mobile/web_v2_mobile`) & Backend API (`backend`)

---

## 1. Yêu cầu & Mục tiêu nghiệp vụ

### 1.1 Vấn đề hiện tại
- Trên Mobile app, các màn hình:
  - **Đăng kiểm** (`InspectionListScreen`)
  - **Bảo hiểm** (`InsuranceListScreen`)
  - **Thay nhớt** (`OilChangeScreen`)
  hiện đang gọi các API `/api/vehicle-inspections/summary`, `/api/vehicle-insurances/summary`, `/api/vehicle-oil-changes/due` lấy toàn bộ danh sách tất cả các xe trong hệ thống nếu tài khoản có quyền `vehicle_data.view`.
- Đối với tài khoản tài xế (vai trò `TAI_XE` hoặc người dùng được gắn cụ thể vào 1 hoặc nhiều xe thông qua phân công tài xế `driver_vehicles` / `user_entity_scopes`):
  - **Yêu cầu bảo mật & nghiệp vụ:** User được gắn với xe nào thì **chỉ được thấy thông tin dữ liệu của xe đó**, tuyệt đối **không được thấy xe khác**.
  - Các thông tin xe cần hiển thị gồm:
    1. **Thời hạn bảo hiểm xe** (ngày hết hạn, trạng thái còn hạn/sắp hết hạn/hết hạn, chi tiết hợp đồng và ảnh chứng từ bảo hiểm).
    2. **Thời hạn đăng kiểm xe** (ngày hết hạn, trạng thái còn hạn/sắp hết hạn/hết hạn, chi tiết kỳ đăng kiểm và ảnh chứng nhận đăng kiểm).
    3. **Lịch sử thay nhớt & tiến độ ODO** (số km hiện tại, số km lần thay gần nhất, khoảng cách km đến hạn thay tiếp theo, lịch sử các lần thay nhớt trước đó).

---

## 2. Business Rules (Quy tắc nghiệp vụ)

- **BR-01 (Phân quyền dữ liệu theo xe - Data Isolation):**
  - Khi người dùng đăng nhập có vai trò `TAI_XE` (hoặc vai trò bị giới hạn phạm vi theo xe / `scope_type = 'entity'`):
    - Hệ thống tự động xác định danh sách `vehicle_id` mà user này phụ trách (thông qua bảng `driver_vehicles` của tài xế ứng với `user_id`, hoặc cấu hình trong `user_entity_scopes`).
    - Tất cả các API tóm tắt / danh sách (`vehicle-inspections/summary`, `vehicle-insurances/summary`, `vehicle-oil-changes/due`, `vehicle-oil-changes`, `vehicle-inspections`, `vehicle-insurances`) chỉ trả về các bản ghi thuộc các xe được phân công.
    - Nếu người dùng truy cập trực tiếp ID của một xe/bản ghi không thuộc phạm vi được gán -> Trả về lỗi `403 Forbidden` hoặc `404 Not Found`.
- **BR-02 (Quyền Admin / Quản lý):**
  - Tài khoản Admin (`ADMIN`) hoặc Quản lý được cấu hình `scope_type = 'all'` tiếp tục thấy danh sách đầy đủ tất cả các xe như thiết kế hiện tại.
- **BR-03 (Trải nghiệm Mobile cho User 1 xe):**
  - Nếu user chỉ được phân công **đúng 1 xe**: Khi vào các phân hệ Đăng kiểm, Bảo hiểm, Thay nhớt hoặc màn hình "Xe của tôi", giao diện có thể hiển thị trực quan thông tin của xe đó ngay lập tức (không cần phải tìm kiếm hay bấm chọn xe trong danh sách dài).
  - Nếu user được phân công **nhiều xe**: Hiển thị danh sách/bộ chọn các xe thuộc quyền quản lý của user đó.
- **BR-04 (Quyền thao tác chỉnh sửa):**
  - Quyền xem thông tin xe (`vehicle_data.view`) cho phép xem hạn đăng kiểm, hạn bảo hiểm, xem ảnh sổ đăng kiểm/bảo hiểm và lịch sử thay nhớt.
  - Các quyền tạo mới, chỉnh sửa, xóa đăng kiểm/bảo hiểm/thay nhớt (`vehicle_data.manage`) chỉ dành cho người quản trị hoặc nếu được cấp quyền quản lý cụ thể. Tài xế thông thường mặc định chỉ có quyền xem thông tin để theo dõi tình trạng xe mình đang vận hành.

---

## 3. Data Model & Database Impact

Hệ thống đã có sẵn các cấu trúc bảng cần thiết:
1. `drivers` và `driver_vehicles`: Liên kết `user_id` -> `driver_id` -> danh sách `vehicle_id`.
2. `feature_scopes`, `role_scope_configs`, `user_entity_scopes`: Khung Data Scope Framework (đã áp dụng cho `invoice_tracking`).

### Giải pháp kỹ thuật Backend:
- Đăng ký feature codes cho module Dữ liệu xe vào `feature_scopes`:
  - `vehicle_data`: Áp dụng cho Inspections, Insurances, Oil Changes, Vehicles.
- Tích hợp middleware `resolveDataScope('vehicle_data')` vào các routes:
  - `backend/src/routes/vehicleInspections.ts`
  - `backend/src/routes/vehicleInsurances.ts`
  - `backend/src/routes/vehicleOilChanges.ts`
  - `backend/src/routes/vehicles.ts`
- Cập nhật các service queries (`inspectionService`, `insuranceService`, `oilChangeService`, `vehicleService`) để lọc theo `vehicle_id = ANY(allowedVehicleIds)` khi scope là `entity` hoặc khi user là tài xế có xe gán trong `driver_vehicles`.

---

## 4. API Contract

### 4.1 API Lấy thông tin xe được phân công của User hiện tại (My Vehicle Summary)
- **Endpoint:** `GET /api/vehicles/my-assigned`
- **Mô tả:** Lấy danh sách các xe được phân công cho user đang đăng nhập kèm tóm tắt trạng thái Đăng kiểm, Bảo hiểm, Thay nhớt.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Danh sách xe phụ trách",
  "data": [
    {
      "id": 12,
      "plate_number": "50H55116",
      "driver_name": "s phi",
      "vehicle_type": "Xe nhà",
      "oil_change_interval_km": 5000,
      "inspection": {
        "id": 45,
        "expiry_date": "2026-11-20",
        "status": "con_han",
        "days_remaining": 37,
        "inspection_count": 3
      },
      "insurance": {
        "id": 30,
        "expiry_date": "2026-12-15",
        "status": "con_han",
        "days_remaining": 62,
        "insurance_count": 2
      },
      "oil_change": {
        "id": 18,
        "last_change_date": "2026-09-10",
        "last_odometer": 125000,
        "current_odometer": 128200,
        "km_since_last_change": 3200,
        "interval_km": 5000,
        "km_remaining": 1800,
        "status": "normal"
      }
    }
  ]
}
```

### 4.2 Các API hiện có được bổ sung lọc phân quyền dữ liệu:
- `GET /api/vehicle-inspections/summary`: Tự động chỉ trả về các xe mà user được phân công.
- `GET /api/vehicle-insurances/summary`: Tự động chỉ trả về các xe mà user được phân công.
- `GET /api/vehicle-oil-changes/due`: Tự động chỉ trả về các xe mà user được phân công.
- `GET /api/vehicle-inspections?vehicle_id=`: Chặn nếu `vehicle_id` không thuộc xe được phân công.
- `GET /api/vehicle-insurances?vehicle_id=`: Chặn nếu `vehicle_id` không thuộc xe được phân công.
- `GET /api/vehicle-oil-changes?vehicle_id=`: Chặn nếu `vehicle_id` không thuộc xe được phân công.

---

## 5. Use Cases & Luồng người dùng (Mobile)

### UC-01: Tài xế đăng nhập và xem thông tin xe phụ trách
- **Actor:** Người dùng vai trò Tài xế (`TAI_XE` / Driver).
- **Luồng:**
  1. Người dùng đăng nhập vào ứng dụng mobile.
  2. Tại Dashboard Hub, xuất hiện phân hệ xe phụ trách hoặc khi ấn vào các thẻ "Đăng kiểm", "Bảo hiểm", "Thay nhớt":
  3. Màn hình chỉ hiển thị duy nhất thông tin xe mà tài xế này được gán (ví dụ xe `50H-55116`).
  4. Người dùng xem được:
     - Hạn đăng kiểm (số ngày còn lại, ngày hết hạn, danh sách ảnh tem đăng kiểm).
     - Hạn bảo hiểm (số ngày còn lại, ngày hết hạn, ảnh chứng nhận bảo hiểm).
     - Tiến độ thay nhớt (ODO lần thay cuối, ODO hiện tại, số km còn lại trước khi phải thay).
     - Bấm xem Lịch sử thay nhớt của chính xe đó.
  5. Người dùng **không** thể nhìn thấy thông tin của các xe khác trong công ty.

### UC-02: Quản trị viên (Admin / Điều hành xe) đăng nhập
- **Actor:** Quản trị viên (`ADMIN`) hoặc Quản lý đội xe.
- **Luồng:**
  1. Đăng nhập vào ứng dụng mobile.
  2. Dashboard Hub hiển thị đầy đủ danh sách tất cả các xe kèm bộ lọc tìm kiếm xe như hiện tại.
  3. Có thể thực hiện CRUD (thêm mới đợt đăng kiểm, bảo hiểm, thay nhớt).
