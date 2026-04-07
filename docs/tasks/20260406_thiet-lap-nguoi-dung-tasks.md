# Task List: Thiết lập người dùng — Quản lý vai trò & Quyền

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_thiet-lap-nguoi-dung-analysis.md
**UI Spec:** docs/ui/20260406_thiet-lap-nguoi-dung-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Tạo migration 004 | File `004_roles_permissions.sql`: tạo bảng `roles`, `permissions`, `role_permissions`; thêm cột `role_id` vào `users`; seed data 3 default roles + 9 permissions + default role_permissions; data migration gán `role_id` từ cột `role` hiện có | L |
| BE-02 | Cập nhật types | `backend/src/types/user.ts`: thêm `Role`, `Permission`, `RoleWithPermissions` interfaces; `UserPublic` thêm trường `role_id`, `role_name`; `TokenPayload` (jwt.ts) thêm `roleId: number`, `roleCode: string`, `permissions: string[]` | S |
| BE-03 | Cập nhật JWT + auth middleware | `jwt.ts`: `generateAccessToken/RefreshToken` nhận `permissions[]` từ DB; `auth.ts`: `AuthRequest.user` thêm `roleId`, `permissions[]`; thêm middleware `requirePermission(code)`; `authenticateToken` check `role.is_active` từ DB (1 query) nếu inactive → 403 | M |
| BE-04 | Tạo roleService | `backend/src/services/roleService.ts`: `getRoles()` (với user_count, permission_count), `getRoleById()`, `createRole()` (auto-generate code), `updateRole()`, `toggleRoleActive()` (block is_system), `getRoleUsers()` | M |
| BE-05 | Tạo permissionService | `backend/src/services/permissionService.ts`: `getAllPermissions()` (grouped by module), `getPermissionMatrix()` (roles × permissions), `updateRolePermissions(roleId, permissionIds[])` (block ADMIN) | S |
| BE-06 | Tạo rolesController + validators | `backend/src/controllers/rolesController.ts`: handler cho GET list, GET by id, POST, PUT, PATCH toggle, GET users; `backend/src/middleware/validators/roleValidators.ts`: Zod/express-validator schemas | S |
| BE-07 | Tạo permissionsController + validators | `backend/src/controllers/permissionsController.ts`: handler cho GET list, GET matrix, PUT role permissions; `backend/src/middleware/validators/permissionValidators.ts` | S |
| BE-08 | Tạo routes roles + permissions | `backend/src/routes/roles.ts`: đăng ký các routes với `requirePermission`; `backend/src/routes/permissions.ts`; cập nhật `routes/index.ts` mount `/roles` và `/permissions` | S |
| BE-09 | Cập nhật authService (login + refresh) | `authService.ts`: `findUserByEmail` và `findUserById` join với `roles` và `role_permissions` để lấy `role_id`, `role_code`, `permissions[]`; truyền vào `generateAccessToken/RefreshToken`; `authController.refresh`: check `role.is_active` → 403 nếu inactive | M |
| BE-10 | Cập nhật users routes/controller/validators | `routes/users.ts`: đổi `authorizeRoles(ADMIN)` → `requirePermission('users.manage')`; `userService.createUser`: nhận `role_id` thay `role` string; validate role is_active khi assign; `userValidators.ts`: đổi `role` enum → `role_id: int` | S |

**Thứ tự Phase 3:** BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06 → BE-07 → BE-08 → BE-09 → BE-10

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | Cập nhật types | `frontend/src/types/user.ts`: thêm `Role`, `Permission` interfaces; `UserPublic` thêm `role_id: number`, `permissions?: string[]`; xóa hardcode `UserRole` enum khỏi các component | — | S |
| FE-02 | Tạo API files | `frontend/src/api/rolesApi.ts`: `getRoles()`, `getRoleById()`, `createRole()`, `updateRole()`, `toggleRole()`, `getRoleUsers()`; `frontend/src/api/permissionsApi.ts`: `getPermissions()`, `getPermissionMatrix()`, `updateRolePermissions()` | — | S |
| FE-03 | Tạo React Query hooks | `frontend/src/hooks/useRoles.ts`: `useRoles()`, `useRoleById()`, `useCreateRole()`, `useUpdateRole()`, `useToggleRole()`; `frontend/src/hooks/usePermissions.ts`: `usePermissionMatrix()`, `useUpdateRolePermissions()` | — | S |
| FE-04 | Cập nhật authStore + AuthContext | `authStore.ts`: user type thêm `permissions[]`; `AuthContext.tsx`: hàm helper `hasPermission(code)` và `hasAnyPermission(codes[])`; sau login/refresh lưu permissions từ JWT decode | — | S |
| FE-05 | Cập nhật MainLayout (collapsible sidebar) | Sidebar "Thiết lập người dùng" collapsible accordion; mở rộng tự động khi route match /users, /roles, /permissions; lưu trạng thái trong localStorage; visibility dùng `hasAnyPermission(['users.view','roles.view','permissions.manage'])` | Screen A | M |
| FE-06 | Tạo RoleManagementPage | `frontend/src/pages/admin/RoleManagementPage.tsx`: table với loading skeleton (5 rows), empty state, error state; hiển thị badge active/inactive; action buttons theo is_system và is_active | Screen B | M |
| FE-07 | Tạo CreateRoleModal | `frontend/src/components/admin/CreateRoleModal.tsx`: form name + description; preview code (realtime); validation inline; handle 409 | Screen C | S |
| FE-08 | Tạo EditRoleModal | `frontend/src/components/admin/EditRoleModal.tsx`: prefill data; code readonly; submit "Lưu thay đổi" | Screen D | S |
| FE-09 | Tạo DeactivateRoleDialog | `frontend/src/components/admin/DeactivateRoleDialog.tsx`: fetch affected users count trước khi hiện; nếu 0 users → skip dialog; warning message với user count; nút confirm disabled khi loading | Screen E | S |
| FE-10 | Tạo PermissionManagementPage + PermissionMatrix | `frontend/src/pages/admin/PermissionManagementPage.tsx`: container + dirty state tracking; `frontend/src/components/admin/PermissionMatrix.tsx`: matrix table với sticky column/header; ADMIN checkbox disabled + tooltip; nút lưu chỉ enable khi có thay đổi | Screen F | M |
| FE-11 | Cập nhật UserManagementPage + modals | `CreateUserModal.tsx` + `EditUserModal.tsx`: role dropdown fetch từ `useRoles()` (only active); gửi `role_id` thay `role` string; `UserDetailModal.tsx`: hiện warning badge nếu role inactive | Screen G | S |
| FE-12 | Cập nhật Router.tsx | Thêm routes `/roles` → `RoleManagementPage`, `/permissions` → `PermissionManagementPage` | — | S |
| FE-13 | Thêm i18n keys | `vi.json` và `en.json`: thêm toàn bộ keys từ UI Spec Section 5 (`sidebar.*`, `roles.*`, `permissions.*`, `errors.*`) | UI Spec §5 | S |

