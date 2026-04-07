# Task List — Quản lý dữ liệu xe / Mã chuyến

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_ma-chuyen-analysis.md
**UI Spec:** docs/ui/20260406_ma-chuyen-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Tạo migration | `003_create_trip_codes.sql` — table `trip_codes` với đủ columns: id, ma, tuyen, so_tien, status, start_date, end_date, boc_xep, ghi_chu, created_at, updated_at + 3 indexes | S |
| BE-02 | Viết service | `tripCodeService.ts` — methods: `list()`, `create(data)`, `update(id, data)` (soft-update), `delete(id)` (soft-delete), `uploadMany(rows[])` (bulk insert với duplicate check) | M |
| BE-03 | Tạo API route | `tripCodes.ts` route file + đăng ký trong `routes/index.ts`: GET /api/trip-codes, POST /api/trip-codes, PUT /api/trip-codes/:id, DELETE /api/trip-codes/:id, POST /api/trip-codes/upload (multer) | M |
| BE-04 | Controller | `tripCodeController.ts` — xử lý request/response, parse multipart/form-data cho upload, gọi service, trả response format chuẩn `{ success, message, data }` | M |
| BE-05 | Validation | express-validator rules: ma (required, max 100), tuyen (required, max 255), so_tien (optional, >= 0, numeric), boc_xep (optional, max 500), ghi_chu (optional, max 1000) | S |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | API client | `api/tripCodeApi.ts` — functions: `fetchTripCodes()`, `createTripCode(data)`, `updateTripCode(id, data)`, `deleteTripCode(id)`, `uploadTripCodes(file: File)` — dùng axiosClient | — | S |
| FE-02 | React Query hooks | `hooks/useTripCodes.ts` — `useGetTripCodes()` (useQuery), `useCreateTripCode()` (useMutation + invalidate), `useUpdateTripCode()`, `useDeleteTripCode()`, `useUploadTripCodes()` | — | M |
| FE-03 | TripCodeFormModal | `components/vehicle-data/TripCodeFormModal.tsx` — React Hook Form + Yup, mode=create/edit, 5 fields, inline errors, submitting state, 409 error handling | Screen 2 | M |
| FE-04 | TripCodeUploadModal | `components/vehicle-data/TripCodeUploadModal.tsx` — drag & drop zone, file validation (.xlsx only), upload state, error table display | Screen 3 | M |
| FE-05 | TripCodePage | `pages/admin/vehicle-data/TripCodePage.tsx` — table với 7 columns, loading skeleton, empty state, error state, search bar (client-side), Edit/Delete per row, 2 action buttons ở header | Screen 1 | M |
| FE-06 | Router + Sidebar | Thêm route `/vehicle-data/trip-codes` vào `Router.tsx` + thêm collapsible menu "Quản lý dữ liệu xe" vào `MainLayout.tsx` | — | S |

## 📊 Thứ tự thực hiện

```
Phase 3: BE-01 → BE-02 → BE-04 → BE-03 → BE-05
Phase 4: Run migration (BE-01)
Phase 5: Viết tests (BE-02 service, BE-03 routes)
Phase 6: Chạy tests
Phase 7: FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06
Phase 8: QA đối chiếu UI Spec + regression
```

## ⚠️ Lưu ý kỹ thuật

- Backend dùng `express-validator` (KHÔNG dùng Zod) — đồng nhất với authController.ts
- Upload file: dùng `multer` (memoryStorage, không lưu disk) để parse .xlsx, dùng `xlsx` lib parse nội dung
- Cột `ma` KHÔNG có UNIQUE constraint ở DB level (vì cùng mã có thể có nhiều row deactive). Uniqueness check trong service layer (SELECT WHERE ma=? AND status='active')
- Case-sensitive duplicate check: PostgreSQL dùng `= $1` (exact match, default case-sensitive với collation C hoặc UTF8)
- Frontend đã có `xlsx` package (xem package.json) — dùng để generate template Excel
- Frontend: Toast notification — tìm/dùng component toast đã có (kiểm tra `components/ui/`)
- Khi soft-update: chạy trong 1 transaction (BEGIN → UPDATE old → INSERT new → COMMIT)
- Route cần authenticate (`authenticateToken` middleware) — chỉ user đã login mới được dùng
