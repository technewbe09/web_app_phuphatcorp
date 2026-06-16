# BA Analysis: Tạo mới / Sửa hóa đơn tài xế & Đối chiếu ngược với accountant_invoices
**Ngày:** 2026-06-15
**Feature:** Driver Invoice Manual Create + Auto-Reconcile

---

## 1. User Stories

### US-01: Tạo mới hóa đơn tài xế thủ công
> **Là** kế toán viên, **tôi muốn** tạo mới một dòng dữ liệu hóa đơn tài xế mà không cần import nguyên file Excel **để** nhập nhanh những hóa đơn lẻ phát sinh.

### US-02: Tự động đối chiếu ngược khi tạo mới
> **Là** kế toán viên, **tôi muốn** khi tạo mới hóa đơn tài xế, hệ thống tự động kiểm tra xem số hóa đơn đó đã có trong `accountant_invoices` chưa, nếu có với trạng thái "không có" thì tự động cập nhật thành "đã có" **để** dữ liệu luôn đồng bộ.

### US-03: Tự động đối chiếu ngược khi sửa số hóa đơn
> **Là** kế toán viên, **tôi muốn** khi sửa số hóa đơn của một dòng driver_invoice, hệ thống kiểm tra lại tương tự như khi tạo mới **để** phản ánh đúng trạng thái đối chiếu.

---

## 2. Flowchart TO-BE

```mermaid
flowchart TD
  A[Người dùng bấm 'Tạo mới'] --> B[Mở modal nhập liệu]
  B --> C[Nhập: mã, tên TX, ngày, số xe, nơi giao, ghi chú, số HĐ]
  C --> D[Bấm Lưu]
  D --> E[BE: Validate dữ liệu]
  E --> F[BE: Chuẩn hóa số xe]
  F --> G[BE: Với mỗi số HĐ nhập vào]
  G --> H{Tìm trong accountant_invoices<br/>khớp: ngày + số xe + fuzzy số HĐ}
  H -->|Tìm thấy, trạng thái = 'không có'| I[UPDATE accountant_invoices<br/>trang_thai = 'đã có']
  H -->|Tìm thấy, trạng thái = 'đã có'| J[Không làm gì]
  H -->|Không tìm thấy| K[Không làm gì]
  I --> L[INSERT vào driver_invoices]
  J --> L
  K --> L
  L --> M[Trả kết quả: số lượng đã reconcile]

  N[Người dùng bấm Sửa] --> O[Sửa số HĐ trong modal edit]
  O --> P[Bấm Lưu]
  P --> Q[BE: Gọi lại logic đối chiếu ngược]
  Q --> G
```

---

## 3. Business Rules

| ID | Rule |
|----|------|
| BR-001 | Cho phép tạo mới 1 dòng driver_invoice thủ công qua API `POST /api/driver-invoices`. |
| BR-002 | Khi tạo mới: validate đầy đủ các trường bắt buộc: `ma`, `ten_tx`, `ngay`, `so_xe`, `noi_giao`, `so_hoa_don` (mảng). |
| BR-003 | `so_xe` được chuẩn hóa 3 bước: (1) bỏ prefix không phải số (`^[^0-9]*`), (2) bỏ gạch ngang/phẩy/khoảng trắng, (3) bỏ hậu tố `/.*`. VD: `PPH-50H 88294/L2` → `50H88294`. Trong SQL dùng `regexp_replace`, trong JS dùng `.replace()`. |
| BR-004 | Khi tạo mới/sửa: với mỗi số hóa đơn trong `so_hoa_don`, tìm trong `accountant_invoices` khớp 3 điều kiện: `ngay` bằng nhau + `so_xe` chuẩn hóa bằng nhau + fuzzy match số hóa đơn (BR-005). |
| BR-005 | Fuzzy match số HĐ: strip leading zeros cả 2 bên, kiểm tra 4 mức: (a) bằng chính xác, (b) A là prefix của B, (c) B là prefix của A, (d) A chứa B hoặc B chứa A (substring `LIKE '%...%'`). VD: "7979" match "00077979" vì "77979" chứa "7979". |
| BR-006 | Nếu tìm thấy dòng `accountant_invoices` có `trang_thai = 'không có'` → UPDATE thành `'đã có'`. |
| BR-007 | Nếu tìm thấy dòng `accountant_invoices` có `trang_thai = 'đã có'` → bỏ qua (không thay đổi). |
| BR-008 | Khi EDIT `so_hoa_don`: **reset toàn bộ** `accountant_invoices` của `so_xe` + `ngay` đó về `'không có'` → sau đó reconcile lại từ `so_hoa_don` mới. Điều này đảm bảo số HĐ bị xóa khỏi `so_hoa_don` sẽ revert về `'không có'`. |
| BR-009 | Reconcile và INSERT/UPDATE driver_invoices trong cùng 1 transaction. |
| BR-010 | Trả về `reconciled_count` trong response — số lượng dòng `accountant_invoices` đã được cập nhật. |
| BR-011 | Khi DELETE driver_invoice: với mỗi số HĐ của dòng bị xóa, tìm trong `accountant_invoices` (cùng fuzzy match), nếu `trang_thai = 'đã có'` → UPDATE về `'không có'`. Tất cả trong 1 transaction. |

