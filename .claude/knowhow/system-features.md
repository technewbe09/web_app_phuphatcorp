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
| transport.view | Xem dữ liệu vận tải (lịch đi hàng) |
| transport.manage | Quản lý dữ liệu vận tải (CRUD lịch đi hàng) |
| dispatch.view | Xem bảng điều phối xe |
| dispatch.manage | Tạo/xóa lịch điều phối xe |
| accounting_data.view | Xem dữ liệu kế toán |
| accounting_data.manage | Quản lý dữ liệu kế toán |
| catalog.view | Xem danh mục |
| catalog.manage | Quản lý danh mục |
| jobs.view | Xem cấu hình Job |
| jobs.manage | Quản lý cấu hình Job |
| logs.view | Xem nhật ký hệ thống |

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
      → Group theo key = (Số tàu/xe + Ngày HĐ + Tên KH)
        - Nếu SUM(HĐ Trọng lượng)/1000 >= 13 và Thông tin bổ sung có 2+ giá trị → add "Thông tin bổ sung" vào key
      → Sort mỗi nhóm theo Số HĐ ASC (numeric-aware), rồi Mã NCC ASC
      → Final sort các nhóm theo Số tàu/xe ASC (natural sort: prefix numeric-aware → number numeric)
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

**Sheets CLF / VFM / MCC / CLV / NDFC (41 cols = 39 + 2 extra):**

Giống sheet Processed, nhưng có thêm logic riêng:

| Khác biệt | Mô tả |
|------------|-------|
| Cột CLF/VFM/MCC/CLV/NDFC (col 16-20) — **dòng đầu tiên của khối** | Hiển thị sum của **toàn bộ group** (tất cả factories), giống separator row ở sheet Process. Các dòng còn lại giữ nguyên giá trị invoice-level |
| Col 39: **Tấn/ Chuyến** | Chỉ hiển thị ở dòng đầu tiên của mỗi khối = tổng tấn của factory tương ứng trong khối đó (sheet VFM → tổng tấn VFM). Các dòng còn lại = '' |
| Col 40: **Tấn/ Hóa đơn** | Hiển thị ở dòng đầu tiên của mỗi hóa đơn (invoice+factory) = tổng tấn của invoice đó cho factory tương ứng. Các dòng còn lại = '' |

### 5.3 Business Rules

- **BR-000:** ⚠️ DEPRECATED (removed 2026-04-25) — Pre-sort rows by vehicle+date+invoice was removed. Final sort groups by vehicle is now performed in BR-003.
- **BR-001:** Grouping key ban đầu = Số tàu/xe + Ngày hóa đơn + Tên khách hàng
  - Tính SUM(HĐ Trọng lượng) / 1000 của group sơ bộ
  - Nếu < 13: giữ nguyên group key (Số tàu/xe + Ngày HĐ + Tên KH)
  - Nếu >= 13: kiểm tra cột "Thông tin bổ sung"
    - Có từ 2 giá trị trở lên (phân tách bằng dấu phẩy/xuống dòng) → group key = Số tàu/xe + Ngày HĐ + Tên KH + Thông tin bổ sung
    - Chỉ có 1 giá trị hoặc rỗng → giữ nguyên group key
