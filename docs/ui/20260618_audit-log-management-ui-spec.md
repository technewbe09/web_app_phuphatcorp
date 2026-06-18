# UI Spec: Nhật ký Hệ thống (Audit Log Management)

**Ngày:** 2026-06-18
**BA Doc:** docs/ba/20260618_audit-log-management-analysis.md
**Role liên quan:** ADMIN, ACCOUNTANT

---

## 1. User Journey

### Happy Path

```
Sidebar → "Thiết lập người dùng" → click "Nhật ký hệ thống"
  → Trang /logs load, tab "Nhật ký truy cập" active mặc định
  → Hiển thị skeleton loader → bảng dữ liệu access logs với pagination
  → User chọn filter: dropdown user, dropdown method, input path, dropdown status, date range
  → Bấm "Tìm kiếm" → skeleton loader → bảng cập nhật kết quả filter
  → User click tab "Nhật ký thao tác"
  → Bảng audit logs hiển thị với bộ filter riêng (user, action, entity type, date range)
  → User click icon expand ở 1 row → row mở rộng hiển thị JSON details formatted
  → User chuyển trang bằng pagination ở dưới bảng
```

### Alternative Paths

```
A. Không có dữ liệu:
   - Một trong 2 tab hiển thị empty state: icon + "Chưa có log nào"

B. Filter không có kết quả:
   - Empty state: icon + "Không tìm thấy log nào"

C. Tab đang fetch dữ liệu, user chuyển tab:
   - Tab cũ bị unmount, tab mới bắt đầu load skeleton

D. VIEWER (không có permission logs.view):
   - Menu "Nhật ký hệ thống" không hiển thị trong sidebar
   - Truy cập trực tiếp /logs → 403 hoặc redirect về dashboard
```

### Error Paths

```
E. API load danh sách fail:
   - Hiển thị error state với message "Không thể tải dữ liệu log" + nút "Thử lại"

F. API filter fail:
   - Toast error, giữ nguyên filter hiện tại, không xóa input user đã nhập
```

---

## 2. Screen Inventory

### Screen: Nhật ký hệ thống (/logs)

**Route:** `/logs`
**Role:** ADMIN, ACCOUNTANT
**Điều kiện hiển thị:** User có permission `logs.view` hoặc role === 'ADMIN'

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Nhật ký hệ thống                                                 │
│                                                                   │
│  ┌──────────────┬────────────────────┐                            │
│  │ Nhật ký truy cập │ Nhật ký thao tác │  ← Tab bar              │
│  └──────────────┴────────────────────┘                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Filters (thay đổi theo tab):                                 │ │
│  │ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐      │ │
│  │ │ User  ▾  │ │ Method ▾ │ │ Path...    │ │ Status ▾ │      │ │
│  │ └──────────┘ └──────────┘ └────────────┘ └──────────┘      │ │
│  │ ┌────────────┐ ┌────────────┐ ┌──────────┐                 │ │
│  │ │ Từ ngày    │ │ Đến ngày   │ │ Tìm kiếm │                 │ │
│  │ └────────────┘ └────────────┘ └──────────┘                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Table (tab "Nhật ký truy cập")                               │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Thời gian │ User │ Method │ Path │ Status │ IP │ Time │     │ │
│  │ ──────────┼──────┼────────┼──────┼────────┼────┼──────│     │ │
│  │ 18/06 12:00│admin │ POST   │ /api/│ 201 ✅ │ 127│ 45ms │     │ │
│  │ 18/06 11:58│ktoan │ PUT    │ /api/│ 200 ✅ │ 127│ 32ms │     │ │
│  │ 18/06 11:55│ktoan │ DELETE │ /api/│ 403 ⛔│ 127│ 12ms │     │ │
│  │ ...                                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Table (tab "Nhật ký thao tác")                               │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ │ Thời gian │ User │ Hành động │ Đối tượng │ Mô tả │ IP  │  │ │
│  │ │──────────┼──────┼───────────┼───────────┼───────┼─────│  │ │
│  │▶│18/06 12:00│admin │ LOGIN     │ auth      │ ...   │ 127 │  │ │
│  │ │           │      │           │           │       │     │  │ │
│  │▶│18/06 11:58│ktoan │ UPDATE    │ driver_   │ Inv # │ 127 │  │ │
│  │ │           │      │           │ invoice   │ 123   │     │  │ │
│  │ │  ┌─────────────────────────────────────────────┐        │  │ │
│  │ │  │ Details (JSON formatted):                    │        │  │ │
│  │ │  │ {                                            │        │  │ │
│  │ │  │   "so_xe": "51C12345",                       │        │  │ │
│  │ │  │   "so_hoa_don": ["HD001", "HD002"]           │        │  │ │
│  │ │  │ }                                            │        │  │ │
│  │ │  └─────────────────────────────────────────────┘        │  │ │
│  │ ...                                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ◀ Trang 1/5 ▶          Hiển thị 1-50 của 250               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### States (cho mỗi tab)

| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| **Loading** | Tab mount, đang fetch | Skeleton: 5 rows placeholder với các cột nhấp nháy |
| **Empty** | API trả về `data: []`, không có filter | Icon FileText + text "Chưa có log nào" |
| **Empty search** | API trả về `data: []`, có filter active | Icon SearchX + text "Không tìm thấy log nào" + nút "Xóa bộ lọc" |
| **Populated** | Có data | Table đầy đủ với data rows |
| **Error** | API fail | Icon AlertTriangle + text "Không thể tải dữ liệu" + nút "Thử lại" |

#### Filters (theo tab)

**Tab "Nhật ký truy cập":**
| Filter | Component | Mô tả |
|--------|-----------|-------|
| User | Select dropdown, searchable | Lấy danh sách user từ API hoặc từ cache |
| Method | Select dropdown | POST, PUT, DELETE, PATCH |
| Path | Text input | Tìm kiếm partial match path |
| Status Code | Select dropdown | 200, 201, 400, 401, 403, 404, 409, 500 |
| Từ ngày | Date input (type date) | Lọc từ ngày |
| Đến ngày | Date input (type date) | Lọc đến ngày |
| Tìm kiếm | Button "Tìm kiếm" | Trigger fetch với filters |

**Tab "Nhật ký thao tác":**
| Filter | Component | Mô tả |
|--------|-----------|-------|
| User | Select dropdown, searchable | Lấy danh sách user |
| Hành động | Select dropdown | LOGIN, LOGOUT, CREATE, UPDATE, DELETE, UPLOAD, IMPORT, TOGGLE, TRIGGER |
| Loại đối tượng | Select dropdown | auth, user, role, permission, driver_invoice, customer, supplier, vehicle, weight_adjustment, batch, dispatch_schedule, delivery_schedule, job |
| Từ ngày | Date input (type date) | Lọc từ ngày |
| Đến ngày | Date input (type date) | Lọc đến ngày |
| Tìm kiếm | Button "Tìm kiếm" | Trigger fetch với filters |

#### Actions

| Action | Trigger | Kết quả |
|--------|---------|---------|
| Chọn tab | Click vào tab | Chuyển đổi bảng + filter, fetch data mới |
| Thay đổi filter | Chọn/thay đổi filter value | Không tự fetch, cần bấm "Tìm kiếm" |
| Tìm kiếm | Click "Tìm kiếm" | Fetch data với filters hiện tại, reset về page 1 |
| Xóa bộ lọc | Click "Xóa bộ lọc" (trong empty search state) | Reset tất cả filter về default, fetch lại |
| Xem chi tiết audit | Click icon ChevronRight ở row audit | Expand/collapse row hiển thị JSON details |
| Chuyển trang | Click pagination | Fetch page tương ứng với filter hiện tại |
| Thử lại | Click "Thử lại" (trong error state) | Fetch lại lần cuối với filter hiện tại |

---

## 3. Component Checklist

### Danh sách components cần tạo / cập nhật

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| **AuditLogPage** | `frontend/src/pages/admin/AuditLogPage.tsx` | Mới | Route /logs |
| **AccessLogTable** | Trong AuditLogPage (inline) hoặc tách component | Mới | Tab "Nhật ký truy cập" |
| **AuditLogTable** | Trong AuditLogPage (inline) hoặc tách component | Mới | Tab "Nhật ký thao tác" |
| **LogFilters** | Trong AuditLogPage (inline) | Mới | Cả 2 tab |
| **MainLayout** | `frontend/src/layouts/MainLayout.tsx` | Cập nhật | Thêm menu item "Nhật ký hệ thống" |
| **Router** | `frontend/src/Router.tsx` | Cập nhật | Thêm route /logs |
| **vi.json** | `frontend/src/i18n/vi.json` | Cập nhật | Thêm i18n keys |
| **ProtectedRoute** | Đã có | Dùng lại | Bảo vệ route /logs |

### States bắt buộc mọi component data phải có

