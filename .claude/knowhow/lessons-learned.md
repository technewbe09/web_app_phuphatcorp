---
description: Ghi lại các bài học kinh nghiệm, bug đã fix, và pitfalls trong quá trình phát triển PhuPhatCorp.
---

# Lessons Learned — PhuPhatCorp

## Bugs & Fixes

### CORS block local dev khi .env config cho prod — Single origin limitation
- **Ngày:** 2026-04-08
- **Severity:** Critical
- **Feature liên quan:** Toàn bộ app — Authentication, mọi API calls
- **Triệu chứng:** Local frontend (`http://localhost:5173`) bị block CORS với error "Access-Control-Allow-Origin header has a value 'https://phuphatcorp.scrapetool.cloud' that is not equal to the supplied origin". Developer không thể test local khi backend config cho prod.
- **Root cause:** `app.ts` dùng `process.env.CORS_ORIGIN || 'http://localhost:5173'` (single string). Khi `.env` set `CORS_ORIGIN=https://phuphatcorp.scrapetool.cloud` để serve prod → override default local origin → chỉ prod được phép, local bị reject. CORS middleware của express chỉ accept **1 origin duy nhất** khi config là string, không support multiple origins.
- **Fix:** Thay `origin: string` bằng `origin: function(origin, callback)` để validate dynamic. Whitelist hardcoded: `['http://localhost:5173', 'http://localhost:5174', 'https://phuphatcorp.scrapetool.cloud']`. Function check `allowedOrigins.includes(origin)` → accept/reject. Requests không có origin header (curl, mobile apps) được phép (no-origin check).
- **File sửa:** `backend/src/app.ts:11-26` — thay CORS config
- **Regression test:** curl OPTIONS với 3 origins → localhost:5173 ✅, prod ✅, evil.com ❌
- **Cần chú ý:** Khi cần support multiple origins, không dùng array trực tiếp (`origin: [...]`) vì không flexible. Dùng function validator để có thể log/debug origin nào bị reject. Whitelist nên include cả backup ports (`localhost:5174`) để tránh conflict khi port 5173 bị chiếm. Không nên dùng `CORS_ORIGIN` env var nữa vì logic đã chuyển sang whitelist cứng — dễ maintain và tránh misconfigure giữa env.

---

### CORS block production frontend — NODE_ENV không được đọc đúng
- **Ngày:** 2026-04-07
- **Severity:** Critical
- **Feature liên quan:** Toàn bộ app — Authentication, mọi API calls
- **Triệu chứng:** `No 'Access-Control-Allow-Origin' header` trên prod — browser block preflight
- **Root cause:** `app.ts` dùng `NODE_ENV === 'production'` để chọn CORS origin. Trên nhiều platform (Render, Railway, Docker...), biến này không được inject, hoặc `.env` file không được load. Kết quả: `isProd = false` → CORS chỉ cho `localhost:5173` → prod frontend bị block.
- **Fix:** Xóa `isProd` logic, thay bằng `process.env.CORS_ORIGIN || 'http://localhost:5173'`. Thêm `CORS_ORIGIN=https://phuphatcorp.scrapetool.cloud` vào prod `.env`.
- **File sửa:** `backend/src/app.ts`
- **Cần chú ý:** Không dùng `NODE_ENV` để quyết định config runtime như CORS origin, DB URL... Luôn dùng biến env tường minh (`CORS_ORIGIN`, `DATABASE_URL`). NODE_ENV chỉ dùng cho `--NODE_ENV=production` build tools (Webpack, Vite) — không tin vào nó trong runtime Express.



### i18n t() — key có dấu chấm bị split nhầm làm path separator
- **Ngày:** 2026-04-07
- **Severity:** Medium
- **Feature liên quan:** Permission Management — permission matrix
- **Triệu chứng:** UI hiển thị key thô `permissions.permCodes.dashboard.view` thay vì tên dễ đọc
- **Root cause:** Hàm `t()` trong `i18n.tsx` split key theo `.` để traverse JSON. Khi perm.code có dấu chấm (`dashboard.view`), key `permissions.permCodes.dashboard.view` bị traverse thành 4 cấp → không tìm thấy → trả về key string (truthy, nên `|| fallback` không kích hoạt).
- **Fix:** Đổi JSON keys trong `permCodes` từ `"dashboard.view"` → `"dashboard_view"` (dùng `_`). Trong component gọi `perm.code.replace(/\./g, '_')` trước khi dùng làm i18n key.
- **Cần chú ý:** Không bao giờ đặt i18n key có dấu chấm nằm trong giá trị interpolation (`${variable}`). Nếu giá trị có dấu chấm tự nhiên (code, enum), phải normalize trước khi dùng làm key.

