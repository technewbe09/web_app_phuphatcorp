# Task List: Import dữ liệu 5 nhà & Đối chiếu hóa đơn
**Ngày:** 2026-06-15
**BA Doc:** docs/ba/20260615_delivery-data-import-analysis.md
**UI Spec:** docs/ui/20260615_delivery-data-import-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration 016: `delivery_data` + `accountant_invoices` | Tạo 2 bảng mới theo data model BA doc (Section 4). Indexes: batch_id, ngay_hd, so_hd, so_tau_xe cho `delivery_data`; batch_id, ngay, so_hoa_don, trang_thai cho `accountant_invoices`. | M |
| BE-02 | Viết `deliveryDataService.ts` | 3 functions: `importFromExcel(buffer, filename, userId)` — parse file .xlsx (skip 4 dòng metadata, đọc 34 cột từ dòng thứ 5), **convert NGAY_HD từ Excel serial number → DATE bằng `XLSX.SSF.parse_date_code()`**, import data, extract invoices với single-transaction 2-query; `listBatches(filters)` — paginated list với stats (row count, invoice count, matched/unmatched); `deleteBatch(batchId)` — xóa cả 2 bảng trong transaction; `getBatchStats(batchId)` — trả thống kê 1 batch. | L |
| BE-03 | Viết `accountantInvoiceService.ts` | `list(filters)` — paginated list với filters (batch_id, ngay_from/to, so_xe, so_hoa_don, trang_thai). Dùng pattern có sẵn từ `driverInvoiceService.ts`. | M |
| BE-04 | Viết `deliveryDataController.ts` | 3 controller methods: `importFile` — nhận multipart file qua multer, gọi service, trả kết quả; `listBatches` — paginated; `deleteBatch` — delete. Validation: kiểm tra file tồn tại, định dạng .xlsx. | M |
| BE-05 | Viết `accountantInvoiceController.ts` | 1 method: `list` — paginated list với Zod schema validate query params. | S |
| BE-06 | Tạo routes: `deliveryData.ts` + `accountantInvoices.ts` | Register routes trong `backend/src/routes/index.ts`. Permission middleware: `accounting_data.view` cho GET, `accounting_data.manage` cho POST/DELETE. | S |

### Chi tiết kỹ thuật BE-02: Quy trình import (PERFORMANCE OPTIMIZED — chỉ 2 queries)

Sau khi parse Excel thành array of rows:

**Query 1:** INSERT delivery_data bằng UNNEST
```sql
INSERT INTO delivery_data (batch_id, channel, sub_channel, ..., thong_tin_bs, uploaded_by)
SELECT * FROM unnest(
  $1::varchar[], $2::text[], $3::text[], ..., $34::text[], $35::int[]
)
```
(Sử dụng pattern từ `driverInvoiceService.uploadMany`)

**Query 2:** INSERT accountant_invoices + đối chiếu trong 1 query duy nhất
```sql
WITH driver_invoice_numbers AS (
  SELECT DISTINCT elem AS so_hoa_don
  FROM driver_invoices
  CROSS JOIN jsonb_array_elements_text(so_hoa_don) AS elem
  WHERE ngay >= $min_date AND ngay <= $max_date
),
delivery_invoices AS (
  SELECT DISTINCT
    ngay_hd,
    regexp_replace(so_tau_xe, '[-,\s]', '', 'g') AS so_xe,
    so_hd
  FROM delivery_data
  WHERE batch_id = $batch_id
    AND so_hd IS NOT NULL
    AND so_hd != ''
)
INSERT INTO accountant_invoices (batch_id, ngay, so_xe, so_hoa_don, trang_thai)
SELECT
  $batch_id,
  di.ngay_hd,
  di.so_xe,
  di.so_hd,
  CASE WHEN din.so_hoa_don IS NOT NULL THEN 'đã có' ELSE 'không có' END
FROM delivery_invoices di
LEFT JOIN driver_invoice_numbers din ON di.so_hd = din.so_hoa_don
```

