---
description: Business logic, feature flows, và role access của dự án PhuPhatCorp. Agents đọc file này khi cần hiểu "cái này hoạt động thế nào". Để biết "cái gì đang có" (schema, endpoints, structure) → đọc know-how.md.
---

# System Features — PhuPhatCorp

## 1. Authentication & Authorization

### 1.1 User Roles & Permissions (RBAC)

Hệ thống dùng **RBAC** (Role-Based Access Control) — mỗi user gắn 1 role, role có nhiều permissions.

**Default roles:**

| Role | Code | Loại | Permissions mặc định |
|------|------|------|----------------------|
| Admin | ADMIN | system | Tất cả — không thể deactivate |
| Kế toán | ACCOUNTANT | system | dashboard.view, delivery_data.view/manage, reports.view |
| Xem | VIEWER | system | dashboard.view, delivery_data.view |

**Permission codes:**

| Code | Mô tả |
|------|-------|
| dashboard.view | Xem Dashboard |
| delivery_data.view | Xem Delivery Data |
| delivery_data.manage | Quản lý Delivery Data |
| users.view | Xem Users |
| users.manage | Quản lý Users |
| reports.view | Xem Báo cáo |
| roles.view | Xem Roles |
| roles.manage | Quản lý Roles |
| permissions.manage | Quản lý Permissions |
| transport.view | Xem dữ liệu vận tải (trip codes, xe, tài xế) |
| transport.manage | Quản lý dữ liệu vận tải (CRUD trip codes, xe, tài xế) |
| dispatch.view | Xem bảng điều phối xe |
| dispatch.manage | Tạo/xóa lịch điều phối xe |

**Cơ chế enforcement:**
- JWT payload chứa `roleId` và `permissions: string[]`
- Mỗi request: `authenticateToken` middleware async check `role.is_active` trong DB
- Nếu role bị deactivate → 403 Forbidden ngay lập tức (không cần logout)
- `requirePermission(code)` middleware kiểm tra `req.user.permissions.includes(code)`
- ADMIN: `AuthContext.hasPermission()` luôn trả `true` ở frontend (admin không qua permission check)

**Admin role bất biến:**
- `is_system=true` → không thể deactivate
- Permission matrix: ADMIN checkboxes readonly, luôn hiển thị checked

**Deactivate role flow:**
```
Admin deactivate role
  → BE: kiểm tra is_system → block nếu true
  → FE: DeactivateRoleDialog fetch user count
    → 0 users: auto-deactivate không hiện dialog
    → >0 users: hiện warning với số users bị ảnh hưởng
  → User confirm → PATCH /api/roles/:id/toggle
  → Tất cả users có role này → mất hết permissions ngay lập tức
  → Users đó chỉ có thể dùng lại khi được gán role mới
```

Role được lưu trong `users.role_id` (FK), gắn vào JWT payload. Mỗi user chỉ có **1 role**. Column `users.role` (VARCHAR) vẫn giữ để backward compat với code cũ.

### 1.2 Registration Flow

```
User → RegisterPage (full_name, username, email, password, confirmPassword)
  → React Hook Form + Yup validation
  → POST /api/auth/register
    → Backend: check username unique (409 "Username already taken") → check email unique (409 "Email already registered")
    → hash password (bcrypt, 10 rounds)
    → INSERT users (role mặc định: VIEWER)
    → Return { user, accessToken } + set refreshToken cookie
  → Redirect /login
  → Success message: "Đăng ký thành công!"
```

### 1.3 Login Flow

```
User → LoginPage (username, password)
  → React Hook Form + Yup validation
  → Gọi useAuth().login(username, password)
    → AuthContext.login() → authApi.login()
      → POST /api/auth/login
        → Backend: findUserByUsername → bcrypt.compare
        → OK: generateAccessToken + generateRefreshToken
          → Return { user, accessToken } (body)
          → Set refreshToken cookie (httpOnly, 7d)
        → Fail: return 401 "Invalid credentials"
      → Lưu accessToken vào localStorage
      → setUser(response.user) → Zustand store
      → Return user
    → useNavigate('/')
  → DashboardPage render
```

### 1.4 Session Persistence

- `AuthProvider` mount → kiểm tra `localStorage.access_token` → gọi `GET /api/auth/me`
  - Thành công → `setUser(userData)`, `isAuthenticated = true`
  - Thất bại → xóa tokens, `isAuthenticated = false`
- Nếu chưa đăng nhập → `ProtectedRoute` redirect `/login`

