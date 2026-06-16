# Task List: Ghi nhận hóa đơn từ tài xế

**Ngày:** 2026-06-15
**BA Doc:** docs/ba/20260615_driver-invoices-analysis.md
**UI Spec:** docs/ui/20260615_driver-invoices-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration `014_create_driver_invoices` | Tạo bảng `driver_invoices` với columns: `id SERIAL PK`, `ma VARCHAR(50) NOT NULL`, `ten_tx VARCHAR(255) NOT NULL`, `ngay DATE NOT NULL`, `so_xe VARCHAR(50) NOT NULL`, `noi_giao VARCHAR(255) NOT NULL`, `so_hoa_don_goc TEXT`, `so_hoa_don JSONB DEFAULT '[]'::jsonb`, `original_filename VARCHAR(255)`, `uploaded_by INTEGER REFERENCES users(id)`, `uploaded_at TIMESTAMPTZ DEFAULT NOW()`. UNIQUE INDEX trên `(ma, ngay, so_xe, so_hoa_don_goc)`. 5 secondary indexes: `ngay`, `so_xe`, `ma`, `uploaded_by`, `so_hoa_don_goc`. File: `backend/src/migrations/014_create_driver_invoices.sql` | S |
| BE-02 | Viết service `driverInvoiceService.ts` | Methods:
- `list(filters)` — query với optional filters (`ma`, `ten_tx`, `ngay_from`, `ngay_to`, `so_xe`, `so_hoa_don`). Pagination mặc định: page=1, limit=20. Trả `{ data, pagination: { page, limit, total, totalPages } }`. Order: `ngay DESC, ma ASC`.
- `findById(id)` — single record by id, throw `AppError(404)` nếu not found.
- `delete(id)` — hard delete, throw `AppError(404)` nếu not found.
- `checkDuplicates(rows)` — với mỗi row, query `SELECT EXISTS` composite condition `(ma=$1 AND ngay=$2 AND so_xe=$3 AND so_hoa_don_goc=$4)`. Trả `DuplicateInfo[]`.
- `uploadMany(rows, originalFilename, userId, skipDuplicates)` — Flow: check duplicates → if has duplicates && !skipDuplicates → return `{ duplicates }` → else bulk INSERT (bỏ qua dòng trùng nếu skipDuplicates=true). Dùng transaction.
File: `backend/src/services/driverInvoiceService.ts` | M |
| BE-03 | Viết controller `driverInvoiceController.ts` | Handlers: `list(req, res)`, `getById(req, res)`, `upload(req, res)`, `delete(req, res)`. Bọc response trong `{ success, message, data }`. Xử lý lỗi: 409 cho duplicate, 404 cho not found, bắt lỗi chung → next(error). Lấy `userId` từ `req.user.id`. File: `backend/src/controllers/driverInvoiceController.ts` | S |
| BE-04 | Tạo route `driverInvoices.ts` | `GET /` → `authenticateToken` + `requirePermission('accounting_data.view')` → `controller.list`. `GET /:id` → same auth → `controller.getById`. `POST /upload` → `authenticateToken` + `requirePermission('accounting_data.manage')` → `controller.upload`. `DELETE /:id` → `authenticateToken` + `requirePermission('accounting_data.manage')` → `controller.delete`. File: `backend/src/routes/driverInvoices.ts` | S |
| BE-05 | Register route trong `routes/index.ts` | Thêm `import driverInvoiceRoutes from './driverInvoices'` và `router.use('/driver-invoices', driverInvoiceRoutes)`. File: `backend/src/routes/index.ts` | S |

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| FE-01 | Viết utility `parseDriverInvoiceFile.ts` | Export function `parseDriverInvoiceFile(file: File)`. Dùng `xlsx` lib: `XLSX.read()` → tìm sheet "XE NHỎ" → đọc rows từ row 8 (0-indexed: row 7). Map columns: `B=ma, C=ten_tx, D=ngay, E=so_xe, F=noi_giao, G=so_hoa_don_goc`. Parse `so_hoa_don`: split by `+`, filter `\d+`, trả string[]. Parse ngày: linh hoạt (Date object → YYYY-MM-DD, string). Skip dòng có `so_hoa_don_goc` empty/whitespace. Trả `{ rows: ParsedRow[], sheetName: string, totalRows: number, totalInvoices: number }`. File: `frontend/src/utils/parseDriverInvoiceFile.ts` | Modal 1 | M |
| FE-02 | Viết API client `driverInvoiceApi.ts` | `fetchList(params)` — GET `/driver-invoices` với query params (page, limit, ma, ten_tx, ngay_from, ngay_to, so_xe, so_hoa_don). `upload(payload)` — POST `/driver-invoices/upload`, body: `{ rows, original_filename, skip_duplicates }`. `delete(id)` — DELETE `/driver-invoices/:id`. Dùng `axiosClient`. File: `frontend/src/api/driverInvoiceApi.ts` | — | S |
| FE-03 | Viết React Query hook `useDriverInvoices.ts` | `useGetDriverInvoices(filters, pagination)` — `useQuery` với query key `['driver-invoices', filters, pagination]`. `useUploadDriverInvoices()` — `useMutation`, onSuccess → invalidate `['driver-invoices']` + toast. `useDeleteDriverInvoice()` — `useMutation`, onSuccess → invalidate + toast. Export types: `DriverInvoice`, `DriverInvoiceFilters`, `PaginationParams`, `UploadPayload`, `UploadResponse`. File: `frontend/src/hooks/useDriverInvoices.ts` | — | S |
| FE-04 | Tạo page `DriverInvoicesPage.tsx` | Page layout: header "Hóa đơn tài xế" + nút "Tải lên" (chỉ khi có `accounting_data.manage`). Filter bar: Mã, Tên TX, Ngày từ/đến, Số xe, Số HĐ (client-side filter trên data đã fetch). Table: STT, Mã, Tên TX, Ngày, Số xe, Nơi giao (truncate+tooltip), Số HĐ gốc (truncate+tooltip), HĐ (badge count), Xóa (icon, chỉ manage). Pagination ở dưới. States: loading skeleton, empty, filter-empty, error+retry. Route: `/accounting-data/driver-invoices`. File: `frontend/src/pages/admin/accounting-data/DriverInvoicesPage.tsx` | Screen 1 | M |
| FE-05 | Tạo modal `DriverInvoiceUploadModal.tsx` | Modal (size=lg) với upload zone (drag-drop + click) → file selected → `parseDriverInvoiceFile()` → loading spinner "Đang đọc file..." → preview: hiển thị 10 dòng đầu trong table mini + tổng số dòng + tổng số hóa đơn. Footer: [Hủy] + [Xác nhận import]. Upload flow: gọi `useUploadDriverInvoices().mutateAsync()` → nếu 409 → hiện DuplicateConfirmDialog → nếu skip thành công → toast + close. Các states: idle, drag-over, parsing, parse-error, preview, uploading. Handle errors: file không đúng format, không có sheet, không có data. File: `frontend/src/components/accounting-data/DriverInvoiceUploadModal.tsx` | Screen 2 | M |
| FE-06 | Tạo dialog `DuplicateConfirmDialog.tsx` | Dialog (size=md) hiện message + table danh sách duplicates (ma, ten_tx, ngay, so_xe, so_hoa_don_goc). Footer: [Hủy] (quay về preview) + [Bỏ qua dòng trùng, import mới] (gọi upload lại với skip_duplicates=true). Props: `duplicates: DuplicateInfo[]`, `onSkip: () => void`, `onCancel: () => void`, `newCount: number`. File: `frontend/src/components/accounting-data/DuplicateConfirmDialog.tsx` | Screen 3 | S |
| FE-07 | Cập nhật Router + Sidebar | Thêm route `<Route path="/accounting-data/driver-invoices" element={<DriverInvoicesPage />} />` vào `Router.tsx` (trong MainLayout, sau accounting-data routes). Thêm sub-item `{ to: '/accounting-data/driver-invoices', icon: FileText, label: t('accountingData.driverInvoices' as never) }` vào `accountingDataSubItems` trong `MainLayout.tsx`. Import `FileText` từ lucide-react nếu chưa có. | — | S |
| FE-08 | Thêm i18n keys | Thêm tất cả keys từ UI Spec Section 5 vào file `vi.json`. Cập nhật type definitions. File: `frontend/src/i18n/vi.json` | Section 5 | S |

