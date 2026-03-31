# Task List: Quản lý User Truy Cập Hệ Thống

**Ngày:** 2026-03-30
**BA Doc:** docs/ba/20260330_user-management-analysis.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Migration | File `002_add_user_management.sql`: ALTER users (is_active, last_login_at, created_by, updated_by) + CREATE user_activities. Chạy migration trên dev DB. | M |
| BE-02 | UserService | File `src/services/userService.ts`: createUser, updateUser, deleteUser, resetPassword, getUsers (list với search/filter/pagination), getUserById, logActivity | M |
| BE-03 | Validation schemas | File `src/middleware/validators/userValidators.ts`: createUserSchema, updateUserSchema, resetPasswordSchema, paginationSchema (dùng express-validator như hiện tại) | S |
| BE-04 | UsersController | File `src/controllers/usersController.ts`: CRUD handlers gọi userService | S |
| BE-05 | UsersRoutes (mở rộng) | File `src/routes/users.ts`: PATCH /:id/password, DELETE /:id, PUT /:id, GET / (thêm search/filter/pagination), GET /:id. Giữ middleware authenticateToken + authorizeRoles(ADMIN) | S |

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| FE-01 | usersApi | File `src/api/usersApi.ts`: getUsers, getUserById, createUser, updateUser, deleteUser, resetPassword. Dùng axiosClient. | S |
| FE-02 | React Query hooks | File `src/hooks/useUsers.ts`: useUsers (list), useUserById, useCreateUser, useUpdateUser, useDeleteUser, useResetPassword | M |
| FE-03 | UserManagementPage | File `src/pages/admin/UserManagementPage.tsx`: Table + Search + Filter + Pagination. Gọi useUsers hook. | M |
| FE-04 | CreateUserModal | File `src/components/admin/CreateUserModal.tsx`: Modal form với React Hook Form + Yup validation. Gọi useCreateUser. | S |
| FE-05 | EditUserModal | File `src/components/admin/EditUserModal.tsx`: Modal form pre-filled. Gọi useUpdateUser. Check: không sửa chính mình. | S |
| FE-06 | UserDetailModal | File `src/components/admin/UserDetailModal.tsx`: Read-only modal. Gọi useUserById. | S |
| FE-07 | ResetPasswordModal | File `src/components/admin/ResetPasswordModal.tsx`: Modal nhập mật khẩu mới + confirm. Gọi useResetPassword. | S |
| FE-08 | DeleteConfirmDialog | File `src/components/admin/DeleteConfirmDialog.tsx`: Confirmation dialog. Gọi useDeleteUser. Check: không xóa chính mình, không xóa admin cuối cùng. | S |
| FE-09 | Nav item | File `src/layouts/MainLayout.tsx`: Thêm nav item "Quản lý người dùng" (Users icon từ lucide) — chỉ hiện khi user.role === 'ADMIN' | S |
| FE-10 | Router | File `src/Router.tsx`: Thêm route `/users` → UserManagementPage trong MainLayout, protected bởi ProtectedRoute | S |
| FE-11 | i18n | Files `vi.json` và `en.json` trong `src/i18n/`: Thêm keys cho tất cả text UI của feature | S |

## 📊 Thứ tự thực hiện

```
Phase 3: BE-01 → BE-02 → BE-03 → BE-04 → BE-05
Phase 4: Run migration
Phase 5: Viết tests
Phase 6: Chạy tests
Phase 7: FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07 → FE-08 → FE-09 → FE-10 → FE-11
Phase 8: Regression
```

## ⚠️ Lưu ý kỹ thuật

### Backend
- **Migration:** Thêm `IF NOT EXISTS` cho tất cả ALTER/CREATE để an toàn khi chạy lại. Đặt default `is_active = TRUE` cho row hiện có.
- **Authorization:** Tất cả routes users phải có `authorizeRoles(UserRole.ADMIN)`. Ngoài ra, check `actorId !== targetId` trong update/delete để tránh tự sửa/xóa chính mình.
- **Activity logging:** Mỗi mutation (create, update, delete, resetPassword) cần insert vào `user_activities`. Lấy `actorId` từ `req.user.userId`.
- **Soft delete:** Không dùng. Xóa = hard DELETE.
- **Last admin protection:** Khi DELETE, đếm số user có role=ADMIN còn lại. Nếu ≤ 1 → trả 400.
- **Self-role-change protection:** Khi PUT, nếu `actorId === targetId` và body chứa `role` khác ADMIN → từ chối.
- **Password:** Dùng bcrypt hashSync (10 rounds) — reuse `hashPassword` từ utils/password.ts.
- **Activity log `ip_address`:** Lấy từ `req.ip` hoặc `req.socket.remoteAddress`.

### Frontend
- **i18n:** Tất cả text hardcoded → thay bằng `t('key')`. Tạo file `src/i18n/vi.json` và `src/i18n/en.json` nếu chưa có.
- **React Query:** Dùng `useMutation` cho create/update/delete/resetPassword. `useQuery` cho list và detail. `invalidateQueries(['users'])` sau mutation.
- **Validation:** Yup schema trong mỗi modal form, match với backend express-validator schemas.
- **Error handling:** Hiển thị `error.response?.data?.message` từ axios.
- **Empty state:** Khi không có users hoặc search không ra → hiển thị empty state.
- **Current user check:** Lấy `currentUser.id` từ `useAuth().user` → so sánh với `user.id` của dòng đang render → ẩn edit/delete buttons nếu trùng.
- **Admin nav:** Dùng `useAuth().user?.role === 'ADMIN'` để show/hide nav item.

### Database
- Cột `is_active` thêm default `TRUE` cho existing rows (migration phải dùng `DEFAULT TRUE`).
- Cột `updated_by` và `created_by` là FK nullable (vì admin đầu tiên có thể không có created_by).
- `user_activities.details` là JSONB — lưu `{ old: {...}, new: {...} }` khi update.
- Index trên `users.email` (đã có UNIQUE), thêm index trên `users.role` và `users.is_active` để tối ưu query.
- Index trên `user_activities.actor_id` và `user_activities.target_user_id`.