### 1.5 Token Refresh Flow

```
1. Access token hết hạn (15 phút)
2. Request tới endpoint protected → 403 Invalid token
3. Frontend: axios interceptor bắt 403 → redirect /login
   (Note: refresh flow chưa implement ở frontend, cần manual re-login)
```

### 1.6 Logout Flow

```
User click logout (MainLayout header)
  → useAuth().logout()
    → POST /api/auth/logout → clear refreshToken cookie
    → Zustand logout() → xóa localStorage tokens + set user=null
    → navigate('/login')
```

## 2. Protected Routes

| Route | Role required | Behavior |
|-------|--------------|----------|
| / | Any authenticated | Dashboard |
| /accounting | Any authenticated | Placeholder (chưa impl) |
| /reports | Any authenticated | Placeholder (chưa impl) |
| /settings | Any authenticated | Placeholder (chưa impl) |
| /users | users.view | User management |
| /roles | roles.view | Role management |
| /permissions | permissions.manage | Permission matrix |
| /login | None (redirect nếu đã login) | — |
| /register | None (redirect nếu đã login) | — |

**ProtectedRoute logic:**
1. `isLoading === true` → show spinner
2. `isAuthenticated === false` → `<Navigate to="/login" replace />`
3. `isAuthenticated === true` → `<Outlet />` (render nested route)

## 3. API Data Flow

### 3.1 Request Lifecycle

```
Frontend (React)
  → axiosClient.request()
    → Request interceptor: gắn Authorization: Bearer <token>
    → axios.post/get/etc(url, data)
      → Backend: validate → authenticateToken → controller → service → DB
      → Response: { success, message, data }
    → Return response.data (axios envelope)
  → authApi function: unwrap response.data.data (double envelope)
  → Return raw data
```

### 3.2 Error Handling

| Lỗi | Backend trả | Frontend xử lý |
|------|-------------|----------------|
| Validation fail | 400 + error list | Hiển thị inline error dưới field |
| Email đã tồn tại | 409 Conflict | Hiển thị alert "Email already registered" |
| Sai credentials | 401 Unauthorized | Hiển thị alert "Invalid credentials" |
| Token hết hạn | 403 Forbidden | Redirect /login, xóa tokens |
| Không có token | 401 Unauthorized | Redirect /login |
| Không đủ quyền | 403 Forbidden | Hiển thị alert "Insufficient permissions" |
| Server error | 500 | Hiển thị alert generic |

### 3.3 Form Validation (Frontend)

- **Library:** React Hook Form + Yup
- Validation chạy `onChange` + `onBlur` + `onSubmit`
- Mỗi field hiển thị error message bên dưới input
- Submit button disabled khi form invalid
- Submit button show loading spinner khi đang xử lý

## 4. UI/UX Patterns

### 4.1 Layout

**AuthLayout** — cho /login, /register
- Logo + brand name center-top
- Form card centered vertically + horizontally
- Background: `bg-neutral-50`

**MainLayout** — cho tất cả protected routes
- Left sidebar (w-64): logo, nav links, user info + logout
- Right content: `<Outlet />` (scrollable)
- Nav active state: `bg-neutral-100`

### 4.2 Component Usage

```
Trang kế toán (khi implement):
  Container > Card > CardHeader ("Danh sách phiếu")
    > CardContent
      > Table > TableHeader > TableRow > TableHead("STT")/TableHead("Ngày")...
        > TableBody > TableRow > TableCell(data)

Form tạo mới:
  Modal > Card > CardContent
    > form
      > Input(label="Mô tả", error={errors.desc?.message})
      > Input(label="Số tiền", type="number")
      > Select(label="Loại", options=[...])
      > CardFooter
        > Button(variant="outline", "Hủy", onClick=onClose)
        > Button("Lưu", isLoading=isSubmitting)
```

### 4.3 Utilities

**formatCurrency(amount, currency?)** — format số tiền VND, ví dụ: `1500000` → `"1.500.000 ₫"`

**formatDate(date)** — format ngày Việt Nam, ví dụ: `"30/03/2026"`

**formatDateTime(date)** — format ngày + giờ, ví dụ: `"30/03/2026, 14:30"`

**cn(...classes)** — merge Tailwind classes, resolve conflicts (dùng clsx + tailwind-merge)

## 5. Delivery Data Processing (/admin/delivery-data)

**Mục đích:** Upload file Excel ERP giao hàng → phân nhóm theo số tàu/xe + ngày hóa đơn → xuất file output chuẩn.

