# Plan Manifest: Danh mục nhà cung cấp

**Ngày tạo:** 2026-06-17
**Feature:** Danh mục nhà cung cấp (parent: Quản lý danh mục)

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | docs/ba/20260617_supplier-catalog-analysis.md | Phân tích yêu cầu, flowchart (5 paths), business rules (9 BR), data model, API contract (5 endpoints), edge cases |
| 2 | UI Spec | docs/ui/20260617_supplier-catalog-ui-spec.md | User journey (happy/alt/error paths), screen inventory (1 page + 3 modals), component checklist, validation UX, file list |
| 3 | Task List | docs/tasks/20260617_supplier-catalog-tasks.md | Backend tasks (5) + Frontend tasks (9), thứ tự thực hiện, lưu ý kỹ thuật, bug fix record |

---

## Tóm tắt

- **Feature:** Danh mục nhà cung cấp (parent: Quản lý danh mục — sidebar group)
- **Data fields:** supplier_code (Mã NCC), name (Tên nhà máy), notes (Ghi chú)
- **CRUD:** Full — Create, Edit, Delete (soft), Upload Excel batch
- **BA Analysis:** 5 API endpoints, 9 business rules
- **UI Spec:** 1 màn hình chính (SupplierCatalogPage), 3 modals (Form, Delete, Upload)
- **Task List:** 5 BE tasks, 9 FE tasks — đã implement hoàn chỉnh

---

## Sử dụng

Feature đã được implement đầy đủ:
- Backend: Migration 018, service, controller, route `/api/suppliers`
- Frontend: Page `/catalog/suppliers`, 3 modal components, API module, hooks, i18n
- Sidebar: Menu item "Danh mục NCC" dưới nhóm "Quản lý danh mục"
