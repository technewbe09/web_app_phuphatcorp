# UI Spec: Thiết lập người dùng — Quản lý vai trò & Quyền

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_thiet-lap-nguoi-dung-analysis.md
**Phase:** 1.5 — UI/UX Design

---

## Section 1: User Journey

### Happy Path — Admin quản lý vai trò

```
[Sidebar] Admin thấy "Thiết lập người dùng" trong menu
   → Click mở rộng → thấy 3 submenu
   → Click "Quản lý vai trò"
   → Xem danh sách vai trò (table: ADMIN, ACCOUNTANT, VIEWER + custom roles)
   → Click "Thêm vai trò" → Modal tạo vai trò
   → Nhập tên, mô tả → Submit → Toast success → Vai trò mới xuất hiện trong table
   → Click icon sửa trên vai trò mới → Modal sửa → Lưu
   → Click icon deactivate → Confirm dialog (nếu có user) → Deactivate → Badge "Inactive"
```

### Happy Path — Admin cấu hình quyền

```
[Sidebar] → Click "Quản lý quyền"
   → Xem bảng matrix: cột = roles, hàng = permissions (gom theo module)
   → Click vào vai trò muốn cấu hình (hoặc chọn từ dropdown)
   → Toggle checkbox ON/OFF
   → Click "Lưu thay đổi" → Toast success
   → ADMIN columns: tất cả checkbox checked + disabled + tooltip
```

### Alternative Path — Deactivate vai trò có user

```
Admin click deactivate vai trò "ACCOUNTANT" (đang có 5 users)
   → Dialog: "Vai trò 'Accountant' đang có 5 người dùng. Deactivate sẽ thu hồi toàn bộ
              quyền của họ ngay lập tức. Tiếp tục?"
   → Admin confirm → Deactivate → Badge "Inactive" → Toast success
   → 5 users đó nhận 403 tại request tiếp theo
```

### Error Path — Tạo vai trò trùng tên

```
Admin nhập tên "Kế Toán" (đã có)
   → Submit → API trả 409
   → Lỗi inline dưới field "Tên": "Mã vai trò đã tồn tại. Vui lòng chọn tên khác."
```

---

## Section 2: Screen Inventory

---

### Screen A: Sidebar — Thiết lập người dùng (cập nhật MainLayout)

**Layout:**
```
┌─ Sidebar (w-64) ─────────────────────┐
│  [Logo] PhuPhatCorp                   │
│                                        │
│  ● Dashboard                           │
│  ● Dữ liệu giao hàng                  │
│                                        │
│  ▼ Thiết lập người dùng  [admin only] │
│    ├── Quản lý người dùng             │
│    ├── Quản lý vai trò                │
│    └── Quản lý quyền                  │
│                                        │
│  ─────────────────────────────────────│
│  [Avatar] Tên user                    │
│  [Đăng xuất]                          │
└────────────────────────────────────────┘
```

**States:**
- **Collapsed** (default nếu không ở route /users, /roles, /permissions): hiện icon + text "Thiết lập người dùng" với arrow ▶
- **Expanded**: hiện 3 submenu với indent (pl-4)
- **Active submenu item**: highlighted với bg và border-left accent
- **Visibility**: chỉ hiện với user có ít nhất một trong: `users.view`, `roles.view`, `permissions.manage`
- **Submenu visibility**: mỗi submenu hiện theo permission tương ứng

**Behavior:**
- Click parent toggle mở/đóng submenu (accordion style)
- Tự động mở rộng khi route khớp với bất kỳ submenu nào
- Lưu trạng thái collapsed/expanded trong localStorage

---

### Screen B: Quản lý vai trò — `/roles`

**Yêu cầu permission:** `roles.view`

