# Change Plan: Đăng nhập bằng username thay vì email
**Ngày:** 2026-04-07
**Loại:** Phối hợp (Data model + Business logic + API contract + UI/UX)
**Impact:** MEDIUM

---

## Mô tả thay đổi

Thay thế trường đăng nhập từ `email` sang `username`. Cả `email` và `username` đều phải unique trong bảng users.

## Thứ tự thực hiện

Migration → BE (service → controller) → FE (types → context → pages → i18n) → create-admin script

---

## ⚙️ BACKEND TASKS

| ID | Task | File | Thay đổi | Effort |
|----|------|------|----------|--------|
| CR-01 | Migration thêm username | `backend/src/migrations/008_add_username_to_users.sql` | Thêm column `username VARCHAR(100)` nullable, set default từ email prefix+id cho existing rows, add UNIQUE constraint, alter NOT NULL | S |
| CR-02 | Cập nhật authService | `backend/src/services/authService.ts` | Thêm `username` vào `CreateUserData`; update `createUser()` INSERT thêm username; thêm `findUserByUsername(username)`; update `loadUserWithPermissions` SELECT thêm `u.username` | M |
| CR-03 | Cập nhật authController | `backend/src/controllers/authController.ts` | `registerSchema`: thêm `body('username').notEmpty().isLength({min:3,max:50})`; `loginSchema`: thay `body('email').isEmail()` → `body('username').notEmpty()`; `register()`: check username duplicate (409), pass username vào createUser; `login()`: dùng `findUserByUsername` thay `findUserByEmail` | M |

## 🎨 FRONTEND TASKS

| ID | Task | File | Thay đổi | Effort |
|----|------|------|----------|--------|
| CR-04 | Cập nhật types | `frontend/src/types/user.ts` | `UserPublic` thêm `username?: string`; `LoginRequest` đổi `email` → `username`; `RegisterRequest` thêm `username: string` | S |
| CR-05 | Cập nhật AuthContext | `frontend/src/contexts/AuthContext.tsx` | `login(email, password)` → `login(username, password)`; `authApi.login({ email, password })` → `authApi.login({ username, password })`; update `AuthContextType.login` type | S |
| CR-06 | Cập nhật LoginPage | `frontend/src/pages/auth/LoginPage.tsx` | Yup schema: thay `email` validation → `username` (required, không cần .email()); FormData: `username` thay `email`; Input: type="text", label dùng i18n key; `onSubmit`: `login(data.username, data.password)` | S |
| CR-07 | Cập nhật RegisterPage | `frontend/src/pages/auth/RegisterPage.tsx` | Yup schema: thêm `username` (required, min 3, max 50); Form: thêm Input username sau full_name; `onSubmit`: pass `username` vào `authApi.register()` | S |
| CR-08 | Cập nhật i18n | `frontend/src/i18n/vi.json` + `en.json` | Thêm keys: `auth.username`, `auth.usernamePlaceholder`, `auth.usernameRequired`, `auth.usernameMinLength` vào cả 2 file | S |

## 🔧 SCRIPT TASKS

| ID | Task | File | Thay đổi | Effort |
|----|------|------|----------|--------|
| CR-09 | Cập nhật create-admin | `backend/src/scripts/create-admin.ts` | Thêm `username = 'admin'` vào INSERT và ON CONFLICT UPDATE | S |

---

## Thứ tự thực hiện

CR-01 (migration) → CR-02 (service) → CR-03 (controller) → CR-04 (types) → CR-05 (context) → CR-06 (login page) → CR-07 (register page) → CR-08 (i18n) → CR-09 (create-admin)

## ⚠️ Lưu ý

- Migration phải handle existing rows: set username = SPLIT_PART(email,'@',1) || '_' || id để tránh collision
- `loginSchema` sau khi đổi: không còn validate email format ở login — chỉ `notEmpty()`
- `AuthContext.login` signature đổi tham số tên từ `email` → `username` nhưng type vẫn là string — không break TypeScript nhưng cần đồng bộ
- `create-admin.ts` ON CONFLICT giữ nguyên ON CONFLICT(email) nhưng cần update username khi conflict
- Không thay đổi: register vẫn yêu cầu email (dùng để liên lạc), login chỉ dùng username

## Không thay đổi

- Email vẫn required khi register (dùng để liên lạc/recovery)
- Password logic không đổi
- JWT payload không đổi (chứa userId, permissions — không chứa email hay username)
- UserManagementPage (hiển thị username có thể thêm sau — ngoài scope)
