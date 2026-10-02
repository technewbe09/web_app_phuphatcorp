# Task List: Tab Phê duyệt nhanh cho Theo dõi hóa đơn (Quick Approval Tab)

**Ngày:** 2026-10-02  
**BA Doc:** `docs/ba/20261002_invoice-tracking-quick-approval-analysis.md`  
**UI Spec:** `docs/ui/20261002_invoice-tracking-quick-approval-ui-spec.md`  

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|---|---|---|---|
| BE-01 | Viết Service Method `batchFinish` | File: `backend/src/services/invoiceTrackingService.ts`<br>- Nhận `ticketIds: number[]`, `dispatcherId: number`, `currentUser`, `scope`<br>- Kiểm tra quyền workflow `review_finish` & dataScope<br>- Update `invoice_status = 'completed'`, `completed_at = NOW()`, `dispatcher_id = dispatcherId`<br>- Ghi audit log `REVIEW_FINISH` cho từng ticket | M |
| BE-02 | Validation Schema `invoiceTrackingBatchReviewSchema` | File: `backend/src/controllers/invoiceTrackingController.ts`<br>- Validate `body('ticket_ids').isArray({ min: 1, max: 100 })`, `body('ticket_ids.*').isInt({ min: 1 })` | S |
| BE-03 | Tạo API Controller Handler & Route Endpoint | File: `backend/src/controllers/invoiceTrackingController.ts` & `backend/src/routes/invoiceTracking.ts`<br>- `POST /api/invoice-tracking/batch-finish`<br>- Middleware: `authenticateToken` -> `resolveDataScope('invoice_tracking')` -> `requirePermission('invoice_tracking.manage')` | S |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|---|---|---|---|
| FE-01 | API Client & React Query Hook `useBatchFinishTickets` | File: `frontend/src/api/invoiceTrackingApi.ts` & `frontend/src/hooks/useInvoiceTracking.ts`<br>- Thêm `invoiceTrackingApi.batchFinish({ ticket_ids: number[] })`<br>- Thêm mutation hook `useBatchFinishTickets` kèm auto-invalidation | S |
| FE-02 | i18n Translation Keys | File: `frontend/src/i18n/vi.json` & `en.json`<br>- Bổ sung keys cho Tab Phê duyệt nhanh, Selection bar, Dialogs, Toasts | S |
| FE-03 | Tạo Component `BatchApproveConfirmDialog` | File: `frontend/src/components/invoice-tracking/BatchApproveConfirmDialog.tsx`<br>- Modal xác nhận phê duyệt hàng loạt X chuyến xe đã chọn | S |
| FE-04 | Tạo Component `InvoiceTrackingQuickApprovalTab` | File: `frontend/src/components/invoice-tracking/InvoiceTrackingQuickApprovalTab.tsx`<br>- Filter bar: Tìm kiếm, Khoảng ngày<br>- Checkbox Chọn tất cả / Từng dòng<br>- Floating / Top Selection Bar hiển thị số lượng chọn & nút Phê duyệt hàng loạt<br>- Bảng danh sách ticket Chờ duyệt kèm thumbnail ảnh xem nhanh, nút Duyệt 1-click & nút Yêu cầu bổ sung | L |
| FE-05 | Tích hợp Tab Switcher & Badge đếm vào `InvoiceTrackingPage` | File: `frontend/src/pages/invoice-tracking/InvoiceTrackingPage.tsx`<br>- Bổ sung Tab `Phê duyệt nhanh` có badge đếm số lượng ticket `pending_review` (lấy từ API thống kê hoặc query) | M |

## 📊 Thứ tự thực hiện

- Phase 3: BE-01 → BE-02 → BE-03
- Phase 4: Verification backend (`npm run build`, `npm run test`)
- Phase 7: FE-01 → FE-02 → FE-03 → FE-04 → FE-05
- Phase 8: Verification frontend (`npm run build`)
- Phase 9-10: Cập nhật docs

## ⚠️ Lưu ý kỹ thuật
- Tự động xóa danh sách tick chọn (`selectedIds`) sau khi phê duyệt thành công.
- Tái sử dụng `SupplementNoteDialog`, `TicketDetailModal`, `DocumentViewerModal` để đảm bảo code DRY và trải nghiệm thống nhất.
- Hỗ trợ responsive tốt trên mobile: Card view có checkbox chọn và thanh duyệt dưới đáy màn hình.