### 5.1 Flow

```
User upload file .xlsx ERP (Delivery Report)
  → DeliveryDataPage (browser-side processing, không qua backend)
    → processDeliveryData(file: File) [src/utils/processDeliveryData.ts]
      → Đọc file qua FileReader → ArrayBuffer
      → XLSX.read() parse workbook
      → Bỏ qua 4 dòng đầu (metadata ERP), row 5 = header, row 6+ = data
      → Filter dòng trống
      → Group theo key = (Số tàu/xe + Ngày HĐ)
      → Sort mỗi nhóm theo Số HĐ ASC (numeric-aware)
      → Sort các nhóm theo (Ngày HĐ ASC, Số tàu/xe ASC)
      → Tính Round(MT) = SUM(HĐ Trọng lượng Net) / 1000 per group
      → Build output XLSX:
          Sheet "Processed": tất cả dòng, header row + data rows + separator row màu xám giữa các nhóm
          Sheet "CLF": chỉ dòng có factoryVals['CLF'] !== '' (kể cả = 0) + separator cùng style
          Sheet "VFM": chỉ dòng có factoryVals['VFM'] !== ''
          Sheet "MCC": chỉ dòng có factoryVals['MCC'] !== ''
          Sheet "CLV": chỉ dòng có factoryVals['CLV'] !== ''
          Sheet "NDFC": chỉ dòng có factoryVals['NDFC'] !== ''
      → Return: { outputBlob, outputFilename, processedRows, groupCount, dateRange, warnings }
  → User tải file output xuống
```

### 5.2 Column Mapping (Source → Output)

| Output Column | Source Column Index | Ghi chú |
|---------------|--------------------|----|
| Mã nhà cung cấp | 20 | MA_NCC |
| Số hóa đơn | 32 | SO_HD — dùng để sort ASC trong nhóm |
| Ngày hóa đơn | 31 | NGAY_HD — dùng làm group key; convert từ Excel serial |
| Số tàu | 28 | SO_TAU_XE — dùng làm group key |
| Mã khách hàng | 21 | MA_KH |
| Tên khách hàng | 22 | TEN_KH |
| Địa chỉ giao hàng | 15 | DIA_CHI |
| Mã hàng hóa | 23 | MA_HANG |
| Tên hàng hóa (Vie) | 16 | TEN_HANG_HOA |
| Tên hàng hóa (En) | 24 | TEN_HANG_EN |
| Mã liên hệ giao hàng | 26 | MA_LH_GIAO |
| Mã DVT | 17 | MA_DVT |
| Số lượng (DVT bán hàng) | 27 | SO_LUONG |
| SP Trọng lượng net | 18 | SP_TRONG_LUONG |
| HĐ Trọng lượng (Net) | 19 | HD_TRONG_LUONG |
| Round(MT) | — | HD_TRONG_LUONG / 1000 per row, làm tròn 3 chữ số thập phân |
| Col1 (không tiêu đề) | — | Dòng đầu tiên của khối = tổng Round(MT) khối; các dòng còn lại = 0 |
| Col2 (không tiêu đề) | — | Tất cả dòng trong khối = tổng Round(MT) khối |
| CLF | — | Factory col: first row of invoice = SUM(Round(MT)) nếu MA_NCC=2000000001, else 0; other rows = 0; inactive factories = '' |
| VFM | — | Factory col: MA_NCC=2100000002 |
| MCC | — | Factory col: MA_NCC=2000000007 |
| CLV | — | Factory col: MA_NCC không khớp bất kỳ factory nào |
| NDFC | — | Factory col: MA_NCC=2000000008 |
| Tài xế | 29 | TAI_XE |
| Thông tin bổ sung | 33 | THONG_TIN_BS |
| Slot | 4 | SLOT |
| Diễn giải | 3 | DIEN_GIAI |
| Channel | 0 | CHANNEL |
| SubChannel | 1 | SUB_CHANNEL |
| SlotNo | 6 | SLOT_NO |
| user tạo HĐ | 7 | USER_TAO_HD |
| User tạo PXK | 8 | USER_TAO_PXK |
| PO number | 9 | PO_NUMBER |
| Warehouse No | 10 | WAREHOUSE_NO |
| Warehouse Name | 11 | WAREHOUSE_NAME |
| Phiếu XK | 12 | MA_PXK |
| Chứng từ ghi sổ | 13 | SO_CHUNG_TU |
| Số seri | 14 | SO_SERI |
| Loại hàng | 25 | LOAI_HANG |