---

## 4. Data Model

Không cần migration mới. Sử dụng lại các bảng hiện có:

- **`driver_invoices`**: đã có (migration 014)
- **`accountant_invoices`**: đã có (migration 016)

Không thêm column mới.

---

## 5. API Contract

### 5.1 Tạo mới hóa đơn tài xế (NEW)

```
POST /api/driver-invoices
Auth: JWT (accounting_data.manage)
Content-Type: application/json

Request:
{
  "ma": "TX001",
  "ten_tx": "Nguyễn Văn A",
  "ngay": "2026-05-14",
  "so_xe": "50H88294",
  "noi_giao": "Cần Thơ",
  "ghi_chu": "Hóa đơn bổ sung",
  "so_hoa_don": ["78097", "78098"]
}

Response 201:
{
  "success": true,
  "message": "Đã tạo hóa đơn tài xế, cập nhật 2 hóa đơn đối chiếu",
  "data": {
    "id": 123,
    "ma": "TX001",
    "ten_tx": "Nguyễn Văn A",
    "ngay": "2026-05-14",
    "so_xe": "50H88294",
    "noi_giao": "Cần Thơ",
    "ghi_chu": "Hóa đơn bổ sung",
    "so_hoa_don": ["78097", "78098"],
    "original_filename": null,
    "uploaded_by": 1,
    "uploaded_at": "2026-06-15T12:00:00.000Z",
    "reconciled_count": 2
  }
}
```

### 5.2 Cập nhật hóa đơn tài xế (MODIFIED — thêm reconcile)

```
PUT /api/driver-invoices/:id
Auth: JWT (accounting_data.manage)

Request: (giống hiện tại, không đổi)
{
  "ma": "...",
  "ten_tx": "...",
  "ngay": "...",
  "so_xe": "...",
  "noi_giao": "...",
  "ghi_chu": "...",
  "so_hoa_don": ["78097", "78099"]
}

Response 200:
{
  "success": true,
  "message": "Cập nhật hóa đơn thành công, cập nhật 1 hóa đơn đối chiếu",
  "data": {
    ... (giống DriverInvoice),
    "reconciled_count": 1
  }
}
```

### 5.3 Xóa hóa đơn tài xế (UPDATED — thêm reverse reconcile)

```
DELETE /api/driver-invoices/:id
Auth: JWT (accounting_data.manage)

Hành vi: Trước khi DELETE, với mỗi số HĐ của dòng bị xóa:
  - Tìm trong accountant_invoices (fuzzy match BR-005, cùng ngay + so_xe)
  - Nếu trang_thai = 'đã có' → UPDATE về 'không có'
  - Sau đó mới DELETE driver_invoices
  - Tất cả trong 1 transaction

Response 200 như hiện tại, không thay đổi API contract.
```

---

## 6. UI Screens

| # | Screen/Modal | Mô tả |
|---|-------------|-------|
| 1 | **Nút "Tạo mới"** trên `DriverInvoicesPage` | Thêm button "Tạo mới" bên cạnh nút "Upload Excel" |
| 2 | **Modal "Tạo hóa đơn tài xế"** | Form tạo mới giống hệt form edit, nhưng không có dữ liệu pre-fill |
| 3 | **Toast thông báo reconcile** | Sau khi tạo/sửa thành công, hiển thị số lượng hóa đơn đã được cập nhật trong `accountant_invoices` |

---

## 7. Edge Cases

| # | Case | Xử lý |
|---|------|-------|
| EC-01 | Số hóa đơn rỗng hoặc mảng trống | Validate lỗi: "Cần ít nhất 1 số hóa đơn" |
| EC-02 | Trùng lặp với driver_invoice đã có (cùng ma + ngay + so_xe + ghi_chu) | Trả lỗi 409 như logic upload hiện tại |
| EC-03 | accountant_invoices không có dòng nào khớp | Vẫn INSERT thành công, reconciled_count = 0 |
| EC-04 | Số hóa đơn trong driver_invoice có format khác (có chữ, ký tự đặc biệt) | Strip leading zeros, giữ nguyên phần còn lại để so sánh |
| EC-05 | Sửa driver_invoice, xóa một số HĐ khỏi `so_hoa_don` | BR-008: Reset toàn bộ về `'không có'` rồi reconcile lại → số HĐ bị xóa sẽ revert đúng. |

---

## 8. Performance

- Reconcile query: 1 UPDATE `accountant_invoices` dùng fuzzy match 4 mức + normalize so_xe.
- CREATE: 1 UPDATE reconcile + 1 INSERT driver_invoices = 2 queries.
- UPDATE: 1 UPDATE reset all + 1 UPDATE reconcile + 1 UPDATE driver_invoices = 3 queries.
- DELETE: 1 UPDATE reverse reconcile (per so_hd) + 1 DELETE driver_invoices.