- **BR-002:** Trong mỗi nhóm, sort rows theo Số HĐ ASC (numeric-aware localeCompare), sau đó Mã nhà cung cấp ASC (numeric-aware)
- **BR-003:** Final sort groups theo **biển số hiển thị** (`.slice(-9)` của Số tàu/xe) ASC. Dùng `compareVehicleNumbers(a.vehicle.slice(-9), b.vehicle.slice(-9))` — sort theo biển số đã cắt prefix PPH, không phải full source string. Lý do: source data có nhiều format prefix khác nhau (`PPH `, `PPH-`, `PPH-P-`, `PPH-G-`, `PPH-ND-`, etc.) gây sai thứ tự nếu sort full string. ✅ UPDATED 2026-04-26: sort key = `.slice(-9)` display value
- **BR-004:** Round(MT) = HD_TRONG_LUONG (col 19) / 1000, làm tròn 2 chữ số thập phân — tính per row (không phải per group)
- **BR-005:** Output có 1 separator row giữa các nhóm (không có giữa row cuối và end-of-file). Separator row hiển thị SUM tại các cột: Round(MT), CLF, VFM, MCC, CLV, NDFC ('' nếu factory đó không có invoice trong nhóm)
- **BR-006:** Ngày HĐ là Excel serial number → convert sang DD/MM/YYYY string trong output
- **BR-007:** Factory sheets (CLF/VFM/MCC/CLV/NDFC) — dòng đầu tiên của mỗi khối: cột CLF/VFM/MCC/CLV/NDFC hiển thị sum toàn group (giống separator row ở Process sheet)
- **BR-008:** Factory sheets — cột "Tấn/ Chuyến" (col 39): chỉ hiển thị ở dòng đầu khối = tổng tấn của factory đó trong khối
- **BR-009:** Factory sheets — cột "Tấn/ Hóa đơn" (col 40): hiển thị ở dòng đầu tiên của mỗi invoice+factory = tổng tấn invoice đó theo factory đó

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

Module "Quản lý dữ liệu xe" chứa sub-menu Lịch đi hàng.

### 7.1 Lịch đi hàng (/vehicle-data/delivery-schedule)

**Mục đích:** Quản lý lịch đi hàng theo ngày.

**Access:** Tất cả authenticated users. Route: `/vehicle-data/delivery-schedule`

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

### 11.2 Danh sách khách nhận hàng (/accounting-data/customers)

**Mục đích:** Quản lý masterdata danh sách khách hàng nhận hàng — cho phép CRUD thủ công và import hàng loạt từ Excel.

**Data model — bảng `customers`:**
```sql
customers (
  id SERIAL PK,
  diem_tra_hang VARCHAR(255) NOT NULL,       -- Điểm trả hàng, business key (unique per active)
  ten_khach_hang VARCHAR(255) NOT NULL,       -- Tên khách hàng
  tuyen_phuong VARCHAR(255),                  -- Tuyến-phường (nullable)
  tuyen_cu VARCHAR(255),                      -- Tuyến cũ (nullable)
  dia_chi_giao_hang TEXT,                     -- Địa chỉ giao hàng (nullable)
  boc_xep BOOLEAN NOT NULL DEFAULT TRUE,      -- Có bốc xếp không
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'deactive'
  created_by INTEGER FK→users.id,
  updated_by INTEGER FK→users.id,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
```

**Business Rules:**
- BR-001: `diem_tra_hang` unique trong active rows (service-level check, không phải DB constraint)
- BR-002: Soft delete — UPDATE SET status='deactive' (không xóa vật lý)
- BR-003: Create → 409 nếu diem_tra_hang đã tồn tại (active record)
- BR-004: Update → 409 nếu diem_tra_hang conflict với record khác
- BR-005: Upload fail-fast — nếu bất kỳ dòng nào lỗi → không insert gì cả, trả 422 + error list
- BR-006: Cột boc_xep trong Excel: "Không"/"Khong" (case-insensitive) → false; rỗng/other → true
- BR-007: Excel column order (positional, col index từ 0): col0=Điểm trả hàng, col1=Tuyến-phường, col2=Tuyến-cũ, col3=bỏ qua, col4=Tên khách hàng, col5=Địa chỉ giao hàng, col6=Bốc xếp
- BR-008: fetchAll → chỉ trả active records

**API Endpoints:**
```
GET    /api/customers          → list active rows (accounting_data.view)
POST   /api/customers          → create (accounting_data.manage) → 409 if duplicate diem_tra_hang
PUT    /api/customers/:id      → update (accounting_data.manage) → 409 if conflict, 404 if not found
DELETE /api/customers/:id      → soft-delete (accounting_data.manage) → 404 if not found
POST   /api/customers/upload   → bulk insert fail-fast (accounting_data.manage)
                                  → 422 { success: false, errors: [{ row, diem_tra_hang, reason }] }
```