### 5.3 Business Rules

- **BR-001:** Grouping key = Số tàu/xe + Ngày hóa đơn (cùng tàu, cùng ngày = 1 nhóm)
- **BR-002:** Trong mỗi nhóm, sort rows theo Số HĐ ASC (numeric-aware localeCompare)
- **BR-003:** Các nhóm sort theo Ngày HĐ ASC, rồi Số tàu/xe ASC
- **BR-004:** Round(MT) = HD_TRONG_LUONG (col 19) / 1000, làm tròn 2 chữ số thập phân — tính per row (không phải per group)
- **BR-005:** Output có 1 separator row giữa các nhóm (không có giữa row cuối và end-of-file). Separator row hiển thị SUM tại các cột: Round(MT), CLF, VFM, MCC, CLV, NDFC ('' nếu factory đó không có invoice trong nhóm)
- **BR-006:** Ngày HĐ là Excel serial number → convert sang DD/MM/YYYY string trong output

### 5.4 Verify trọng lượng (Weight Adjustment Check)

Trước khi xử lý chính, hệ thống tự động kiểm tra từng dòng với masterdata "điều chỉnh trọng lượng":

```
User click "Xử lý"
  → [verifying] parse file + fetch /api/weight-adjustments
  → So sánh từng dòng:
      - MA_HANG (col 23) có trong masterdata?
        - Có: so sánh TEN_HANG_HOA (col 16) với masterdata.ten_hang
          - Trùng tên → dùng gia_tri_cu thay thế SP_TRONG_LUONG (col 18)
          - Khác tên → dùng gia_tri_dieu_chinh thay thế SP_TRONG_LUONG (col 18)
          - Sau đó: HD_TRONG_LUONG (col 19) = SO_LUONG (col 27) × SP_TRONG_LUONG mới
          - Nếu MA_HANG khớp + tên trùng + gia_tri_cu = NULL → bỏ qua dòng này
        - Không: giữ nguyên
  → Không có thay đổi → xử lý trực tiếp
  → Có thay đổi → hiện WeightAdjustmentConfirmDialog
      - Xác nhận → áp dụng → xử lý
      - Bỏ qua   → xử lý nguyên gốc
```

### 5.5 Files liên quan

```
src/utils/processDeliveryData.ts   ← exports: parseDeliveryFile(), processDeliveryDataFromRows(),
                                      processDeliveryData() (wrapper), COL, RawRow, ParsedFileData
src/pages/admin/DeliveryDataPage.tsx ← UI page với verify flow
src/components/delivery-data/WeightAdjustmentConfirmDialog.tsx ← modal xác nhận điều chỉnh
src/api/weightAdjustmentApi.ts     ← fetchAll() dùng để load masterdata
```

### 5.5 Access

- Route: `/admin/delivery-data`
- Guard: AuthGuard + AdminGuard (admin/manager role)
- Sidebar: "Xử lý Data Giao Hàng" / "Delivery Data Processing"

---

## 7. Quản lý dữ liệu xe

Module "Quản lý dữ liệu xe" có nhiều sub-menu, mỗi sub-menu là một bảng masterdata.

### 7.1 Mã chuyến (/vehicle-data/trip-codes)

**Mục đích:** Quản lý danh sách mã chuyến vận chuyển.

**Data model — bảng `trip_codes`:**
```sql
trip_codes (id, ma, tuyen, so_tien, status, start_date, end_date, boc_xep, ghi_chu, created_at, updated_at)
```

**Business Rules:**
- Soft update: update → deactivate old row (status=deactive, end_date=now) + insert new row
- Soft delete: UPDATE SET status=deactive, end_date=now (không xóa vật lý)
- Mã case-sensitive unique among active rows (enforced at service layer, NOT DB constraint)
- Upload Excel: parse ở frontend (xlsx lib) → gửi JSON array lên backend → backend check duplicate → bulk insert
- Upload fail-fast: nếu bất kỳ dòng nào lỗi → không insert gì cả, trả về chi tiết lỗi từng dòng

**API Endpoints:**
```
GET    /api/trip-codes          → list active rows
POST   /api/trip-codes          → create (409 if duplicate ma)
PUT    /api/trip-codes/:id      → soft-update (transaction: deactivate + insert)
DELETE /api/trip-codes/:id      → soft-delete
POST   /api/trip-codes/upload   → bulk insert JSON rows ({ rows: [...] })
```

