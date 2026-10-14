# Task List: Phân quyền & Hiển thị thông tin xe trên Mobile

**Ngày:** 2026-10-14  
**BA Doc:** `docs/ba/20261014_vehicle-info-data-scope-mobile-analysis.md`  
**UI Spec:** `docs/ui/20261014_vehicle-info-data-scope-mobile-ui-spec.md`  

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|---|---|---|---|
| **BE-01** | Migration đăng ký Scope `vehicle_data` | Viết migration thêm `vehicle_data` vào `feature_scopes`, cấu hình mặc định `role_scope_configs` cho `ADMIN` (`all`) và `TAI_XE` (`entity`). | S |
| **BE-02** | Data Scope Resolver & Middleware cho Xe | Bổ sung helper trong `dataScopeService` lấy các `vehicle_ids` được gán cho user (qua `driver_vehicles` và `user_entity_scopes`). Cập nhật `resolveDataScope('vehicle_data')`. | M |
| **BE-03** | Áp dụng Data Scope vào Vehicle Services | Lọc `vehicle_id = ANY(allowedVehicleIds)` trong `inspectionService.getVehicleSummary`, `insuranceService.getVehicleSummary`, `oilChangeService.getDue`, `oilChangeService.listAll`. Chặn truy cập chéo khi xem detail. | M |
| **BE-04** | API Endpoint `GET /api/vehicles/my-assigned` | Tạo endpoint trả về danh sách xe được phân công cho user hiện tại kèm tóm tắt tổng hợp (hạn đăng kiểm, hạn bảo hiểm, ODO & tiến độ thay nhớt). | M |
| **BE-05** | Backend Unit & Integration Tests | Viết unit tests kiểm tra data scope cách ly dữ liệu giữa tài khoản tài xế và tài khoản admin. | S |

---

## 🎨 MOBILE / FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|---|---|---|---|
| **FE-01** | Models & API Endpoint | Thêm endpoint `myAssignedVehicles` vào `api_endpoints.dart`. Tạo model `MyVehicleSummary` (chứa thông tin xe, inspection summary, insurance summary, oil change progress). | S |
| **FE-02** | Service & Provider | Tạo `my_vehicle_service.dart` và `my_vehicle_provider.dart` quản lý state fetch thông tin xe được phân công. | S |
| **FE-03** | UI Widgets hiển thị tiến độ & trạng thái | Xây dựng widget `OilProgressIndicator` (thanh tiến độ ODO / định mức km) và `MyVehicleCard` hiển thị tóm tắt tình trạng 3 phân hệ. | S |
| **FE-04** | Màn hình "Xe của tôi" (`MyVehicleScreen`) | Màn hình trực quan chuyên biệt cho Tài xế: xem nhanh hạn bảo hiểm, hạn đăng kiểm, tiến độ nhớt, xem ảnh scan và lịch sử của xe mình phụ trách. | M |
| **FE-05** | Cập nhật Dashboard Hub & Phân quyền | Trên `DashboardHubTab`, nếu user có xe phụ trách thì hiển thị thẻ lối tắt "Xe của tôi". Ẩn các nút thêm/sửa/xóa nếu user không có quyền `vehicle_data.manage`. | S |
| **FE-06** | Mobile Tests & Verify | Viết widget/unit test cho `my_vehicle_provider` và `MyVehicleScreen`. Chạy `flutter analyze` & `flutter test`. | S |

---

## 📊 Thứ tự thực hiện

1. **Phase 3 — Backend Implementation:** BE-01 → BE-02 → BE-03 → BE-04
2. **Phase 4 — Database Migration:** Chạy migration đăng ký scope
3. **Phase 5-6 — Backend Tests:** BE-05 (Viết & chạy tests backend)
4. **Phase 7 — Mobile Implementation:** FE-01 → FE-02 → FE-03 → FE-04 → FE-05
5. **Phase 8 — Mobile Testing & QA:** FE-06 (Flutter analyze & test)
6. **Phase 9-10 — Update Documentation:** Cập nhật `know-how.md` & `system-features.md`

---

## ⚠️ Lưu ý kỹ thuật
- **Bảo mật dữ liệu (Data Isolation):** Tuyệt đối không chỉ lọc ở phía Frontend (Client-side), Backend bắt buộc phải reject yêu cầu hoặc lọc triệt để trong câu SQL query thông qua `req.dataScope`.
- **Quan hệ Driver - Vehicle:** Tài xế có thể được phân công 1 hoặc nhiều xe trong `driver_vehicles`. Màn hình mobile cần xử lý mượt mà cả 2 trường hợp (nếu 1 xe thì hiển thị thẳng chi tiết, nếu nhiều xe thì có thanh tab/chọn xe chuyển đổi).
- **Tương thích ngược:** Các tài khoản Admin/Accountant vẫn hoạt động bình thường với đầy đủ danh sách xe và các bộ lọc tìm kiếm hiện có.