**Layout:**
```
┌─ Header ──────────────────────────────────────────────────┐
│  Quản lý vai trò                         [+ Thêm vai trò] │
│  X vai trò                                                 │
└────────────────────────────────────────────────────────────┘

┌─ Table ────────────────────────────────────────────────────┐
│  Tên vai trò  │ Mã   │ Số quyền │ Số users │ Trạng thái │ Hành động │
│  ─────────────┼──────┼──────────┼──────────┼────────────┼───────────│
│  Administrator│ADMIN │    9     │    1     │ ● Active   │ [Xem]     │
│  Accountant   │ACCNT │    4     │    3     │ ● Active   │ [✎][⊘]   │
│  Viewer       │VIEWR │    3     │    2     │ ● Active   │ [✎][⊘]   │
│  Kế Toán Mới  │KE_TO │    2     │    0     │ ○ Inactive │ [✎][✓]   │
└────────────────────────────────────────────────────────────┘
```

**States của bảng:**
- **Loading**: 5 hàng skeleton (pulse animation), mỗi hàng có 6 cột skeleton bar
- **Empty**: Icon + "Chưa có vai trò nào" + nút "Thêm vai trò đầu tiên"
- **Error**: Alert đỏ "Không thể tải danh sách vai trò" + nút "Thử lại"
- **Normal**: Bảng đủ dữ liệu

**Hành động per row:**
- ADMIN (is_system, is_active): chỉ hiện nút `[Xem]` — không cho sửa/deactivate
- ACCOUNTANT/VIEWER (is_system): hiện `[✎ Sửa]` + `[⊘ Deactivate]`, không có `[Activate]`
- Custom active role: `[✎ Sửa]` + `[⊘ Deactivate]`
- Custom inactive role: `[✎ Sửa]` + `[✓ Activate]`
- Nút `[+ Thêm vai trò]`: chỉ hiện khi có permission `roles.manage`

**Badge trạng thái:**
- Active: `● Active` (màu xanh lá, bg-green-50 text-green-700)
- Inactive: `○ Inactive` (màu xám, bg-gray-50 text-gray-500)

---

### Screen C: Modal — Tạo vai trò mới

**Trigger:** Nút `[+ Thêm vai trò]` trên Screen B

**Layout:**
```
┌─ Modal (max-w-md) ─────────────────────────────┐
│  Thêm vai trò mới                           [×] │
│  ─────────────────────────────────────────────  │
│  Tên vai trò *                                  │
│  [________________________________]             │
│  [Lỗi inline nếu có]                           │
│                                                  │
│  Mô tả                                          │
│  [________________________________]             │
│  [________________________________]             │
│                                                  │
│  Mã vai trò (tự động)                           │
│  [MY_ROLE] ← readonly, preview                  │
│                                                  │
│  ─────────────────────────────────────────────  │
│              [Hủy]    [Thêm vai trò ⟳]          │
└─────────────────────────────────────────────────┘
```

**States:**
- **Idle**: Form trống, nút submit enabled
- **Typing**: Mã vai trò preview cập nhật realtime theo tên nhập
- **Submitting**: Nút "Thêm vai trò" → spinner + disabled, form fields disabled
- **Error (409)**: Lỗi inline dưới tên "Mã vai trò đã tồn tại. Vui lòng chọn tên khác."
- **Success**: Modal đóng + toast "Thêm vai trò thành công" + table refresh

**Validation:**
- Tên: required, 2–100 ký tự
- Mô tả: optional, max 500 ký tự

---

### Screen D: Modal — Sửa vai trò

**Trigger:** Nút `[✎]` trên row của Screen B

**Layout:** Tương tự Modal tạo, nhưng:
- Tiêu đề: "Sửa vai trò — [Tên vai trò]"
- Fields điền sẵn name, description
- Mã vai trò: hiển thị readonly (không thể sửa)
- Nút submit: "Lưu thay đổi"

**States:** Giống Screen C

---

### Screen E: Dialog — Confirm Deactivate vai trò

**Trigger:** Nút `[⊘ Deactivate]` trên row