### i18n import type — Vite SyntaxError cho interface export
- **Ngày:** 2026-04-07
- **Severity:** High
- **Feature liên quan:** RBAC — rolesApi, permissionsApi, useRoles
- **Triệu chứng:** `Uncaught SyntaxError: The requested module does not provide an export named 'Role'`
- **Root cause:** TypeScript interface chỉ tồn tại ở compile-time. Vite/esbuild strip interfaces ra khỏi JS output. Nếu dùng `import { Role }` (không phải `import type`), JS runtime cố import một export không tồn tại.
- **Fix:** Dùng `import type { Role }` cho type-only imports. Nếu import cả value lẫn type từ cùng 1 file: tách thành 2 dòng — `import { valueExport }` và `import type { TypeExport }`.
- **Cần chú ý:** Vite + esbuild strict hơn tsc về type imports. Luôn dùng `import type` cho interface/type-only imports trong dự án này.

---

### createBrowserRouter + AuthProvider — React Context lỗi

- **Ngày:** 2026-03-30
- **Vấn đề:** Dùng `createBrowserRouter` (data router) với AuthProvider bên trong → `useNavigate()` bị crash với lỗi "useNavigate() may be used only in the context of a <Router> component"
- **Nguyên nhân:** `createBrowserRouter` tạo Router context outside React tree — các component được render bên trong không truy cập được context từ parent.
- **Fix:** Chuyển sang `<BrowserRouter>` + `<Routes>` JSX. AuthProvider phải nằm bên trong `<BrowserRouter>` trong `App.tsx`. Navigation xử lý tại page level thay vì trong AuthProvider.
- **Prevention:** Luôn dùng `BrowserRouter` JSX khi cần React Context integration. Chỉ dùng `createBrowserRouter` khi cần data router features (loader/action) và KHÔNG có context-dependent components.

---

### AuthProvider chứa useNavigate()

- **Ngày:** 2026-03-30 → crash vì AuthProvider render trước Router mount.
- **Nguyên nhân:** React hooks for navigation yêu cầu Router context đã mounted. AuthProvider là một context consumer/producer nằm ở top-level — không có guarantee về thứ tự mount.
- **Fix:** Tách biệt — AuthContext chỉ quản lý state (login/logout/setUser), không chứa navigation. Page components tự gọi `useNavigate()` sau khi auth action hoàn tất.
- **Prevention:** Quy tắc: Context = State management, Page = Navigation/Behavior. Không mix hai concerns trong cùng component.

---

### Import statements ở dưới cùng file

- **Ngày:** 2026-03-30
- **Vấn đề:** LoginPage và RegisterPage có `import axios` và `import React` ở dưới cùng file sau tất cả code → `useState` undefined, `axios.isAxiosError` undefined.
- **Nguyên nhân:** Lỗi của agent khi scaffold code — import không ở top-level.
- **Fix:** Di chuyển tất cả imports lên trên cùng file, dùng `import { useState }` thay vì `React.useState`.
- **Prevention:** ESLint rule `imports-first` sẽ bắt được lỗi này. Cần setup ESLint cho project.

---

### DashboardPage import path sai

- **Ngày:** 2026-03-30
- **Vấn đề:** DashboardPage nằm trong `pages/dashboard/` nhưng dùng `../hooks/useAuth` thay vì `../../hooks/useAuth`.
- **Nguyên nhân:** Agent scaffold code không tính đúng nesting level của file.
- **Fix:** Sửa thành `../../hooks/useAuth` và `../../components/ui/Card`.
- **Prevention:** Kiểm tra import paths khi tạo nested route components. Hoặc dùng path alias (`@/hooks/useAuth`).

---

### API response structure mismatch

- **Ngày:** 2026-03-30
- **Vấn đề:** Login thành công (backend 200) nhưng frontend không navigate — dashboard trắng.
- **Nguyên nhânân:** Backend trả `{ success, message, data: { user, accessToken } }`. Frontend `authApi` định nghĩa `AuthResponse` là `{ user, tokens: { access_token } }` — 2 lớp mismatch: (1) `accessToken` flat vs nested, (2) Double unwrap cần thiết vì `axiosClient.post<{ data: AuthResponse }>()` + `response.data.data`.
- **Fix:** Correct `AuthResponse` type và unwrap: `response.data.data` để lấy `{ user, accessToken }`.
- **Prevention:** Backend và frontend nên share common types (ví dụ: qua một shared package hoặc copy-paste types). Khi scaffold nên kiểm tra type consistency giữa hai sides.

