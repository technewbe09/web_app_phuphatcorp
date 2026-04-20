# Task List: Delivery Schedule Statistics
**Ngày:** 2026-04-19
**BA Doc:** docs/ba/20260419_delivery-schedule-statistics-analysis.md
**UI Spec:** docs/ui/20260419_delivery-schedule-statistics-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Thêm service method getStatistics | `deliveryScheduleService.getStatistics(fromDate, toDate)` → SQL aggregate queries | S |
| BE-02 | Thêm controller + validation | `deliveryScheduleController.getStatistics`, validate `fromDate`/`toDate` query params | S |
| BE-03 | Thêm route | `GET /api/delivery-schedules/statistics` với `requirePermission('transport.view')` | S |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | API function + React Query hook | `deliveryScheduleApi.getStatistics()`, hook `useDeliveryStatistics(fromDate, toDate)` | Section 3 | S |
| FE-02 | QuickFilterButtons component | 4 buttons: Tuần/Tháng/Quý/Năm, active state, dayjs date calc | Section 3.1 | S |
| FE-03 | DeliveryStatisticsSummary component | 2 metric cards: totalDays + totalTrips, skeleton loading | Section 3.2 | S |
| FE-04 | DeliveryStatisticsChart component | recharts BarChart, responsive, loading/empty/error states | Section 3.3 | M |
| FE-05 | DeliveryDailyBreakdownTable component | Table: ngày + số chuyến + [Xem] button, skeleton | Section 3.4 | S |
| FE-06 | Update DeliveryScheduleFilters | Tích hợp QuickFilterButtons, active state tracking | Section 3.5 | S |
| FE-07 | Update DeliverySchedulePage | Tích hợp statistics section, onViewDay scroll handler, useDeliveryStatistics hook | Section 3.6 | S |
| FE-08 | i18n keys | Thêm deliverySchedule.statistics.* và deliverySchedule.quickFilter.* vào vi.json + en.json | Section 5 | S |

## 📊 Thứ tự thực hiện

Phase 3: BE-01 → BE-02 → BE-03
Phase 7: FE-08 → FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07

## ⚠️ Lưu ý kỹ thuật

- Route `/statistics` phải đặt TRƯỚC route `/:id` nếu có, để tránh conflict (hiện tại deliverySchedule.ts không có `/:id` nên không cần lo)
- recharts đã có trong `package.json` (xác nhận trước khi dùng)
- dayjs đã dùng trong codebase (startOf, endOf, format)
- `i18n keys` dùng `useI18n` hook như các pages khác, nhưng hiện tại DeliverySchedulePage dùng hardcode text → sẽ giữ nguyên pattern hardcode Vietnamese (consistent với codebase hiện tại)