**Flow — Upload Excel:**
```
User chọn/kéo thả .xlsx
  → Frontend parse Excel (xlsx lib, header:1 positional)
    → Filter dòng header (row[0] = "Điểm trả hàng")
    → Filter dòng trống (col0 rỗng)
    → Map columns: col0 → diem_tra_hang, col1 → tuyen_phuong, ...
    → boc_xep: col6.toLowerCase() === 'không'||'khong' → false, else true
  → Preview: hiện số dòng + 3 dòng đầu
  → Confirm import → POST /api/customers/upload { rows: [...] }
  → 200: toast success "Đã import N bản ghi"
  → 422: hiện bảng lỗi trong modal (dừng lại, không toast)
```

**Files:**
```
backend/src/migrations/012_create_customers.sql
backend/src/services/customerService.ts
backend/src/controllers/customerController.ts
backend/src/routes/customers.ts
backend/src/__tests__/customerService.test.ts  (17 tests)
frontend/src/api/customersApi.ts
frontend/src/hooks/useCustomers.ts
frontend/src/pages/admin/accounting-data/CustomersPage.tsx
frontend/src/components/admin/CreateCustomerModal.tsx
frontend/src/components/admin/EditCustomerModal.tsx
frontend/src/components/admin/DeleteCustomerDialog.tsx
frontend/src/components/admin/UploadCustomersModal.tsx
```

**Permissions:** Same as weight-adjustments — `accounting_data.view` / `accounting_data.manage`

**Access:** Route `/accounting-data/customers`, sidebar menu "Quản lý dữ liệu kế toán" → "Danh sách khách hàng"

---

### 11.4 Đối chiếu HĐ (/accounting-data/invoice-matching)

**Mục đích:** Xem kết quả đối chiếu giữa `accountant_invoices` và `driver_invoices` sau khi import dữ liệu.

**API Endpoints:**
```
GET /api/accountant-invoices?batch_id=&page=&limit=... → list invoices (accounting_data.view)
GET /api/accountant-invoices/missing-summary?batch_id=&in_catalog= → grouped missing (accounting_data.view)
```

**Access:** Route `/accounting-data/invoice-matching`, sidebar menu "Quản lý dữ liệu kế toán" → "Đối chiếu HĐ"

---

### 11.5 Import 5 nhà (/accounting-data/delivery-import)

**Mục đích:** Upload file Excel ERP 5 nhà, import vào `delivery_data`, tự động bóc tách hóa đơn vào `accountant_invoices` và đối chiếu với `driver_invoices`.

**API Endpoints:**
```
POST /api/delivery-data/import → import file (accounting_data.manage)
GET  /api/delivery-data/batches → list batches (accounting_data.view)
GET  /api/delivery-data/batches/:id → batch stats (accounting_data.view)
GET  /api/delivery-data/batches/rows → batch rows (accounting_data.view)
DELETE /api/delivery-data/batches/:id → delete batch (accounting_data.manage)
```

**Access:** Route `/accounting-data/delivery-import`, sidebar menu "Quản lý dữ liệu kế toán" → "Import 5 nhà"

---

## 12. Quản lý danh mục

Nhóm tính năng "Quản lý danh mục" trong sidebar — collapsible accordion, hiển thị cho mọi authenticated user.

### 12.1 Danh mục xe (/catalog/vehicles)

**Mục đích:** Quản lý danh sách xe (biển số + tài xế) — upload từ Excel, xem danh sách, soft delete.

**Data model — bảng `vehicles`:**
```sql
vehicles (
  id SERIAL PK,
  plate_number VARCHAR(20) NOT NULL,          -- Biển số, unique (active), format XXYXXXXX (e.g. 50H70216)
  driver_name VARCHAR(255) NOT NULL,           -- Tên/mã tài xế
  status VARCHAR(20) DEFAULT 'active',         -- 'active' | 'deactive'
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
```

**Business Rules:**
- BR-001: Biển số chuẩn hóa về format `XXYXXXXX` (strip prefix non-digit, bỏ `[-,\s.]`, truncate `/`). Cùng format với `driver_invoices.so_xe`.
- BR-002: `plate_number` unique trong active records (partial unique index)
- BR-003: Upload fail-fast (atomic): có lỗi → không lưu dòng nào
- BR-004: Dòng rỗng (MA rỗng hoặc SỐ XE rỗng) → bỏ qua
- BR-005: Soft delete: UPDATE status='deactive'
- BR-006: Upload lại xe đã deactive → re-activate + update driver_name