```
- [x] Loading state  — skeleton table (5 rows placeholder)
- [x] Empty state    — icon + message "Chưa có log nào"
- [x] Empty search   — icon + message "Không tìm thấy log nào" + nút "Xóa bộ lọc"
- [x] Error state    — icon + message "Không thể tải dữ liệu" + nút "Thử lại"
- [x] Success feedback — toast message sau mọi create/update/delete (không áp dụng cho log, log là read-only)
- [x] Confirm dialog — không áp dụng (log là read-only)
- [x] Disabled state — nút "Tìm kiếm" disabled khi đang loading
```

---

## 4. Validation UX

| Trường hợp | Hiển thị ở đâu | Khi nào show | Ví dụ message |
|------------|---------------|--------------|---------------|
| Date range không hợp lệ (from > to) | Inline dưới date inputs | Khi blur hoặc click "Tìm kiếm" | "Từ ngày phải <= Đến ngày" |
| API load fail | Full tab content (error state) | Khi query fail | "Không thể tải dữ liệu log" |
| Không có quyền (403) | Toast hoặc redirect | Khi truy cập /logs | "Bạn không có quyền truy cập" |
| Session hết hạn (401) | Redirect login | Khi nhận 401 | — |

---

## 5. i18n Keys cần thêm

```json
{
  "auditLog": {
    "title": "Nhật ký hệ thống",
    "tabs": {
      "access": "Nhật ký truy cập",
      "audit": "Nhật ký thao tác"
    },
    "filters": {
      "user": "Người dùng",
      "method": "Phương thức",
      "path": "Đường dẫn",
      "status": "Trạng thái",
      "action": "Hành động",
      "entityType": "Loại đối tượng",
      "dateFrom": "Từ ngày",
      "dateTo": "Đến ngày",
      "search": "Tìm kiếm",
      "clearFilters": "Xóa bộ lọc",
      "allUsers": "Tất cả người dùng",
      "allMethods": "Tất cả phương thức",
      "allStatuses": "Tất cả trạng thái",
      "allActions": "Tất cả hành động",
      "allEntities": "Tất cả loại"
    },
    "columns": {
      "time": "Thời gian",
      "user": "Người dùng",
      "method": "Method",
      "path": "Path",
      "status": "Status",
      "ip": "Địa chỉ IP",
      "responseTime": "T/g xử lý",
      "action": "Hành động",
      "entity": "Đối tượng",
      "entityLabel": "Mô tả",
      "details": "Chi tiết"
    },
    "empty": {
      "default": "Chưa có log nào",
      "noResults": "Không tìm thấy log nào"
    },
    "error": {
      "load": "Không thể tải dữ liệu log",
      "retry": "Thử lại"
    },
    "actions": {
      "LOGIN": "Đăng nhập",
      "LOGOUT": "Đăng xuất",
      "CREATE": "Tạo mới",
      "UPDATE": "Cập nhật",
      "DELETE": "Xóa",
      "UPLOAD": "Upload",
      "IMPORT": "Import",
      "TOGGLE": "Bật/Tắt",
      "TRIGGER": "Kích hoạt",
      "UPDATE_PERMISSIONS": "Cập nhật quyền"
    },
    "entities": {
      "auth": "Xác thực",
      "user": "Người dùng",
      "role": "Vai trò",
      "permission": "Quyền",
      "driver_invoice": "HĐ tài xế",
      "customer": "Khách hàng",
      "supplier": "Nhà cung cấp",
      "vehicle": "Phương tiện",
      "weight_adjustment": "Điều chỉnh TL",
      "batch": "Batch dữ liệu",
      "dispatch_schedule": "Điều phối",
      "delivery_schedule": "Lịch đi hàng",
      "job": "Job đối chiếu"
    },
    "statusBadges": {
      "success": "Thành công",
      "redirect": "Chuyển hướng",
      "clientError": "Lỗi client",
      "unauthorized": "Chưa xác thực",
      "forbidden": "Không có quyền",
      "notFound": "Không tìm thấy",
      "serverError": "Lỗi máy chủ"
    }
  }
}
```

---

## 6. Sidebar Integration

Menu item thêm vào `userSettingsSubItems` trong `MainLayout.tsx`:

```typescript
// Sau "Quản lý quyền", thêm:
hasPermission('logs.view') || user?.role === 'ADMIN'
  ? { to: '/logs', icon: FileText, label: 'Nhật ký hệ thống' }
  : null,
```

Icon: `FileText` từ `lucide-react` (biểu tượng tài liệu/văn bản = log).

Thứ tự trong sub-menu "Thiết lập người dùng":
1. Quản lý người dùng
2. Quản lý vai trò
3. Quản lý quyền
4. **Nhật ký hệ thống** ← mới

USER_SETTINGS_ROUTES cập nhật: `['/users', '/roles', '/permissions', '/logs']`
