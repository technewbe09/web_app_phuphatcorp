# Plan Manifest: Quản lý Đăng kiểm & Lịch sử Thay nhớt

**Ngày tạo:** 2026-06-21
**Workflow:** feature-dev-plan

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | docs/ba/20260621_vehicle-inspection-oil-change-analysis.md | Phân tích yêu cầu, flowchart, business rules (15 rules), data model (3 tables + 1 alter), API contract (14 endpoints), edge cases (11 cases) |
| 2 | UI Spec | docs/ui/20260621_vehicle-inspection-oil-change-ui-spec.md | User journey (2 happy paths + alt/error paths), screen inventory (5 screens/modals), component checklist (6 new + 3 updated), validation UX, i18n keys |
| 3 | Task List | docs/tasks/20260621_vehicle-inspection-oil-change-tasks.md | 10 BE tasks + 12 FE tasks, thứ tự thực hiện, lưu ý kỹ thuật |

---

## Tóm tắt

- **Feature:** Quản lý Đăng kiểm & Lịch sử Thay nhớt cho từng xe
- **Module:** Quản lý dữ liệu xe (Vehicle Data)
- **BA Analysis:** 2 nhóm user stories (11 stories), 15 business rules
- **UI Spec:** 2 trang + 3 modal/dialog, 6 components mới
- **Task List:** 10 BE tasks (1 migration chính, 1 permission seed, 2 services, 2 controllers, 2 routes), 12 FE tasks (2 API layers, 2 hooks, 2 pages, 3 modals, router/sidebar, i18n)

### New Permissions
- `vehicle_data.view` — Xem dữ liệu xe (đăng kiểm, thay nhớt)
- `vehicle_data.manage` — Quản lý dữ liệu xe (CRUD)

### New API Endpoints
- `/api/vehicle-inspections` — 8 endpoints (CRUD + expiring + images)
- `/api/vehicle-oil-changes` — 6 endpoints (CRUD + due)
- `/api/vehicles/:id/oil-interval` — 1 endpoint (update interval only)

### New Database Tables
- `inspection_records` — Đăng kiểm
- `inspection_images` — Ảnh đăng kiểm
- `oil_change_records` — Lịch sử thay nhớt
- `vehicles.oil_change_interval_km` — Thêm cột ngưỡng km

---

## Sử dụng

Để thực thi implementation, gọi workflow `feature-dev-exec` và trỏ vào file manifest này:

```
feature-dev-exec --manifest docs/manifest/20260621_vehicle-inspection-oil-change-plan.md
```