→ **Chỉ 2 query cho toàn bộ quy trình import + extract + match.**

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| FE-01 | Tạo API client `deliveryDataApi.ts` + `accountantInvoiceApi.ts` | Types: `DeliveryImportResult`, `BatchInfo`, `AccountantInvoice`, `AccountantInvoiceFilters`. Functions: `importDeliveryData(file)`, `getBatches(params)`, `deleteBatch(id)`, `getAccountantInvoices(params)`. | — | M |
| FE-02 | Tạo React Query hooks: `useDeliveryImport` + `useAccountantInvoices` | `useImportDeliveryData()` — mutation với onSuccess/onError toast. `useGetBatches(params)` — query paginated. `useDeleteBatch()` — mutation. `useGetAccountantInvoices(params)` — query với filters. Pattern: `useDriverInvoices.ts`. | — | M |
| FE-03 | Tạo page `DeliveryImportPage.tsx` | Route: `/accounting-data/delivery-import`. States: idle (dropzone), uploading (spinner), processing (state message), success (ImportResultCard), error (Alert). Tái sử dụng dropzone pattern từ `DriverInvoiceUploadModal`. | Screen 2.1 | L |
| FE-04 | Tạo component `ImportResultCard.tsx` | Card hiển thị: batch_id, total_rows, total_invoices, matched_count, unmatched_count, min/max date. Có link "Xem danh sách hóa đơn". | Screen 2.1 | S |
| FE-05 | Tạo component `BatchHistoryTable.tsx` | Table hiển thị lịch sử batch: uploaded_at, filename, total_rows, matched/unmatched, action (view/delete). Pagination. | Screen 2.1 | M |
| FE-06 | Tạo page `InvoiceMatchingPage.tsx` | Route: `/accounting-data/invoice-matching`. Filter row: batch_id select, ngay_from/to, so_xe input, so_hoa_don input, trang_thai select. Table columns: ngày, số xe, số hóa đơn, trạng thái (badge). Pagination. Nút Export Excel. Empty state với link "Import ngay". | Screen 2.2 | L |
| FE-07 | Tạo component `InvoiceStatusBadge.tsx` | Badge: 'đã có' → green + CheckCircle2, 'không có' → gray + XCircle. Props: `{ status: string }`. | Screen 2.2 | S |
| FE-08 | Cập nhật Router + Sidebar + i18n | `Router.tsx`: thêm 2 routes `/accounting-data/delivery-import`, `/accounting-data/invoice-matching`. `MainLayout.tsx`: thêm 2 sub-items trong nhóm "Accounting Data" sử dụng icon Upload, FileSearch. `vi.json`: thêm keys từ UI Spec Section 5. | — | M |

---

## 📊 Thứ tự thực hiện

```
Phase BE (có thể song song 1 phần):
  BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06

Phase FE (sau khi BE xong):
  FE-01 → FE-02 → FE-03 + FE-04 + FE-07 (song song)
  → FE-05 → FE-06 → FE-08
```

---

## ⚠️ Lưu ý kỹ thuật

1. **Chuẩn hóa `so_xe`** — `accountant_invoices.so_xe` phải được chuẩn hóa ngay khi insert (regexp_replace bỏ `-`, `,`, khoảng trắng) để khớp với `driver_invoices.so_xe` (đã được chuẩn hóa ở migration 015).
2. **Transaction** — BE-02 phải dùng transaction cho cả quy trình import để rollback nếu lỗi giữa chừng.
3. **Parse Excel ở Backend** — Dùng thư viện `xlsx` (đã có trong package.json). Logic parse giống `frontend/src/utils/processDeliveryData.ts`: đọc sheet đầu, skip 4 dòng header, mỗi dòng là array 34 cột theo thứ tự COL.
4. **File upload** — Dùng `multer` (đã có trong package.json) với `memoryStorage` để nhận buffer. Không lưu file ra disk.
5. **Không filter dòng** — BA rule BR-002: import toàn bộ, không loại trừ dòng nào như "thay thế"/"điều chỉnh". Cái này KHÁC với chức năng xử lý 5 nhà hiện tại (có filter).
6. **KHÔNG áp dụng weight adjustment** — Khác với chức năng "xử lý 5 nhà" (có bước kiểm tra `weight_adjustments`), tính năng import này không cần weight adjustment.
7. **Flat set đối chiếu từ driver_invoices** — `driver_invoices.so_hoa_don` là JSONB array. Dùng `jsonb_array_elements_text` + `CROSS JOIN` để unnest thành flat set, sau đó LEFT JOIN với `delivery_invoices`.
8. **Excel date parsing** — NGAY_HD trong file Excel là serial number (vd: `46146` = `2026-05-04`). Cần parse bằng `XLSX.SSF.parse_date_code()` hoặc công thức `new Date((serial - 25569) * 86400000)`. KHÔNG được lưu số serial vào cột DATE.
9. **File format** — Dòng 0-2 là metadata (tên công ty, địa chỉ, tiêu đề). Dòng 3 là header. Dòng 4+ là data. **KHÔNG được đọc dòng 3 làm data**. So với chức năng "5 nhà" hiện tại: cùng logic parse (skip 4 dòng, đọc từ dòng 5).
10. **Chỉ có 1 sheet** — File Excel có đúng 1 sheet (sheet đầu tiên), không cần xác định sheet name.
