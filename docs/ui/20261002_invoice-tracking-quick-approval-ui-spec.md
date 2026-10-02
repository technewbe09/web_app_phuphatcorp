# UI Spec: Tab Phê duyệt nhanh cho Theo dõi hóa đơn

**Ngày:** 2026-10-02  
**BA Doc:** `docs/ba/20261002_invoice-tracking-quick-approval-analysis.md`  
**Role liên quan:** `invoice_tracking.view`, `invoice_tracking.manage`

---

## 1. User Journey

### Luồng 1: Phê duyệt hàng loạt nhiều ticket
```
Người dùng vào trang "/invoice-tracking"
  → Bấm chọn Tab "Phê duyệt nhanh (12)"
  → Người dùng tick chọn 3 hoặc bấm checkbox "Chọn tất cả" trên thanh header
  → Xuất hiện thanh công cụ nổi (Selection Action Bar): "Đã chọn 3 ticket"
  → Người dùng bấm nút "Phê duyệt hoàn thành (3)"
  → Hộp thoại xác nhận xuất hiện: "Bạn có chắc muốn phê duyệt hoàn thành cho 3 chuyến xe đã chọn?"
  → Bấm "Xác nhận"
  → Toast thông báo: "Đã phê duyệt hoàn thành 3 chuyến xe thành công!"
  → Danh sách tự động refresh, 3 ticket hoàn thành biến mất khỏi tab Chờ duyệt
```

### Luồng 2: Duyệt nhanh hoặc Yêu cầu bổ sung 1 ticket
```
Tại dòng ticket trong tab Phê duyệt nhanh:
  → Xem ảnh thu nhỏ (click để phóng to Lightbox)
  → Nếu hợp lệ: Bấm nút "Duyệt" (Icon Check) ➔ Xác nhận nhanh ➔ Hoàn thành
  → Nếu thiếu chứng từ: Bấm nút "Yêu cầu bổ sung" (Icon AlertTriangle) ➔ Mở modal nhập lý do ➔ Gửi yêu cầu
```

---

## 2. Screen Layout — Tab Phê duyệt nhanh

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Theo dõi hóa đơn]                                                               │
│ [ Danh sách ticket ]  [ ⚡ Phê duyệt nhanh (12) (Active) ]  [ 📊 Thống kê ]     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Filter Toolbar ─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 [Tìm biển số, tài xế, điểm nhận, ghi chú...]       📅 [Từ ngày] [Đến ngày] │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Selection Bar (Xuất hiện khi có checkbox được chọn) ────────────────────────┐ │
│ │ ☑️ Đã chọn 3 / 12 chuyến xe      [✓ Phê duyệt hoàn thành (3)]  [✕ Bỏ chọn]  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Bảng danh sách Chờ duyệt ───────────────────────────────────────────────────┐ │
│ │ [☑] | STT | Ngày | Biển số | Tài xế | Điểm nhận | Chứng từ | Ghi chú | T.Tác│ │
│ │ ───┼─────┼──────┼────────┼───────┼───────────┼──────────┼────────┼───── │ │
│ │ [☑] |  1  |14/09 |51C12345|Tài xếA| Kho CLF   | [📷][📷]  | Giao...| [✓][⚠️]│ │
│ │ [☑] |  2  |14/09 |51D99988|Tài xếB| Kho MCC   | [📷][📄]  | —      | [✓][⚠️]│ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Checklist & State Matrix

| Component | File Path | Loại | Nhiệm vụ |
|---|---|---|---|
| `InvoiceTrackingQuickApprovalTab` | `frontend/src/components/invoice-tracking/InvoiceTrackingQuickApprovalTab.tsx` | Mới | Giao diện tab phê duyệt nhanh: checkbox chọn hàng loạt, bộ lọc, bảng dữ liệu, batch action bar |
| `BatchApproveConfirmDialog` | `frontend/src/components/invoice-tracking/BatchApproveConfirmDialog.tsx` | Mới | Hộp thoại xác nhận trước khi duyệt đồng loạt nhiều ticket |
| `InvoiceTrackingPage` | `frontend/src/pages/invoice-tracking/InvoiceTrackingPage.tsx` | Cập nhật | Bổ sung Tab `Phê duyệt nhanh` kèm badge đếm số lượng |
| `invoiceTrackingApi` & `useInvoiceTracking` | `frontend/src/api/invoiceTrackingApi.ts`, `hooks/useInvoiceTracking.ts` | Cập nhật | Bổ sung API & Hook `batchFinish` |

---

## 4. i18n Translation Keys
```json
{
  "invoice_tracking": {
    "tabs": {
      "list": "Danh sách ticket",
      "quickApproval": "Phê duyệt nhanh",
      "statistics": "Thống kê"
    },
    "quickApproval": {
      "title": "Phê duyệt nhanh chứng từ",
      "subtitle": "Danh sách các chuyến xe đang chờ duyệt chứng từ",
      "selectedCount": "Đã chọn {{count}} chuyến xe",
      "batchApprove": "Phê duyệt hoàn thành ({{count}})",
      "clearSelection": "Bỏ chọn",
      "empty": "Hiện không có chuyến xe nào đang chờ duyệt.",
      "approveSingle": "Duyệt",
      "requestSupplementSingle": "Y/C bổ sung",
      "confirmBatchTitle": "Xác nhận phê duyệt hàng loạt",
      "confirmBatchMessage": "Bạn có chắc chắn muốn phê duyệt \"Hoàn thành\" cho {{count}} chuyến xe đã chọn không?",
      "confirmBatchWarning": "Các chuyến xe này sẽ được xác nhận đủ chứng từ và chuyển sang trạng thái Hoàn thành.",
      "successBatchMessage": "Đã phê duyệt hoàn thành thành công {{count}} chuyến xe!",
      "selectAll": "Chọn tất cả",
      "dateFrom": "Từ ngày",
      "dateTo": "Đến ngày",
      "searchPlaceholder": "Tìm theo biển số, tài xế, điểm nhận, ghi chú..."
    }
  }
}
```