**Excel format (sheet "xe"):** Cột MA (mã tài xế), cột SỐ XE (biển số)

**API Endpoints:**
```
GET    /api/vehicles?search=&page=1&limit=20  → { vehicles, total, page, limit }
POST   /api/vehicles/upload                    → multipart file upload (fail-fast)
DELETE /api/vehicles/:id                       → soft delete
```

**Files (planned):**
```
backend/src/migrations/017_create_vehicles.sql
backend/src/services/vehicleService.ts
backend/src/controllers/vehicleController.ts
backend/src/routes/vehicles.ts
frontend/src/api/vehicleCatalogApi.ts
frontend/src/hooks/useVehicleCatalog.ts
frontend/src/pages/admin/catalog/VehicleCatalogPage.tsx
frontend/src/components/catalog/UploadVehiclesModal.tsx
frontend/src/components/catalog/DeleteVehicleDialog.tsx
```

**Access:** Tất cả authenticated users. Route: `/catalog/vehicles`

---

## 13. Quản lý Job

Module "Quản lý Job" quản lý các job chạy nền tự động của hệ thống.

### 13.1 Job Đối chiếu HĐ (/jobs/reconcile)

**Mục đích:** Job chạy định kỳ tự động đối chiếu `accountant_invoices` với `driver_invoices` và cập nhật trạng thái hóa đơn. Kèm màn hình cấu hình thời gian và phạm vi job.

**Data model — bảng `reconcile_job_configs`:**
```sql
reconcile_job_configs (id PK, name, lookback_days DEFAULT 180, schedule_hours INTEGER[] DEFAULT '{8,12,18}', is_active BOOLEAN DEFAULT true, last_run_at, next_run_at, created_by/updated_by FK->users, created_at, updated_at)
```

**Data model — bảng `reconcile_job_logs`:**
```sql
reconcile_job_logs (id PK, config_id FK->reconcile_job_configs ON DELETE SET NULL, trigger_type VARCHAR(10) DEFAULT 'scheduled', started_at, finished_at, status DEFAULT 'running', lookback_days, scanned_count DEFAULT 0, matched_count DEFAULT 0, error_message, created_at)
```

**Business Rules:**
- BR-001: Job quét `accountant_invoices` có `trang_thai='không có'` trong phạm vi `ngay >= CURRENT_DATE - lookback_days`.
- BR-002: Đối chiếu dùng fuzzy match 4 mức trên `so_xe` + `ngay` + `so_hoa_don` — giống logic `deliveryDataService` và `driverInvoiceService`.
- BR-003: Schedule dùng `node-cron`, mỗi config chọn nhiều giờ chạy. Bật/tắt/sửa/xóa không cần restart server.
- BR-004: Có nút "Chạy ngay" để trigger thủ công.
- BR-005: Mỗi lần chạy ghi log vào `reconcile_job_logs`.

**API Endpoints:**
```
GET    /api/reconcile-jobs/configs         → list configs (jobs.view)
POST   /api/reconcile-jobs/configs         → create config (jobs.manage)
PUT    /api/reconcile-jobs/configs/:id     → update config (jobs.manage)
DELETE /api/reconcile-jobs/configs/:id     → delete config (jobs.manage)
PATCH  /api/reconcile-jobs/configs/:id/toggle → toggle active (jobs.manage)
POST   /api/reconcile-jobs/trigger         → trigger thủ công (jobs.manage)
GET    /api/reconcile-jobs/logs            → xem lịch sử chạy (jobs.view)
```

**Files:**
```
backend/src/migrations/023_create_reconcile_jobs.sql
backend/src/migrations/024_add_job_permissions.sql
backend/src/services/reconcileJobService.ts
backend/src/services/schedulerService.ts
backend/src/controllers/reconcileJobController.ts
backend/src/routes/reconcileJobs.ts
frontend/src/api/reconcileJobApi.ts
frontend/src/hooks/useReconcileJobs.ts
frontend/src/pages/admin/jobs/ReconcileJobPage.tsx
frontend/src/components/accounting-data/HourSelector.tsx
```

