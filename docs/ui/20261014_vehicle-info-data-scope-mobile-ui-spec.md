# UI Spec: Hiển thị thông tin xe theo phân quyền người dùng trên Mobile

**Ngày:** 2026-10-14
**BA Doc:** docs/ba/20261014_vehicle-info-data-scope-mobile-analysis.md
**Role liên quan:** Tài xế (`TAI_XE`), Điều hành xe, Quản trị viên (`ADMIN`)

---

## 1. User Journey

### 1.1 Luồng Tài xế (Chỉ gắn với 1 hoặc vài xe được phân công)
```
[Đăng nhập vào Mobile App]
  → Dashboard Hub hiển thị thẻ "Xe của tôi" (hoặc các mục Đăng kiểm, Bảo hiểm, Thay nhớt)
  → Vào màn hình chi tiết xe phụ trách (My Vehicle Dashboard)
  → Thấy card tổng quan xe: Biển số, Loại xe, Tài xế phụ trách
  → 3 Thẻ trạng thái trực quan:
      1. Đăng kiểm (Hạn sử dụng, badge trạng thái, nút "Xem ảnh sổ ĐK", "Lịch sử ĐK")
      2. Bảo hiểm (Hạn hợp đồng, badge trạng thái, nút "Xem ảnh hợp đồng", "Lịch sử BH")
      3. Thay nhớt (Thanh tiến độ ODO / định mức km, số km còn lại, nút "Lịch sử thay nhớt")
  → User click vào xem ảnh → Mở Image Viewer phóng to, xem chi tiết
  → User click vào "Lịch sử thay nhớt" → Mở màn hình danh sách các lần thay nhớt của đúng xe đó
  → Tuyệt đối không có dropdown hay danh sách các xe khác
```

### 1.2 Luồng Quản trị viên / Điều hành (Xem tất cả xe)
```
[Đăng nhập vào Mobile App]
  → Dashboard Hub hiển thị phân hệ "DỮ LIỆU & BẢO TRÌ XE" đầy đủ
  → Nhấn vào Đăng kiểm / Bảo hiểm / Thay nhớt
  → Màn hình danh sách tổng hợp tất cả các xe kèm thanh Search, Bộ lọc trạng thái
  → Có nút tạo mới / cập nhật (dành cho người có quyền manage)
```

---

## 2. Screen Inventory

### Screen 1: Màn hình "Xe của tôi" / Chi tiết xe được phân công (`MyVehicleScreen`)
- **Đường dẫn/Route:** Mở từ Dashboard Hub khi user là tài xế hoặc được gán xe
- **Role:** `TAI_XE` hoặc bất kỳ user nào có quyền xem dữ liệu xe được phân công
- **Layout:**
```
┌──────────────────────────────────────────────┐
│ [←] Xe phụ trách: 50H-55116                  │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ Biển số: 50H-55116         [Xe nhà]      │ │
│ │ Tài xế: S Phi                            │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 📋 ĐĂNG KIỂM XE           [Còn 37 ngày]  │ │
│ │ Hạn đăng kiểm: 20/11/2026                │ │
│ │ Trạng thái: Còn hạn (Hợp lệ)             │ │
│ │ [Xem ảnh giấy tờ (2)]   [Xem lịch sử]   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 🛡️ BẢO HIỂM XE           [Còn 62 ngày]  │ │
│ │ Hạn bảo hiểm: 15/12/2026                 │ │
│ │ Trạng thái: Còn hạn                      │ │
│ │ [Xem ảnh bảo hiểm (1)]  [Xem lịch sử]   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 🛢️ THAY NHỚT ĐỘNG CƠ                     │ │
│ │ ODO hiện tại: 128,200 km                 │ │
│ │ Lần thay gần nhất: 125,000 km (10/09)   │ │
│ │ [████████████░░░░] Đã đi 3,200 / 5,000km │ │
│ │ 👉 Còn 1,800 km nữa cần thay nhớt         │ │
│ │ [Xem lịch sử thay nhớt]                  │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

#### States:
| State | Trigger | UI hiển thị |
|---|---|---|
| Loading | Đang tải dữ liệu xe từ backend | Skeleton card mờ, spinner nhẹ |
| Populated | Tải thành công thông tin xe | Hiển thị 3 card chi tiết rõ ràng |
| Empty | User chưa được gán xe nào | Banner thông báo "Tài khoản của bạn chưa được gán xe phụ trách. Vui lòng liên hệ quản trị viên." |
| Error | Lỗi mạng / 500 | Card thông báo lỗi + nút "Thử lại" |

### Screen 2: Cập nhật các màn hình hiện có (`InspectionListScreen`, `InsuranceListScreen`, `OilChangeScreen`)
- Với tài khoản quản lý (xem tất cả xe): Giữ nguyên giao diện danh sách tìm kiếm và lọc.
- Với tài khoản tài xế (chỉ có xe được phân công):
  - Tự động lọc chỉ hiển thị các xe được phân công.
  - Ẩn các nút hành động Quản trị / Sửa / Xóa nếu không có quyền `vehicle_data.manage`.

---

## 3. Component Checklist

| Component | Vị trí file | Loại | Mục đích |
|---|---|---|---|
| `MyVehicleCard` | `lib/widgets/my_vehicle_card.dart` | Mới | Thẻ hiển thị tóm tắt tình trạng 3 phân hệ (Đăng kiểm, Bảo hiểm, Nhớt) |
| `OilProgressIndicator` | `lib/widgets/oil_progress_indicator.dart` | Mới | Thanh hiển thị % số km đã chạy so với hạn mức km thay nhớt |
| `MyVehicleScreen` | `lib/screens/vehicle/my_vehicle_screen.dart` | Mới | Màn hình dành riêng cho tài xế xem thông tin xe mình lái |

---

## 4. Validation & Bảo mật UI
- Chặn điều hướng đến các màn hình chỉnh sửa/tạo mới nếu user không có quyền `vehicle_data.manage`.
- Khi user thuộc vai trò tài xế chọn xem lịch sử đăng kiểm/bảo hiểm/thay nhớt, chỉ cho phép mở màn hình lịch sử truyền `vehicle_id` hợp lệ trong danh sách phân công.