---

---

### POST /api/users 404 — Backend process cũ chưa có route mới

- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** User Management — Create User
- **Triệu chứng:** `POST http://localhost:3021/api/users 404 (Not Found)` — không tạo được user từ frontend. Response HTML `Cannot POST /api/users`.
- **Root cause:** Backend Node.js process đang chạy là **compiled/cached version cũ** chưa có route `POST /api/users`. Route `GET /api/users` tồn tại (từ version cũ) nên trả 403, nhưng `POST` mới thêm vào nên trả 404. `tsx watch` chưa detect được thay đổi vì process đã bị stale.
- **Fix:** Kill process cũ (`kill <PID>`) và restart backend (`cd backend && npm run dev`). Sau khi restart, `POST /api/users` trả 201 thành công.
- **Regression test:** `curl -X POST http://localhost:3021/api/users` với valid ADMIN token → HTTP 201.
- **Cần chú ý:** Khi thêm route mới vào backend, nếu `tsx watch` không auto-reload, cần restart server thủ công. Dấu hiệu nhận biết: một số routes của cùng resource hoạt động (GET), một số không (POST/PUT/DELETE) → khả năng cao là stale process. Dùng `lsof -i :<port>` để tìm PID và restart.

---

### UserRole missing export — CreateUserModal SyntaxError

- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** User Management — CreateUserModal, EditUserModal
- **Triệu chứng:** `Uncaught SyntaxError: The requested module '/src/types/user.ts' does not provide an export named 'UserRole'` — modal tạo/sửa user không load được.
- **Root cause:** `frontend/src/types/user.ts` không định nghĩa `UserRole` — chỉ có `UserPublic`, `AuthTokens`, etc. Nhưng `CreateUserModal.tsx`, `EditUserModal.tsx`, `UserManagementPage.tsx` đều import và dùng `UserRole.VIEWER`, `UserRole.ADMIN`, `UserRole.ACCOUNTANT`.
- **Fix:** Thêm `UserRole` const object vào `frontend/src/types/user.ts`:
  ```ts
  export const UserRole = { ADMIN: 'ADMIN', ACCOUNTANT: 'ACCOUNTANT', VIEWER: 'VIEWER' } as const;
  export type UserRole = (typeof UserRole)[keyof typeof UserRole];
  ```
  Dùng `const` object thay vì `enum` vì `tsconfig` có `"erasableSyntaxOnly": true` (TS 5.5+) không cho phép `enum`.
- **Regression test:** `tsc --noEmit` trong `frontend/` — clean, không có lỗi UserRole.
- **Cần chú ý:** Khi `erasableSyntaxOnly: true` được bật, không dùng `enum` — thay bằng `const` object + type alias. Pattern: `export const X = {...} as const; export type X = (typeof X)[keyof typeof X];`

---

### DELETE /api/users/:id 500 — FK constraint violation

- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** User Management — Delete User
- **Triệu chứng:** `DELETE http://localhost:3021/api/users/:id` trả 500. Error: `update or delete on table "users" violates foreign key constraint "user_activities_target_user_id_fkey"`.
- **Root cause:** Bảng `user_activities` có FK `target_user_id → users.id` và `actor_id → users.id` (NOT NULL / no cascade). Bảng `users` tự-reference qua `created_by → users.id` và `updated_by → users.id`. Khi DELETE user, PostgreSQL từ chối vì còn FK references từ các bảng này.
- **Fix:** Trong `userService.deleteUser()`, trước khi `DELETE FROM users` cần:
  1. `DELETE FROM user_activities WHERE target_user_id = $id OR actor_id = $id`
  2. `UPDATE users SET created_by = NULL WHERE created_by = $id`
  3. `UPDATE users SET updated_by = NULL WHERE updated_by = $id`
  4. `DELETE FROM users WHERE id = $id`
- **File sửa:** `backend/src/services/userService.ts`
- **Regression test:** Create user → DELETE user → HTTP 200 ✅
- **Cần chú ý:** Khi thiết kế schema có FK references đến users, cần cân nhắc `ON DELETE CASCADE` hoặc `ON DELETE SET NULL` ngay từ đầu trong migration. Audit log tables (`user_activities`) nên dùng `ON DELETE SET NULL` để giữ lịch sử nhưng không block delete.

---

### GET /src/i18n/i18n.ts 404 — giao diện không load được

- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** i18n / app bootstrap
- **Triệu chứng:** Browser báo `GET http://localhost:5173/src/i18n/i18n.ts?t=... net::ERR_ABORTED 404 (Not Found)`, toàn bộ giao diện không load được.
- **Root cause:** Hai vấn đề kết hợp: (1) `node_modules` ở root chưa được `npm install` — Vite binary không tồn tại nên dev server không chạy đúng cách; (2) Browser/Vite cache cũ còn giữ reference đến `src/i18n/i18n.ts` — file này không tồn tại trong filesystem (chỉ có `src/i18n/index.ts`).
- **Fix:** Chạy `npm install` ở root để tạo `node_modules`. Tạo file `src/i18n/i18n.ts` re-export từ `index.ts` để handle browser cache cũ: `export { default } from './index';`
- **Regression test:** Build production thành công (`npm run build` → `✓ 2224 modules transformed`). TypeScript clean (`tsc --noEmit` không có lỗi).
- **Cần chú ý:** Sau khi clone repo hoặc pull code mới, phải chạy `npm install` trước khi `npm run dev`. Nếu đổi tên file i18n, cần giữ backward-compatible re-export hoặc clear browser cache (`Ctrl+Shift+R` / DevTools → Application → Clear Storage).

---

### DeliveryDataPage missing từ frontend/ — feature chỉ có ở src/ (codebase mới)

- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** Delivery Data Processing
- **Triệu chứng:** Sidebar không có "Xử lý Data Giao Hàng". Các fix ở `src/` không có tác dụng vì user đang chạy `frontend/`.
- **Root cause:** Project có 2 frontend song song: `frontend/` (codebase cũ đang chạy) và `src/` (codebase mới). `DeliveryDataPage` chỉ được xây dựng ở `src/`, chưa port sang `frontend/`.
- **Fix:** (1) Install `xlsx` vào `frontend/`; (2) Copy `processDeliveryData.ts` sang `frontend/src/utils/`; (3) Tạo `frontend/src/pages/admin/DeliveryDataPage.tsx` dùng components của frontend cũ; (4) Thêm route `/delivery-data` vào `frontend/src/Router.tsx`; (5) Thêm nav item "Xử lý Data Giao Hàng" vào `frontend/src/layouts/MainLayout.tsx`.
- **Regression test:** `tsc --noEmit` trong `frontend/` — clean (no errors in new files).
- **Cần chú ý:** Khi project có 2 codebase, phải xác định user đang chạy cái nào trước khi fix. Dấu hiệu: sidebar items không khớp với code trong `src/`. Luôn hỏi "bạn đang thấy gì trên màn hình" thay vì đoán từ code.

---

 — user.role cũ (lowercase) block toàn bộ guards

- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** AuthContext, AdminGuard, sidebar visibility
- **Triệu chứng:** Sau khi fix UserRole type sang uppercase, user vẫn không thấy chức năng — AdminGuard vẫn redirect, sidebar không hiện đúng.
- **Root cause:** `AuthProvider` đọc `user` object từ `localStorage` synchronously khi init. User đã login từ trước khi fix có `role: 'admin'` (lowercase) lưu trong localStorage. Sau khi fix type sang uppercase, so sánh `user.role !== 'ADMIN'` luôn fail vì data cũ.
- **Fix:** Thay AuthProvider init synchronous từ localStorage bằng async `GET /api/auth/me` khi mount. `isLoading = true` trong khi chờ — guards sẽ hiện loading screen thay vì redirect. Backend trả role uppercase đúng, cập nhật lại localStorage.
- **File sửa:** `src/contexts/AuthContext.tsx`
- **Regression test:** Diagnostics clean. Sau khi reload page với token hợp lệ, user object có role uppercase từ backend.
- **Cần chú ý:** Không tin vào localStorage để lấy user data mà không verify với backend. localStorage chỉ dùng để check "có token không" (để quyết định có gọi `/auth/me` không). User object luôn lấy từ backend.

---



- **Ngày:** 2026-03-31
- **Severity:** High
- **Feature liên quan:** AdminGuard, DeliveryDataPage, ExecuteDataPage, SkuFactoryListPage, UserManagement
- **Triệu chứng:** User ADMIN đăng nhập nhưng không thấy/không vào được các chức năng cần quyền admin — bị redirect về dashboard.
- **Root cause:** `src/types/common.ts` định nghĩa `UserRole = 'admin' | 'manager' | 'staff' | 'viewer'` (lowercase), nhưng DB và JWT thực tế lưu `'ADMIN' | 'ACCOUNTANT' | 'VIEWER'` (uppercase). Tất cả guard và role check so sánh sai → luôn fail.
- **Fix:** Sửa `UserRole` type về uppercase: `'ADMIN' | 'ACCOUNTANT' | 'VIEWER'`. Cập nhật tất cả chỗ so sánh role trong `App.tsx`, `DashboardLayout.tsx`, `UserListPage.tsx`, `UserCreatePage.tsx`, `UserEditPage.tsx`, `SkuFactoryListPage.tsx`.
- **Regression test:** TypeScript clean — `getDiagnostics` không có lỗi type sau khi fix.
- **Cần chú ý:** `src/types/common.ts` là source of truth cho role values ở frontend. Khi backend thay đổi role values, phải update file này trước. Không để role values hardcode rải rác — luôn dùng type `UserRole` để TypeScript bắt lỗi.