**Luồng xử lý:**
1. Frontend gọi `GET /api/roles/:id/users` để lấy số users bị ảnh hưởng
2. Nếu affected_users = 0: deactivate ngay, không cần dialog
3. Nếu affected_users > 0: hiện dialog

**Layout (khi có users bị ảnh hưởng):**
```
┌─ Dialog (max-w-sm) ─────────────────────────────┐
│  ⚠ Deactivate vai trò                           │
│  ─────────────────────────────────────────────  │
│  Vai trò "Kế Toán" đang được sử dụng bởi        │
│  3 người dùng.                                   │
│                                                  │
│  Deactivate sẽ thu hồi toàn bộ quyền của họ     │
│  ngay lập tức. Họ sẽ không thể truy cập hệ      │
│  thống cho đến khi được gán vai trò mới.         │
│                                                  │
│  ─────────────────────────────────────────────  │
│     [Hủy]     [Deactivate — ảnh hưởng 3 users]  │
└─────────────────────────────────────────────────┘
```

**States:**
- **Loading count**: Hiện spinner nhỏ bên cạnh "đang kiểm tra..."
- **0 users**: Deactivate ngay, hiện toast success
- **>0 users**: Hiện dialog như trên
- **Submitting**: Nút deactivate disabled + spinner
- **Success**: Dialog đóng, badge row → "Inactive", toast success

---

### Screen F: Quản lý quyền — `/permissions`

**Yêu cầu permission:** `permissions.manage`

**Layout:**
```
┌─ Header ──────────────────────────────────────────────────┐
│  Quản lý quyền                                             │
│  Cấu hình quyền cho từng vai trò                          │
└────────────────────────────────────────────────────────────┘

┌─ Permission Matrix ────────────────────────────────────────┐
│  Quyền               │ ADMIN │ ACCNT │ VIEWER │ Kế Toán   │
│  ──────────────────── ┼───────┼───────┼────────┼───────────│
│  📊 Dashboard        │       │       │        │           │
│    • Xem Dashboard   │  ☑*  │  ☑   │   ☑   │    ☐      │
│  👥 Người dùng       │       │       │        │           │
│    • Xem danh sách   │  ☑*  │  ☐   │   ☐   │    ☐      │
│    • Quản lý         │  ☑*  │  ☐   │   ☐   │    ☐      │
│  📦 Dữ liệu GH       │       │       │        │           │
│    • Xem             │  ☑*  │  ☑   │   ☑   │    ☑      │
│    • Quản lý         │  ☑*  │  ☑   │   ☐   │    ☐      │
│  🔐 Vai trò          │       │       │        │           │
│    • Xem             │  ☑*  │  ☐   │   ☐   │    ☐      │
│    • Quản lý         │  ☑*  │  ☐   │   ☐   │    ☐      │
│  ⚙ Quyền hạn         │       │       │        │           │
│    • Quản lý quyền   │  ☑*  │  ☐   │   ☐   │    ☐      │
│  📈 Báo cáo          │       │       │        │           │
│    • Xem báo cáo     │  ☑*  │  ☑   │   ☑   │    ☐      │
└────────────────────────────────────────────────────────────┘

  ☑* = Checked + Disabled (ADMIN luôn có tất cả)
  ☑  = Checked + Enabled
  ☐  = Unchecked + Enabled

┌─ Footer Action Bar ────────────────────────────────────────┐
│  [Hủy thay đổi]                        [Lưu tất cả ⟳]     │
└────────────────────────────────────────────────────────────┘
```

**States:**
- **Loading**: Skeleton matrix với animated pulse
- **Error**: Alert "Không thể tải ma trận quyền" + [Thử lại]
- **Idle (no change)**: Nút "Lưu tất cả" disabled
- **Has unsaved changes**: Nút "Lưu tất cả" enabled, "Hủy thay đổi" enabled
- **Saving**: Nút "Lưu tất cả" disabled + spinner
- **Save success**: Toast "Cập nhật quyền thành công", reset dirty state
- **Save error**: Toast error, preserve changes

