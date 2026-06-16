# Plan Manifest: Ghi nhận hóa đơn từ tài xế

**Ngày tạo:** 2026-06-15
**Workflow:** feature-dev-plan
**Feature:** Ghi nhận hóa đơn từ tài xế (Driver Invoice Recording)

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | docs/ba/20260615_driver-invoices-analysis.md | Phân tích yêu cầu: flowchart, business rules (13 rules), data model (`driver_invoices`), API contract (4 endpoints), 5 user stories, 11 edge cases |
| 2 | UI Spec | docs/ui/20260615_driver-invoices-ui-spec.md | User journey (happy/alt/error paths), 3 screen inventory (DriverInvoicesPage, DriverInvoiceUploadModal, DuplicateConfirmDialog), component checklist, validation UX, 40+ i18n keys |
| 3 | Task List | docs/tasks/20260615_driver-invoices-tasks.md | 5 BE tasks + 8 FE tasks, thứ tự thực hiện, 10 lưu ý kỹ thuật |

---

## Tóm tắt

- **Feature:** Ghi nhận hóa đơn từ tài xế
- **BA Analysis:** 5 user stories, 13 business rules, 4 API endpoints, 1 DB table
- **UI Spec:** 3 màn hình (1 page + 1 modal + 1 dialog), 4 components, 8 states checked
- **Task List:** 5 BE tasks, 8 FE tasks
- **Effort ước tính:** BE ~2-3h, FE ~4-6h, Tổng ~1-1.5 ngày
- **Permission:** Dùng lại `accounting_data.view` / `accounting_data.manage` (không tạo mới)
- **Route:** `/accounting-data/driver-invoices`
- **Sidebar:** Quản lý dữ liệu kế toán → Hóa đơn tài xế

---

## Sử dụng

Để thực thi implementation, truyền file manifest này:

```
Thực thi feature Ghi nhận hóa đơn từ tài xế theo plan docs/manifest/20260615_driver-invoices-plan.md
```