---

### xlsx 0.18.5 community edition không ghi cell styles — dùng exceljs để write

- **Ngày:** 2026-04-01
- **Severity:** Low
- **Feature liên quan:** Delivery Data Processing — export Excel output
- **Triệu chứng:** Header row của output Excel không tô màu vàng dù đã set `cell.s = { fill: ... }` và dùng `{cellStyles: true}` trong write options.
- **Root cause:** `xlsx` 0.18.5 (SheetJS community edition) không serialize thuộc tính `s` khi gọi `XLSX.write()`. Style set trong memory bị bỏ qua hoàn toàn — đọc lại file chỉ thấy `{"patternType":"none"}`. Cả hai cách (có/không có `cellStyles: true`) đều không giúp được.
- **Fix:** Giữ `xlsx` để đọc file input. Dùng `exceljs` để tạo và ghi file output — `cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }` hoạt động đúng.
- **File sửa:** `frontend/src/utils/processDeliveryData.ts` — Step 5 dùng `exceljs.Workbook` thay vì `XLSX.utils.book_new()`
- **Cần chú ý:** `xlsx` community edition chỉ đọc styles từ file có sẵn, không ghi styles mới. Khi cần output Excel có formatting (màu sắc, bold, border...) → luôn dùng `exceljs`. Tên biến `buffer` bị trùng với biến đọc file input — đặt tên là `outBuffer`.

---

### 403 Forbidden trên GET endpoints — requirePermission vs "Tất cả authenticated users"

- **Ngày:** 2026-04-07
- **Severity:** High
- **Feature liên quan:** Bảng điều phối xe — GET /api/vehicles, /api/trip-codes, /api/dispatch-schedules
- **Triệu chứng:** Vào trang /dispatch/schedule → 3 requests đều trả 403. User đã đăng nhập bình thường.
- **Root cause:** Route guards dùng `requirePermission('transport.view')` / `requirePermission('dispatch.view')` trên các GET endpoints. Permission codes này không có trong JWT của user (hoặc không được assign cho role). Spec ghi "Access: Tất cả authenticated users" nhưng code lại enforce permission-based access.
- **Fix:** Xóa `requirePermission(...)` khỏi 3 GET routes (`vehicles.ts:16`, `tripCodes.ts:16`, `dispatchSchedules.ts:15`). Write endpoints (POST/PUT/DELETE) vẫn giữ `requirePermission` vì đó là các action thay đổi data.
- **Regression test:** Backend build + 33 tests pass sau khi sửa.
- **Cần chú ý:** Khi tính năng mới spec là "tất cả authenticated users có thể xem", không thêm `requirePermission` vào GET route. Chỉ thêm `requirePermission` vào write endpoints. `authenticateToken` (đã ở `router.use()`) là đủ để bảo vệ read access.

---

## Anti-patterns Tránh Lặp Lại

### 1. Không để import ở dưới cùng file
Luôn đặt tất cả imports ở trên cùng. Dùng named imports thay vì namespace import (`import React from 'react'` → `import { useState } from 'react'`).

### 2. Không dùng createBrowserRouter khi có React Context
`createBrowserRouter` không tương thích với `createContext`. Dùng `<BrowserRouter>` JSX.

### 3. Không mix concerns trong một component
AuthProvider = state only. Navigation = page level. Validation = form library. Không nhét mọi thứ vào một chỗ.

### 4. Không trust agent-generated imports path
Luôn verify import paths đúng sau khi scaffold, đặc biệt với nested folder structures.

### 5. Không cache .env
Vite không hot-reload `.env` khi dev server đang chạy. Phải restart `npm run dev` sau khi sửa `.env`.

## Setup Improvements Cần Làm

- [ ] Thêm ESLint + Prettier cho cả backend và frontend
- [ ] Thêm shared types package hoặc script export types từ backend sang frontend
- [ ] Cấu hình path alias (`@/` → `src/`) cho import ngắn hơn
- [ ] Thêm `.env.example` đầy đủ cho cả backend và frontend
- [ ] Setup Pre-commit hook (husky + lint-staged)