**UX notes:**
- Columns sticky-header khi scroll ngang
- Columns "Vai trò" fixed ở trái khi scroll ngang
- ADMIN column: tooltip trên mỗi checkbox disabled "Vai trò ADMIN luôn có toàn bộ quyền"
- Unsaved changes indicator: badge `● Chưa lưu` gần nút save
- Không có confirm khi bỏ check — lưu mới apply

---

### Screen G: UserManagementPage (cập nhật)

**Thay đổi:** Dropdown "Vai trò" khi tạo/sửa user:
- Cũ: hardcode `['ADMIN', 'ACCOUNTANT', 'VIEWER']`
- Mới: fetch từ `GET /api/roles` (chỉ active roles)
- Hiển thị: `role.name` (code ẩn)
- Khi role bị deactivate và user đang có role đó: hiển thị badge `⚠ Vai trò inactive` trong UserDetailModal

---

## Section 3: Component Checklist

| Component | States bắt buộc | Mô tả |
|-----------|----------------|-------|
| `MainLayout.tsx` (update) | collapsed / expanded / active-child | Collapsible sidebar group |
| `RoleManagementPage.tsx` | loading / empty / error / normal | Page container |
| `RoleTable.tsx` | loading-skeleton / empty / error / normal | Table với skeleton rows |
| `CreateRoleModal.tsx` | idle / typing / submitting / error-409 / success | Form modal |
| `EditRoleModal.tsx` | loading-data / idle / submitting / error / success | Form modal with prefill |
| `DeactivateRoleDialog.tsx` | loading-count / confirm-0-users / confirm-n-users / submitting / success | Confirm dialog |
| `PermissionManagementPage.tsx` | loading / error / idle / has-changes / saving / save-error | Matrix page |
| `PermissionMatrix.tsx` | normal / admin-readonly | Matrix table component |

---

## Section 4: Validation UX

| Field | Rule | Hiển thị lỗi |
|-------|------|-------------|
| Role name (create/edit) | Required, 2–100 chars | Inline dưới field |
| Role name (409 collision) | Code phải unique | Inline dưới field |
| Role description | Max 500 chars | Inline dưới field |
| Permission save (ADMIN) | Blocked | Không có UI để trigger — nút disabled |
| Deactivate ADMIN | Blocked | Nút ẩn hoàn toàn |
| Assign inactive role to user | Backend 400 | Toast error |

**Toasts:**
- Success: màu xanh lá, timeout 3s, góc dưới phải
- Error: màu đỏ, timeout 5s, không tự đóng

---

## Section 5: i18n Keys

### Thêm vào `vi.json` và `en.json`