**Thứ tự Phase 7:** FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-12 → FE-06 → FE-07 → FE-08 → FE-09 → FE-10 → FE-11 → FE-13

---

## 📊 Thứ tự thực hiện

```
Phase 3:  BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06 → BE-07 → BE-08 → BE-09 → BE-10
Phase 4:  npm run migrate (chạy 004_roles_permissions.sql)
Phase 5:  Viết tests cho roleService, permissionService, roles API, permissions API
Phase 6:  npm run test
Phase 7:  FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-12 → FE-06 → FE-07 → FE-08 → FE-09 → FE-10 → FE-11 → FE-13
Phase 8:  QA đối chiếu UI Spec + regression
```

---

## ⚠️ Lưu ý kỹ thuật

1. **Migration an toàn:** Cột `role` (VARCHAR) trên bảng users KHÔNG bị drop trong migration này. Chỉ thêm `role_id` FK. Điều này đảm bảo rollback an toàn và backward compat với code cũ trong quá trình transition.

2. **JWT thay đổi:** Access token hiện tại sau khi deploy sẽ không có `permissions[]`. Frontend cần handle gracefully: nếu `permissions` undefined trong JWT → treat as empty (logout forced after 15 min khi token hết hạn và refresh tạo token mới với permissions đầy đủ).

3. **DB query trong authenticateToken:** Thêm 1 query `SELECT r.is_active FROM roles r JOIN users u ON u.role_id = r.id WHERE u.id = $1` trong middleware. Đây là trade-off: accuracy vs performance. Acceptable cho internal tool này.

4. **requirePermission vs authorizeRoles:** Tạo `requirePermission` mới trong `auth.ts`, KHÔNG xóa `authorizeRoles` ngay (có thể có code cũ dùng). Chỉ update routes/users.ts sang dùng `requirePermission`.

5. **Seed data idempotent:** Migration dùng `ON CONFLICT DO NOTHING` để có thể chạy nhiều lần mà không lỗi.

6. **Frontend permission check:** Dùng `hasPermission()` từ AuthContext để control visibility trong MainLayout và các component. Không check `user.role === 'ADMIN'` nữa — check permission codes.

7. **Existing JWT tokens sau deploy:** Users đang đăng nhập sẽ có token cũ (không có permissions[]). Khi token refresh, token mới sẽ có permissions[]. Trong 15 phút transition, frontend nên fallback về role-based check nếu permissions[] undefined.

8. **migrate.ts script:** Backend có `src/scripts/run-migration.ts` — cần kiểm tra script này để đảm bảo chạy đúng file 004.

9. **UserManagementPage hiện có:** Hiện dùng `UserRole` enum hardcode cho dropdown. Cần đổi sang fetch từ API `/roles?is_active=true` và dùng `role_id` trong create/update requests.

10. **Tests:** Focus test vào roleService (deactivate protection, code generation) và permissionService (ADMIN protection). Không test middleware trong unit test — test trong integration test.

---

## 📋 Tổng effort ước tính

| Phase | Tasks | Effort |
|-------|-------|--------|
| Backend (Phase 3) | 10 tasks | ~6–8 giờ |
| Frontend (Phase 7) | 13 tasks | ~8–10 giờ |
| QA (Phase 5+6+8) | Tests + regression | ~3–4 giờ |
| **Tổng** | 23 tasks | **~17–22 giờ** |