**Permissions:**
| Code | Role mặc định |
|------|--------------|
| jobs.view | ADMIN, ACCOUNTANT, VIEWER |
| jobs.manage | ADMIN, ACCOUNTANT |

**Access:** Route `/jobs/reconcile`, sidebar menu "Quản lý Job" → "Cấu hình Job"

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
- [ ] Danh mục xe (/catalog/vehicles) — upload Excel, quản lý biển số + tài xế (PLANNED — docs/ba/20260616_vehicle-catalog-analysis.md)

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
  diem_nhan TEXT, diem_tra TEXT, gio_nhan TIME, ghi_chu TEXT,
  created_by FK nullable, created_at, updated_at
)
```

**Business Rules:**
- BR-001: `loai_xe = 'Xe nhỏ'` → hiển thị bảng "Lịch xe nhỏ"; `'Xe lớn'` → "Lịch xe lớn"
- BR-002: Sort theo `gio_nhan ASC` trong mỗi bảng — backend sort trước khi trả về
- BR-003: Hard delete — không có soft delete cho dispatch_schedules
- BR-004: `loai_tuyen = 'Tuyến cố định'` → xuất hiện trong "Lịch xe nhỏ" hoặc "Lịch xe lớn" tùy loai_xe; `'Tuyến ngoài'` → xuất hiện trong "Lịch tuyến ngoài" (riêng biệt, bao gồm cả xe nhỏ lẫn xe lớn)

**Flow — Tạo chuyến (4-step wizard):**
```
Step 1: Chọn loai_tuyen (Tuyến cố định / Tuyến ngoài)
  → Step 2: Chọn xe_type (Xe nhà / Xe ngoài)
    → Step 3: Chọn loai_xe (Xe nhỏ / Xe lớn)
      → Step 4: Form (diem_nhan, diem_tra, gio_nhan, ghi_chu)
        → POST /api/dispatch-schedules
        → Toast success → Modal đóng → Refresh bảng
```

**API Endpoints:**
```
GET    /api/dispatch-schedules?date=YYYY-MM-DD  → { xe_nho: [], xe_lon: [], tuyen_ngoai: [] }
POST   /api/dispatch-schedules                  → create schedule
PUT    /api/dispatch-schedules/:id              → update editable fields (diem_nhan, diem_tra, gio_nhan, ghi_chu)
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

### 9.4 Quản lý nhật ký hệ thống (/logs)

- Requires: `logs.view`
- 2 tab: "Nhật ký truy cập" (access_logs — mọi POST/PUT/DELETE/PATCH request) và "Nhật ký thao tác" (audit_logs — business events từ 12 service)
- Filter theo user, method/action, path/entity_type, status, date range, pagination
- Audit log: expandable row hiển thị JSON details
- Access logs ghi tự động qua middleware (fire-and-forget), audit logs gọi từ controller
- Log retention: access_logs 90 ngày, audit_logs 180 ngày, cleanup cron 3AM hàng ngày

### 9.5 Files

```
backend/src/services/roleService.ts
backend/src/services/permissionService.ts
backend/src/services/auditService.ts
backend/src/controllers/rolesController.ts
backend/src/controllers/permissionsController.ts
backend/src/controllers/auditController.ts
backend/src/routes/roles.ts
backend/src/routes/permissions.ts
backend/src/routes/auditLogs.ts
backend/src/migrations/004_roles_permissions.sql
backend/src/migrations/026_create_audit_logs.sql

frontend/src/api/rolesApi.ts
frontend/src/api/permissionsApi.ts
frontend/src/api/auditLogApi.ts
frontend/src/hooks/useRoles.ts
frontend/src/hooks/usePermissions.ts
frontend/src/hooks/useAuditLogs.ts
frontend/src/pages/admin/RoleManagementPage.tsx
frontend/src/pages/admin/PermissionManagementPage.tsx
frontend/src/pages/admin/AuditLogPage.tsx
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