```json
{
  "sidebar": {
    "userSettings": "Thiết lập người dùng",
    "userManagement": "Quản lý người dùng",
    "roleManagement": "Quản lý vai trò",
    "permissionManagement": "Quản lý quyền"
  },
  "roles": {
    "title": "Quản lý vai trò",
    "addRole": "Thêm vai trò",
    "editRole": "Sửa vai trò",
    "deactivateRole": "Deactivate",
    "activateRole": "Activate",
    "roleName": "Tên vai trò",
    "roleCode": "Mã vai trò",
    "roleDescription": "Mô tả",
    "permissionCount": "Số quyền",
    "userCount": "Số users",
    "status": "Trạng thái",
    "active": "Active",
    "inactive": "Inactive",
    "systemRole": "Vai trò hệ thống",
    "noRoles": "Chưa có vai trò nào",
    "createFirst": "Thêm vai trò đầu tiên",
    "loadError": "Không thể tải danh sách vai trò",
    "createSuccess": "Thêm vai trò thành công",
    "updateSuccess": "Cập nhật vai trò thành công",
    "deactivateSuccess": "Deactivate vai trò thành công",
    "activateSuccess": "Activate vai trò thành công",
    "codeAutoGenerated": "Mã tự động",
    "deactivateConfirmTitle": "Deactivate vai trò",
    "deactivateConfirmNoUsers": "Bạn có chắc muốn deactivate vai trò này?",
    "deactivateConfirmWithUsers": "Vai trò \"{name}\" đang được sử dụng bởi {count} người dùng. Deactivate sẽ thu hồi toàn bộ quyền của họ ngay lập tức.",
    "deactivateConfirmWarning": "Họ sẽ không thể truy cập hệ thống cho đến khi được gán vai trò mới.",
    "deactivateConfirmButton": "Deactivate — ảnh hưởng {count} users",
    "systemRoleCannotDeactivate": "Không thể deactivate vai trò hệ thống",
    "inactiveRoleBadge": "Vai trò inactive",
    "validation": {
      "nameRequired": "Tên vai trò là bắt buộc",
      "nameMinLength": "Tên vai trò tối thiểu 2 ký tự",
      "nameMaxLength": "Tên vai trò tối đa 100 ký tự",
      "descriptionMaxLength": "Mô tả tối đa 500 ký tự",
      "codeExists": "Mã vai trò đã tồn tại. Vui lòng chọn tên khác."
    }
  },
  "permissions": {
    "title": "Quản lý quyền",
    "subtitle": "Cấu hình quyền cho từng vai trò",
    "saveAll": "Lưu tất cả",
    "discardChanges": "Hủy thay đổi",
    "unsavedChanges": "Chưa lưu",
    "saveSuccess": "Cập nhật quyền thành công",
    "saveError": "Không thể lưu quyền. Vui lòng thử lại.",
    "loadError": "Không thể tải ma trận quyền",
    "adminReadonly": "Vai trò ADMIN luôn có toàn bộ quyền",
    "modules": {
      "dashboard": "Dashboard",
      "delivery_data": "Dữ liệu giao hàng",
      "users": "Người dùng",
      "roles": "Vai trò",
      "permissions": "Quyền hạn",
      "reports": "Báo cáo"
    },
    "permCodes": {
      "dashboard.view": "Xem Dashboard",
      "delivery_data.view": "Xem dữ liệu giao hàng",
      "delivery_data.manage": "Quản lý dữ liệu giao hàng",
      "users.view": "Xem danh sách người dùng",
      "users.manage": "Quản lý người dùng",
      "reports.view": "Xem báo cáo",
      "roles.view": "Xem danh sách vai trò",
      "roles.manage": "Quản lý vai trò",
      "permissions.manage": "Quản lý quyền"
    }
  },
  "errors": {
    "roleDeactivated": "Vai trò của bạn đã bị thu hồi. Vui lòng liên hệ admin.",
    "insufficientPermission": "Bạn không có quyền thực hiện thao tác này."
  }
}
```

---

## Section 6: Web Design Guidelines Check

- **Accessibility:** Checkboxes trong matrix có label rõ ràng (permission.name + role.name)
- **Keyboard nav:** Modal/Dialog có focus trap, Esc để đóng, Tab để di chuyển giữa fields
- **Color contrast:** Badge Active (green-700 trên green-50) đạt AA. Badge Inactive (gray-500 trên gray-50) đạt AA
- **Loading states:** Tất cả async operations có skeleton/spinner — không để blank
- **Empty states:** Mỗi list có empty state rõ ràng với CTA
- **Destructive actions:** Deactivate (nếu có users) bắt buộc có confirm dialog
- **Disabled buttons:** Nút submit luôn disabled khi đang loading
- **Responsive:** Layout dùng overflow-x-auto cho table và matrix — mobile-friendly
- **Error recovery:** Mọi error state có nút "Thử lại"
- **Feedback:** Success/error dùng toast nhất quán với hệ thống hiện tại
- **Tooltips:** Checkboxes disabled (ADMIN) có tooltip giải thích lý do