---

## 📊 Thứ tự thực hiện

```
Phase BE:  BE-01 → BE-02 → BE-03 → BE-04 → BE-05
Phase FE:  FE-01 → FE-02 → FE-03 → FE-05 → FE-06 → FE-04 → FE-07 → FE-08
```

---

## ⚠️ Lưu ý kỹ thuật

- **Parse Excel ở frontend:** Dùng `xlsx` lib (đã có sẵn trong project). Pattern parse file ở client gửi JSON lên backend — giống `parseDeliveryFile()`, `WeightAdjustmentUploadModal`, `CustomersPage`.
- **Merge cell trong header:** File mẫu có merge cell trong row 1-7. SheetJS (`xlsx`) có thể đọc merge cell qua `!merges`. Cần `{ cellStyles: true }` hoặc sử dụng `sheet_to_json` với `{ header: 1, defval: '' }` để đọc raw. Đọc rows 8+ (index 7) là data rows bắt đầu, vì row 7 là sub-header cuối.
- **Invoice number parse regex:** `/^\d+$/` để validate từng phần tử sau khi split. Bỏ qua text.
- **Composite unique:** Index trên `(ma, ngay, so_xe, so_hoa_don_goc)` — `so_hoa_don_goc` là TEXT để check trùng raw data.
- **Duplicate check trong transaction:** Backend check duplicates trước khi insert, nếu không có skip_duplicates thì trả 409. Nếu có skip_duplicates, filter bỏ dòng trùng rồi bulk insert.
- **Error handling format:** Backend trả `{ success: false, message, data: { duplicates, new_count, duplicate_count } }` cho 409. Frontend parse `error.response.data.data.duplicates`.
- **Permission:** Dùng permission có sẵn `accounting_data.view` / `accounting_data.manage`. Không tạo permission mới.
- **Pagination pattern:** Giống customers (backend trả `{ data, pagination: { page, limit, total, totalPages } }`). Frontend dùng React Query với `keepPreviousData: true`.
- **i18n:** Tất cả text trong UI phải qua i18n hook, không hardcode tiếng Việt.
- **File size limit:** Frontend kiểm tra file size (max 10MB), backend cũng nên có limit trong body parser (nhưng vì gửi JSON nên limit mặc định của Express là đủ).
