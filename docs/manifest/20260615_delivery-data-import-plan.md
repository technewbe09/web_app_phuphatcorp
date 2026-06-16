# Plan Manifest: Import dữ liệu 5 nhà & Đối chiếu hóa đơn
**Ngày tạo:** 2026-06-15
**Workflow:** feature-dev-plan

---

## Documents

| # | Loại | Đường dẫn | Mô tả |
|---|------|-----------|-------|
| 1 | BA Analysis | docs/ba/20260615_delivery-data-import-analysis.md | 4 user stories, 10 business rules, flowchart, data model (2 bảng mới), 4 API endpoints, 10 edge cases, performance analysis |
| 2 | UI Spec | docs/ui/20260615_delivery-data-import-ui-spec.md | 2 screens, 5 components mới, user journey (happy/alt/error), validation UX, i18n keys, sidebar update |
| 3 | Task List | docs/tasks/20260615_delivery-data-import-tasks.md | 6 BE tasks + 8 FE tasks = 14 tasks, performance-optimized 2-query import, lưu ý kỹ thuật |

---

## Tóm tắt

- **Feature:** Import dữ liệu "5 nhà" vào database & Đối chiếu hóa đơn với driver_invoices
- **BA Analysis:** 4 user stories (import, bóc tách hóa đơn, đối chiếu, xem kết quả), 10 business rules
- **UI Spec:** 2 màn hình (DeliveryImportPage, InvoiceMatchingPage), 5 components mới (ImportResultCard, BatchHistoryTable, InvoiceStatusBadge, 2 pages)
- **Task List:** 6 BE tasks (migration, 2 services, 2 controllers, 2 routes), 8 FE tasks (2 API clients, 2 hooks, 2 pages, 3 components, routing + i18n)

### Performance highlight
- **Chỉ 2 database queries** cho toàn bộ pipeline: INSERT delivery_data bằng UNNEST → INSERT accountant_invoices kèm đối chiếu LEFT JOIN với driver_invoices trong 1 query duy nhất.
- Không dùng EXISTS subquery per row, không có N+1 problem.

### Khác biệt so với "Xử lý data 5 nhà" hiện tại
| Tiêu chí | 5 nhà (hiện tại) | Import mới |
|----------|-----------------|------------|
| Xử lý | Browser-side only | Backend + Database |
| Filter rows | Có (loại "thay thế"/"điều chỉnh") | Không filter, import toàn bộ |
| Weight adjustment | Có | Không |
| Output | Download file Excel | Lưu vào DB + đối chiếu |
| Đối chiếu | Không có | Tự động với driver_invoices |

---

## Sử dụng

Để thực thi implementation, gọi workflow `feature-dev-exec` và trỏ vào file manifest này:

```
feature-dev-exec --manifest docs/manifest/20260615_delivery-data-import-plan.md
```
