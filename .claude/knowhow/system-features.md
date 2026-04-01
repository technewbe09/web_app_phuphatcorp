---
description: Business logic, feature flows, và role access của dự án PhuPhatCorp. Agents đọc file này khi cần hiểu "cái này hoạt động thế nào". Để biết "cái gì đang có" (schema, endpoints, structure) → đọc know-how.md.
---

# System Features — PhuPhatCorp

## 1. Authentication & Authorization

### 1.1 User Roles

| Role | Quyền |
|------|--------|
| ADMIN | Truy cập toàn bộ. Quản lý users. |
| ACCOUNTANT | Quản lý sổ kế toán, phiếu thu/chi, báo cáo. |
| VIEWER | Chỉ xem dữ liệu. Không có quyền tạo/sửa/xóa. |

Role được lưu trong `users.role`, gắn vào JWT payload. Mỗi user chỉ có **1 role**.

### 1.2 Registration Flow

```
User → RegisterPage (full_name, email, password, confirmPassword)
  → React Hook Form + Yup validation
  → POST /api/auth/register
    → Backend: check email tồn tại → hash password (bcrypt, 10 rounds)
    → INSERT users (role mặc định: VIEWER)
    → Return { user, accessToken } + set refreshToken cookie
  → Redirect /login
  → Success message: "Đăng ký thành công!"
```

### 1.3 Login Flow

```
User → LoginPage (email, password)
  → React Hook Form + Yup validation
  → Gọi useAuth().login(email, password)
    → AuthContext.login() → authApi.login()
      → POST /api/auth/login
        → Backend: findUserByEmail → bcrypt.compare
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
| /users | ADMIN only | User management |
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
      → Build output XLSX: header row + data rows + blank separator row giữa các nhóm
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
| Round(MT) | — | HD_TRONG_LUONG / 1000 per row, làm tròn 2 chữ số thập phân |
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

### 5.4 Files liên quan

```
src/utils/processDeliveryData.ts   ← core processing logic (browser, no backend)
src/pages/admin/DeliveryDataPage.tsx ← UI page (upload zone, result, download)
```

### 5.5 Access

- Route: `/admin/delivery-data`
- Guard: AuthGuard + AdminGuard (admin/manager role)
- Sidebar: "Xử lý Data Giao Hàng" / "Delivery Data Processing"

---

## 6. Planned Features (Chưa Implement)

- [ ] Trang Sổ kế toán (/accounting) — CRUD phiếu thu/chi, nhật ký chứng từ
- [ ] Trang Báo cáo (/reports) — báo cáo tài chính, biểu đồ doanh thu
- [ ] Trang Cài đặt (/settings) — quản lý tài khoản, đổi mật khẩu
- [x] Quản lý users (/users) — list users, phân quyền (chỉ ADMIN)
- [ ] Auto token refresh ở frontend
- [ ] Unit tests
- [ ] Export báo cáo (PDF, Excel)

## 6. Security Notes

- Password hash: bcrypt, 10 salt rounds, sync API
- JWT secret: phải đủ mạnh (recommend 256+ bits), không hardcode
- httpOnly cookie cho refreshToken: ngăn XSS đọc được
- Frontend KHÔNG lưu refreshToken vào localStorage (chỉ accessToken)
- Không log password hoặc token trong console
- Input validation ở cả frontend (UX) và backend (bắt buộc)
- CORS chỉ cho phép frontend dev URL (`http://localhost:5173`)