**Files:**
```
backend/src/migrations/003_create_trip_codes.sql
backend/src/services/tripCodeService.ts
backend/src/controllers/tripCodeController.ts
backend/src/routes/tripCodes.ts
frontend/src/api/tripCodeApi.ts
frontend/src/hooks/useTripCodes.ts
frontend/src/components/vehicle-data/TripCodeFormModal.tsx
frontend/src/components/vehicle-data/TripCodeUploadModal.tsx
frontend/src/pages/admin/vehicle-data/TripCodePage.tsx
```

**Access:** Tất cả authenticated users. Route: `/vehicle-data/trip-codes`

---

### 7.2 Dữ liệu xe (/vehicle-data/vehicles)

**Mục đích:** Quản lý danh sách xe vận chuyển (biển số, loại xe, tài xế).

**Data model — bảng `vehicles`:**
```sql
vehicles (id, bien_so, loai, tai_xe JSONB, status, start_date, end_date, created_at, updated_at)
```

**Business Rules:**
- Soft update: deactivate old row (status=deactive, end_date=now) + insert new row (transaction)
- Soft delete: UPDATE SET status=deactive, end_date=now
- Biển số case-sensitive unique among active rows (service layer, NOT DB constraint)
- tai_xe: JSONB array of driver name strings; empty array [] if no driver
- Loại: one of 'Xe lớn' | 'Xe nhỏ' (validated at service + controller)
- Upload: FE parses Excel → JSON rows → backend validates → bulk insert
  - Excel Tài xế column: comma-separated → split to array
  - Fail-fast: any error → no insert, return all errors with row numbers

**API Endpoints:**
```
GET    /api/vehicles          → list active rows (DESC start_date)
POST   /api/vehicles          → create (409 if duplicate bien_so)
PUT    /api/vehicles/:id      → soft-update (transaction: deactivate + insert)
DELETE /api/vehicles/:id      → soft-delete
POST   /api/vehicles/upload   → bulk insert JSON rows ({ rows: [...] })
```

**Files:**
```
backend/src/migrations/005_create_vehicles.sql
backend/src/services/vehicleService.ts
backend/src/controllers/vehicleController.ts
backend/src/routes/vehicles.ts
frontend/src/api/vehicleApi.ts
frontend/src/hooks/useVehicles.ts
frontend/src/components/vehicle-data/VehicleFormModal.tsx
frontend/src/components/vehicle-data/VehicleUploadModal.tsx
frontend/src/pages/admin/vehicle-data/VehiclePage.tsx
```

**Access:** Tất cả authenticated users. Route: `/vehicle-data/vehicles`

---

### 7.3 Thông tin tài xế (/vehicle-data/drivers)

**Mục đích:** Quản lý hồ sơ tài xế (master data) — tích hợp với VehicleFormModal để chọn tài xế từ dropdown.

**Data model:**
```sql
drivers (id, ten_ky_hieu VARCHAR(100) NOT NULL UNIQUE, ho_ten, lien_he, cccd, ghi_chu, status, created_at, updated_at)
driver_documents (id, driver_id FK→drivers, file_name, mime_type, file_data TEXT(base64), file_size, created_at)
```

**Business Rules:**
- ten_ky_hieu: DB UNIQUE constraint (across all rows, active + deactive) — dùng làm identifier trong vehicles.tai_xe
- Delete driver → soft delete (status=deactive), không xóa vật lý
- Update driver → standard UPDATE (no soft-update / versioning)
- vehicles.tai_xe vẫn lưu string[] của ten_ky_hieu; VehicleFormModal dùng multi-select searchable dropdown từ active drivers
- Document upload: base64 JSON (no multer), max 5MB. FE validate trước khi gửi. Lưu TEXT trong DB.
- Deactivated driver trong vehicles.tai_xe → hiển thị với "(đã xóa)" hint trong VehicleFormModal

**API Endpoints:**
```
GET    /api/drivers                          → list active drivers (ORDER BY ten_ky_hieu ASC)
POST   /api/drivers                          → create (409 if duplicate ten_ky_hieu)
PUT    /api/drivers/:id                      → update (409 if duplicate ten_ky_hieu)
DELETE /api/drivers/:id                      → soft-delete
GET    /api/drivers/:id/documents            → list docs metadata (no file_data)
POST   /api/drivers/:id/documents            → upload doc (base64 JSON, max 5MB)
DELETE /api/drivers/:id/documents/:docId     → delete doc
GET    /api/drivers/:id/documents/:docId     → download doc (with file_data)
```

