# Test Cases: Quản lý User Truy Cập Hệ Thống

**Ngày:** 2026-03-30
**BA Doc:** docs/ba/20260330_user-management-analysis.md

---

## 1. Backend Unit Tests

### 1.1 userService.createUser

| # | Test | Input | Expected |
|---|------|-------|----------|
| TC-01 | Tạo user thành công | `{ email, password, full_name, role: ACCOUNTANT }` | User created, returned without password_hash |
| TC-02 | Email trùng | email đã tồn tại | ServiceError `EMAIL_EXISTS`, status 409 |
| TC-03 | Role mặc định VIEWER | không truyền role | User created with role=VIEWER |
| TC-04 | Password hashed | password bất kỳ | password_hash != plain password |
| TC-05 | created_by được set | actorId bất kỳ | INSERT có created_by |

### 1.2 userService.updateUser

| # | Test | Input | Expected |
|---|------|-------|----------|
| TC-06 | Update thành công | valid id + full_name + role | User updated, returned |
| TC-07 | User không tồn tại | invalid id | ServiceError `USER_NOT_FOUND`, status 404 |
| TC-08 | Không sửa chính mình | actorId === targetId + thay đổi role | ServiceError `CANNOT_CHANGE_OWN_ROLE`, status 403 |
| TC-09 | Partial update | chỉ truyền full_name | Only full_name updated |
| TC-10 | Activity log được ghi | bất kỳ update nào | INSERT vào user_activities với action='UPDATE_USER' |

### 1.3 userService.deleteUser

| # | Test | Input | Expected |
|---|------|-------|----------|
| TC-11 | Xóa thành công | valid id, actorId khác | DELETE FROM users |
| TC-12 | User không tồn tại | invalid id | ServiceError `USER_NOT_FOUND`, status 404 |
| TC-13 | Không xóa chính mình | actorId === targetId | ServiceError `CANNOT_DELETE_SELF`, status 403 |
| TC-14 | Không xóa admin cuối | chỉ còn 1 admin | ServiceError `LAST_ADMIN`, status 400 |
| TC-15 | Xóa user active khác | valid non-admin id | DELETE thành công |

### 1.4 userService.resetPassword

| # | Test | Input | Expected |
|---|------|-------|----------|
| TC-16 | Reset thành công | valid id + new password | password_hash updated |
| TC-17 | User không tồn tại | invalid id | ServiceError `USER_NOT_FOUND`, status 404 |
| TC-18 | Password hashed | new password | password_hash != plain |

### 1.5 userService.getUsers

| # | Test | Input | Expected |
|---|------|-------|----------|
| TC-19 | Không filter | không có params | Tất cả users |
| TC-20 | Filter by role | role=ACCOUNTANT | Chỉ ACCOUNTANT users |
| TC-21 | Search full_name | search="admin" | Users có full_name chứa "admin" |
| TC-22 | Search email | search="@example.com" | Users có email chứa "@example.com" |
| TC-23 | Filter is_active=false | is_active=false | Chỉ inactive users |
| TC-24 | Pagination | page=2, limit=5 | 5 users, meta đúng |
| TC-25 | Empty result | search không match | users=[], meta.total=0 |

### 1.6 Backend API Integration Tests

| # | Test | Endpoint | Auth | Expected |
|---|------|---------|------|----------|
| TC-26 | Non-ADMIN bị 403 | GET /users | JWT + ACCOUNTANT | 403 Forbidden |
| TC-27 | Không đăng nhập bị 401 | GET /users | No token | 401 Unauthorized |
| TC-28 | Tạo user với validation fail | POST /users (email rỗng) | JWT + ADMIN | 400 Bad Request |
| TC-29 | GET /users với query params | GET /users?role=ADMIN&page=1 | JWT + ADMIN | 200 + filtered results |
| TC-30 | DELETE admin cuối cùng | DELETE /users/1 (admin cuối) | JWT + ADMIN | 400 LAST_ADMIN |

---

## 2. Frontend Functional Tests

### 2.1 UserManagementPage

| # | Test | Expected |
|---|------|----------|
| FT-01 | ADMIN thấy nav "Quản lý người dùng" | Nav item visible trong sidebar |
| FT-02 | Non-ADMIN không thấy nav item | Nav item ẩn |
| FT-03 | Truy cập /users với ACCOUNTANT | Redirect hoặc 403 (hoặc BE trả 403) |
| FT-04 | Danh sách users hiển thị | Table với dữ liệu |
| FT-05 | Empty state khi không có user | "Chưa có người dùng nào" |
| FT-06 | Search hoạt động | Filter users khi type |
| FT-07 | Filter role hoạt động | Filter dropdown |
| FT-08 | Pagination hiển thị | Page info + prev/next buttons |

### 2.2 CreateUserModal

| # | Test | Expected |
|---|------|----------|
| FT-09 | Mở modal bằng nút "Thêm" | Modal hiển thị |
| FT-10 | Submit với dữ liệu hợp lệ | User mới xuất hiện trong danh sách |
| FT-11 | Submit với email trùng | Hiển thị lỗi |
| FT-12 | Submit với password < 6 ký tự | Validation error |
| FT-13 | Click Hủy đóng modal | Modal đóng, form reset |

### 2.3 EditUserModal

| # | Test | Expected |
|---|------|----------|
| FT-14 | Nút Edit ẩn trên dòng chính mình | Không có icon Pencil |
| FT-15 | Edit user khác | Modal mở với dữ liệu pre-filled |
| FT-16 | Email bị disabled | Input email không sửa được |
| FT-17 | Toggle is_active | Giá trị thay đổi khi toggle |

### 2.4 DeleteConfirmDialog

| # | Test | Expected |
|---|------|----------|
| FT-18 | Confirm xóa | User biến mất khỏi danh sách |
| FT-19 | Click Hủy | Dialog đóng, user còn |

### 2.5 ResetPasswordModal

| # | Test | Expected |
|---|------|----------|
| FT-20 | Reset thành công | Toast/message thành công |
| FT-21 | Password < 6 ký tự | Validation error |

### 2.6 UserDetailModal

| # | Test | Expected |
|---|------|----------|
| FT-22 | Xem chi tiết | Modal hiển thị thông tin user |
| FT-23 | Loading state | Spinner khi đang load |
