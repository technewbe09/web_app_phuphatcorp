# Plan Manifest: Tạo mới / Sửa hóa đơn tài xế & Đối chiếu ngược với accountant_invoices
**Ngày tạo:** 2026-06-15
**Workflow:** feature-dev-plan

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | docs/ba/20260615_driver-invoice-manual-create-analysis.md | 3 user stories, 10 business rules, flowchart, API contract (1 new + 1 modified), 5 edge cases |
| 2 | UI Spec | docs/ui/20260615_driver-invoice-manual-create-ui-spec.md | 1 screen update, 1 new modal, 1 modal update, validation UX, i18n keys |
| 3 | Task List | docs/tasks/20260615_driver-invoice-manual-create-tasks.md | 5 BE tasks + 4 FE tasks = 9 tasks, reconcile SQL pattern, lưu ý kỹ thuật |

---

## Tóm tắt

- **Feature:** Cho phép tạo mới hóa đơn tài xế thủ công + tự động đối chiếu ngược với accountant_invoices
- **BA Analysis:** 3 user stories, 10 business rules
- **UI Spec:** Thêm nút "Tạo mới" trên DriverInvoicesPage, modal create mới, cập nhật modal edit
- **Task List:** 5 BE (service create + reconcile, update reconcile, validation, route) + 4 FE (hook, page update, create modal, edit modal update)

### Key design decisions
- Reconcile là 1 UPDATE query duy nhất cho tất cả số HĐ (dùng IN hoặc vòng lặp ít query)
- Logic fuzzy match dùng chung pattern với `deliveryDataService`
- Trạng thái chỉ đi 1 chiều: `không có → đã có`
- Không cần migration

---

## Sử dụng

Để thực thi implementation, gọi:

```
feature-dev-exec --manifest docs/manifest/20260615_driver-invoice-manual-create-plan.md
```