**Files:**
```
backend/src/migrations/006_create_drivers.sql
backend/src/services/driverService.ts
backend/src/controllers/driverController.ts
backend/src/routes/drivers.ts
frontend/src/api/driverApi.ts
frontend/src/hooks/useDrivers.ts
frontend/src/hooks/useDriverDocuments.ts
frontend/src/components/vehicle-data/DriverFormModal.tsx
frontend/src/components/vehicle-data/DriverDocumentsModal.tsx
frontend/src/pages/admin/vehicle-data/DriverPage.tsx
```

**Access:** Tất cả authenticated users. Route: `/vehicle-data/drivers`

---

## 11. Quản lý dữ liệu kế toán

### 11.1 Điều chỉnh trọng lượng (/accounting-data/weight-adjustments)

**Mục đích:** Masterdata điều chỉnh trọng lượng hàng hóa — cho phép lưu giá trị cũ và giá trị điều chỉnh theo từng mã hàng, có tracking version đầy đủ.

**Data model — bảng `weight_adjustments`:**
```sql
weight_adjustments (
  id SERIAL PK,
  ma_hang VARCHAR(100) NOT NULL,          -- Mã hàng hóa
  ten_hang VARCHAR(255) NOT NULL,          -- Tên hàng hóa
  gia_tri_cu NUMERIC(15,3),               -- Giá trị cũ, nullable
  gia_tri_dieu_chinh NUMERIC(15,3) NOT NULL, -- Giá trị điều chỉnh
  status VARCHAR(20) DEFAULT 'active',    -- 'active' | 'deactive'
  version INTEGER DEFAULT 1,              -- tăng mỗi lần soft-update
  start_date TIMESTAMPTZ DEFAULT NOW(),   -- khi version này có hiệu lực
  end_date TIMESTAMPTZ,                   -- null nếu vẫn active
  action_type VARCHAR(20),                -- 'create' | 'update' | 'delete' | 'upload'
  action_by INTEGER FK→users.id,          -- user thực hiện
  action_by_name VARCHAR(255),            -- denormalized full_name
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
```

**Business Rules:**
- BR-001: `ma_hang` UNIQUE trong active rows
- BR-002: Soft-update: deactivate row cũ + INSERT mới với `version+1`, `action_type=update`
- BR-003: Soft-delete: UPDATE `status=deactive`, `action_type=delete`
- BR-004: Create: version=1, action_type=create
- BR-005: Upload: fail-fast (in-file + DB duplicate check), action_type=upload
- BR-006: `gia_tri_cu` nullable (lần đầu nhập có thể không có giá trị cũ)
- BR-007: `action_by_name` denormalized để bảo toàn lịch sử khi user bị xóa

**API Endpoints:**
```
GET    /api/weight-adjustments          → list active rows (accounting_data.view)
POST   /api/weight-adjustments          → create (accounting_data.manage)
PUT    /api/weight-adjustments/:id      → soft-update (accounting_data.manage)
DELETE /api/weight-adjustments/:id      → soft-delete (accounting_data.manage)
POST   /api/weight-adjustments/upload   → bulk insert fail-fast (accounting_data.manage)
```

**Permissions:**
| Code | Role mặc định |
|------|--------------|
| accounting_data.view | ADMIN, ACCOUNTANT, VIEWER |
| accounting_data.manage | ADMIN, ACCOUNTANT |

**Files:**
```
backend/src/migrations/009_create_weight_adjustments.sql
backend/src/services/weightAdjustmentService.ts
backend/src/controllers/weightAdjustmentController.ts
backend/src/routes/weightAdjustments.ts
backend/src/__tests__/weightAdjustmentService.test.ts
frontend/src/api/weightAdjustmentApi.ts
frontend/src/hooks/useWeightAdjustments.ts
frontend/src/pages/admin/accounting-data/WeightAdjustmentPage.tsx
frontend/src/components/accounting-data/WeightAdjustmentFormModal.tsx
frontend/src/components/accounting-data/WeightAdjustmentUploadModal.tsx
```

**Access:** Route `/accounting-data/weight-adjustments`, sidebar menu "Quản lý dữ liệu kế toán" → "Điều chỉnh trọng lượng"

---


