# Task List: Tạo mới / Sửa hóa đơn tài xế & Đối chiếu ngược
**Ngày:** 2026-06-15
**BA Doc:** docs/ba/20260615_driver-invoice-manual-create-analysis.md
**UI Spec:** docs/ui/20260615_driver-invoice-manual-create-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Thêm `create` method vào `driverInvoiceService.ts` | Tạo function `create(data, userId)` — INSERT 1 dòng vào driver_invoices. Trước khi INSERT, gọi logic reconcile với accountant_invoices: với mỗi số HĐ, fuzzy match (ngay + so_xe_normalized + so_hoa_don_stripped prefix match), UPDATE `trang_thai = 'đã có'` nếu đang là `'không có'`. Trả về `DriverInvoice` + `reconciled_count`. Wrap trong transaction. | M |
| BE-02 | Thêm logic reconcile vào `update` method hiện tại | Sau khi UPDATE driver_invoices, gọi cùng logic reconcile như BE-01 với danh sách `so_hoa_don` mới. Trả về thêm field `reconciled_count`. | S |
| BE-03 | Thêm `createSchema` validation vào controller | Validation chain: `ma` (required, max 50), `ten_tx` (required, max 255), `ngay` (required), `so_xe` (required, max 50), `noi_giao` (required, max 255), `ghi_chu` (optional), `so_hoa_don` (isArray, min 1). | S |
| BE-04 | Thêm route `POST /` vào `driverInvoices.ts` | `router.post('/', requirePermission('accounting_data.manage'), ...validate(createSchema), controller.create)` | S |
| BE-05 | Cập nhật response của `update` controller | Thêm `reconciled_count` vào response message và data. | S |

### Chi tiết kỹ thuật BE-01: Logic reconcile

```sql
-- Chuẩn hóa so_xe giống trong deliveryDataService
WITH normalized AS (
  SELECT regexp_replace(
    regexp_replace($so_xe, '^[^\d]*', ''),
    '[-,\s]', '', 'g'
  ) AS so_xe_norm
)
-- Với mỗi số HĐ, UPDATE accountant_invoices
UPDATE accountant_invoices
SET trang_thai = 'đã có'
WHERE ngay = $ngay::date
  AND so_xe = (SELECT so_xe_norm FROM normalized)
  AND trang_thai = 'không có'
  AND (
    -- exact match after stripping leading zeros
    regexp_replace(so_hoa_don, '^0+', '') = regexp_replace($so_hoa_don_item, '^0+', '')
    -- OR prefix match
    OR regexp_replace(so_hoa_don, '^0+', '') LIKE regexp_replace($so_hoa_don_item, '^0+', '') || '%'
    OR regexp_replace($so_hoa_don_item, '^0+', '') LIKE regexp_replace(so_hoa_don, '^0+', '') || '%'
  )
```

Gọi UPDATE này trong vòng lặp cho từng `so_hoa_don_item`, đếm số dòng được UPDATE → `reconciled_count`.

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| FE-01 | Thêm `useCreateDriverInvoice` hook | Mutation hook gọi `POST /api/driver-invoices`. Invalidate query key `driver-invoices` sau khi thành công. | — | S |
| FE-02 | Cập nhật `DriverInvoicesPage` — thêm nút "Tạo mới" | Thêm state `createModalOpen`, render nút "Tạo mới" cạnh "Upload Excel", render `DriverInvoiceCreateModal`. | Screen 2.1 | S |
| FE-03 | Tạo `DriverInvoiceCreateModal.tsx` | Copy từ `DriverInvoiceEditModal.tsx`, đổi: tiêu đề "Tạo hóa đơn tài xế", dùng `useCreateDriverInvoice` thay vì `useUpdateDriverInvoice`, form rỗng ban đầu. | Screen 2.2 | M |
| FE-04 | Cập nhật `DriverInvoiceEditModal.tsx` — hiển thị reconcile count | Trong `onSuccess`, hiển thị `reconciled_count` trong toast message. | Screen 2.3 | S |

---

## 📊 Thứ tự thực hiện

```
BE-01 → BE-02 → BE-03 → BE-04 → BE-05
FE-01 → FE-02 → FE-03 → FE-04
```

---

## ⚠️ Lưu ý kỹ thuật

1. **Dùng chung hàm normalize** — tạo helper function `normalizeSoXe()` trong service để cả `create` và logic reconcile dùng chung, tránh duplicate.
2. **Transaction** — reconcile + INSERT/UPDATE driver_invoices phải trong cùng 1 transaction để rollback nếu lỗi.
3. **Fuzzy match pattern** — dùng đúng pattern từ `deliveryDataService` (BR-004, BR-005). Không viết logic mới khác.
4. **Không rollback trạng thái** — reconcile chỉ đi 1 chiều: `không có → đã có`. Không bao giờ `đã có → không có`.
5. **API response type** — `DriverInvoice` type hiện tại không có `reconciled_count`. Thêm field optional vào interface.