- [ ] Trang Sổ kế toán (/accounting) — CRUD phiếu thu/chi, nhật ký chứng từ
- [ ] Trang Báo cáo (/reports) — báo cáo tài chính, biểu đồ doanh thu
- [ ] Trang Cài đặt (/settings) — quản lý tài khoản, đổi mật khẩu
- [x] Quản lý users (/users) — list users, phân quyền (users.view / users.manage)
- [x] Quản lý vai trò (/roles) — CRUD roles, soft-deactivate, permission-gated (roles.view / roles.manage)
- [x] Quản lý quyền (/permissions) — permission matrix role×perm (permissions.manage)
- [ ] Auto token refresh ở frontend
- [ ] Unit tests
- [ ] Export báo cáo (PDF, Excel)
- [x] Dark/Light Mode — toggle button ở sidebar (MainLayout) và AuthLayout, persist localStorage
- [x] Bảng điều phối xe (/dispatch/schedule) — tạo/xóa chuyến xe theo ngày

---

## 10. Điều hành vận tải

Nhóm tính năng "Điều hành vận tải" trong sidebar — collapsible accordion.

### 10.1 Bảng điều phối xe (/dispatch/schedule)

**Mục đích:** Quản lý lịch điều phối xe theo ngày — tạo và xóa chuyến xe.

**Data model — bảng `dispatch_schedules`:**
```sql
dispatch_schedules (
  id, ngay DATE, loai_tuyen VARCHAR(20),  -- 'Tuyến cố định' | 'Tuyến ngoài'
  loai_xe VARCHAR(10), xe_type VARCHAR(10),
  bien_so VARCHAR(50) NOT NULL,  -- text value, NOT FK
  tai_xe TEXT,                   -- text value, NOT FK
  ma_chuyen VARCHAR(100),        -- text value, NOT FK
  diem_nhan TEXT, diem_tra TEXT, gio_nhan TIME, ghi_chu TEXT,
  vehicle_id FK nullable, trip_code_id FK nullable,  -- convenience refs only
  created_by FK nullable, created_at, updated_at
)
```

**Business Rules:**
- BR-001: Lưu text values (bien_so, tai_xe, ma_chuyen) — KHÔNG lưu FK ID. Dữ liệu lịch sử theo ngày phải giữ nguyên kể cả khi masterdata thay đổi.
- BR-002: `loai_xe = 'Xe nhỏ'` → hiển thị bảng "Lịch xe nhỏ"; `'Xe lớn'` → "Lịch xe lớn"
- BR-003: `xe_type = 'Xe nhà'` → biển số chọn từ vehicles; `'Xe ngoài'` → nhập tay
- BR-004: Tài xế (Xe nhà): tự điền từ `vehicle.tai_xe[0]`, read-only
- BR-005: Sort theo `gio_nhan ASC` trong mỗi bảng — backend sort trước khi trả về
- BR-006: Hard delete — không có soft delete cho dispatch_schedules
- BR-007: `loai_tuyen = 'Tuyến cố định'` → xuất hiện trong "Lịch xe nhỏ" hoặc "Lịch xe lớn" tùy loai_xe; `'Tuyến ngoài'` → xuất hiện trong "Lịch tuyến ngoài" (riêng biệt, bao gồm cả xe nhỏ lẫn xe lớn)

**Flow — Tạo chuyến (4-step wizard):**
```
Step 1: Chọn loai_tuyen (Tuyến cố định / Tuyến ngoài)
  → Step 2: Chọn xe_type (Xe nhà / Xe ngoài)
    → Step 3: Chọn loai_xe (Xe nhỏ / Xe lớn)
      → Step 4: Form (diem_nhan, diem_tra, gio_nhan, ma_chuyen, bien_so, tai_xe, ghi_chu)
        → POST /api/dispatch-schedules
        → Toast success → Modal đóng → Refresh bảng
```

**API Endpoints:**
```
GET    /api/dispatch-schedules?date=YYYY-MM-DD  → { xe_nho: [], xe_lon: [], tuyen_ngoai: [] }
POST   /api/dispatch-schedules                  → create schedule
PUT    /api/dispatch-schedules/:id              → update editable fields (bien_so, tai_xe, ma_chuyen, diem_nhan, diem_tra, gio_nhan, ghi_chu, vehicle_id, trip_code_id)
DELETE /api/dispatch-schedules/:id              → hard delete
```

**Files:**
```
backend/src/migrations/006_create_dispatch_schedules.sql
backend/src/migrations/007_add_loai_tuyen_to_dispatch_schedules.sql
backend/src/services/dispatchScheduleService.ts
backend/src/controllers/dispatchScheduleController.ts
backend/src/routes/dispatchSchedules.ts
frontend/src/api/dispatchApi.ts
frontend/src/hooks/useDispatchSchedules.ts
frontend/src/components/dispatch/ScheduleTable.tsx
frontend/src/components/dispatch/OutsideRouteTable.tsx
frontend/src/components/dispatch/CreateScheduleModal.tsx
frontend/src/components/dispatch/EditScheduleModal.tsx
frontend/src/pages/dispatch/SchedulePage.tsx
```

**Access:** Tất cả authenticated users. Route: `/dispatch/schedule`

## 8. Dark/Light Mode

**Mục đích:** Cho phép user chuyển đổi chế độ sáng/tối cho toàn bộ giao diện, persist qua sessions.

### 8.1 Flow

```
App khởi động
  → Anti-FOUC script trong index.html <head> (inline, sync)
    → Đọc localStorage 'theme' → fallback prefers-color-scheme
    → Set class 'dark' trên <html> nếu cần
  → ThemeProvider mount (App.tsx, bọc ngoài cùng)
    → getInitialTheme() → useState(theme)
    → useEffect: sync class 'dark' + localStorage

User click ThemeToggle
  → toggleTheme() → light ↔ dark
  → Tailwind dark: variants apply globally
```

### 8.2 Persistence

- **Storage:** `localStorage`, key = `'theme'`, value = `'dark'` | `'light'`
- **Priority:** localStorage > prefers-color-scheme

### 8.3 Files

```
frontend/src/contexts/themeContext.ts      ← ThemeContext + interface
frontend/src/contexts/ThemeContext.tsx     ← ThemeProvider
frontend/src/hooks/useTheme.ts             ← useTheme hook
frontend/src/components/ui/ThemeToggle.tsx ← Moon/Sun toggle button
```

---

## 9. Thiết lập người dùng (User Settings)

Parent menu group "Thiết lập người dùng" trong sidebar — collapsible accordion, auto-expands khi route match. Sub-menus được filter theo user permissions.

### 9.1 Quản lý người dùng (/users)

- Requires: `users.view`
- Xem danh sách users: filter search/role/is_active, pagination
- CRUD actions (requires `users.manage`): Xem chi tiết, Sửa, Đặt lại mật khẩu, Xóa
- Role dropdown load từ API (không hardcode enum)

### 9.2 Quản lý vai trò (/roles)

- Requires: `roles.view`
- Xem danh sách roles với user_count và permission_count
- ADMIN row: chỉ View, không edit/deactivate
- Create/Edit role (requires `roles.manage`): auto-generate code từ tên (Vietnamese → uppercase snake_case)
- Deactivate = soft-delete (`is_active=false`): dialog với user count warning; 0 users = auto-deactivate
- Activate: immediate, không cần confirm

### 9.3 Quản lý quyền (/permissions)

- Requires: `permissions.manage`
- Permission matrix table: rows = permissions grouped by module, cols = roles
- ADMIN column: always checked, disabled (is_system protection)
- Unsaved changes tracked locally (dirty state với Set objects)
- Lưu tất cả: loop non-ADMIN roles → PUT /api/permissions/role/:id

### 9.4 Files

```
backend/src/services/roleService.ts
backend/src/services/permissionService.ts
backend/src/controllers/rolesController.ts
backend/src/controllers/permissionsController.ts
backend/src/routes/roles.ts
backend/src/routes/permissions.ts
backend/src/migrations/004_roles_permissions.sql

frontend/src/api/rolesApi.ts
frontend/src/api/permissionsApi.ts
frontend/src/hooks/useRoles.ts
frontend/src/hooks/usePermissions.ts
frontend/src/pages/admin/RoleManagementPage.tsx
frontend/src/pages/admin/PermissionManagementPage.tsx
frontend/src/components/admin/CreateRoleModal.tsx
frontend/src/components/admin/EditRoleModal.tsx
frontend/src/components/admin/DeactivateRoleDialog.tsx
```

---

- Password hash: bcrypt, 10 salt rounds, sync API
- JWT secret: phải đủ mạnh (recommend 256+ bits), không hardcode
- httpOnly cookie cho refreshToken: ngăn XSS đọc được
- Frontend KHÔNG lưu refreshToken vào localStorage (chỉ accessToken)
- Không log password hoặc token trong console
- Input validation ở cả frontend (UX) và backend (bắt buộc)
- CORS chỉ cho phép frontend dev URL (`http://localhost:5173`)
