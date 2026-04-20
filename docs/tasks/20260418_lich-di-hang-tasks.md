# Task List: Lịch đi hàng (Delivery Schedule)

**Ngày:** 2026-04-18
**BA Doc:** docs/ba/20260418_lich-di-hang-analysis.md
**UI Spec:** docs/ui/20260418_lich-di-hang-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration | Table `delivery_schedules` với columns: id, ngay (DATE), stt (INTEGER), noi_giao (VARCHAR 255), tan (DECIMAL 10,2), so_xe (VARCHAR 50), can_info (VARCHAR 255), ghi_chu (TEXT), created_by (FK users), created_at, updated_at. Indexes: ngay, so_xe, created_by | M |
| BE-02 | Install dependencies | `npm install xlsx multer @types/multer @types/xlsx --save` trong backend/ | S |
| BE-03 | Tạo service | `deliveryScheduleService.ts`: methods: `upload(file, fromDate, toDate, userId)` (parse Excel, validate, batch insert với transaction), `list(filters, pagination)` (với JOIN users), `deleteByDateRange(fromDate, toDate)` | L |
| BE-04 | Tạo controller | `deliveryScheduleController.ts`: `upload()` (handle multipart/form-data, call service, return stats hoặc fail-fast errors), `list()` (filter + pagination), `deleteByDateRange()` | M |
| BE-05 | Validation schemas | express-validator schemas: `deliveryScheduleUploadSchema` (file required, from_date YYYY-MM-DD, to_date YYYY-MM-DD, from <= to), `deliveryScheduleListSchema` (query params), `deliveryScheduleDeleteSchema` (date range) | S |
| BE-06 | Tạo route | `deliverySchedule.ts`: POST /upload (multer middleware + requirePermission('transport.manage')), GET / (requirePermission('transport.view')), DELETE /by-date-range (requirePermission('transport.manage')). Mount vào `/api/delivery-schedules` trong routes/index.ts | M |
| BE-07 | Multer config | Tạo `src/middleware/upload.ts`: multer config với file size limit 10MB, file filter (.xlsx only), disk storage vào `/tmp` | S |

**Thứ tự thực hiện Backend:**
```
BE-01 (Migration) → BE-02 (Dependencies) → BE-07 (Multer) → BE-03 (Service) → BE-04 (Controller) → BE-05 (Validation) → BE-06 (Route)
```

---

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|------|------|-------------------|-------------|--------|
| FE-01 | Install dependencies | `npm install react-dropzone dayjs --save` trong frontend/ | — | S |
| FE-02 | Tạo API client | `src/api/deliveryScheduleApi.ts`: methods: `upload(formData)`, `getList(filters, pagination)`, `deleteByDateRange(fromDate, toDate)`. Integrate với axios instance, handle multipart/form-data cho upload | Section 2 | M |
| FE-03 | Tạo types | `src/types/deliverySchedule.ts`: interfaces `DeliverySchedule`, `UploadFormData`, `UploadError`, `UploadResponse`, `ListFilters` | — | S |
| FE-04 | Tạo UploadModal component | `src/components/delivery-schedule/UploadDeliveryScheduleModal.tsx`: Form với react-dropzone (file .xlsx only), 2 date pickers (From/To), validation (From <= To), React Query mutation, handle success (toast + close + reload), handle fail-fast errors (show error list trong modal, scroll to top) | Section 2.2 | L |
| FE-05 | Tạo Table component | `src/components/delivery-schedule/DeliveryScheduleTable.tsx`: Props: data, isLoading, isEmpty, isError. States: loading (skeleton 6 rows), empty (FileX icon + message + Upload CTA nếu có permission), error (AlertCircle + retry button), success (table 7 columns: Ngày DD/MM/YYYY, STT, Nơi giao, Tấn 2 decimals, Số xe, Cân, Ghi chú, null → "—") | Section 3.3 | M |
| FE-06 | Tạo Filters component | `src/components/delivery-schedule/DeliveryScheduleFilters.tsx`: Props: filters, onFiltersChange, isLoading. Fields: From Date (default 30 days ago), To Date (default today), Search input (debounce 500ms), Tìm kiếm button. Validate From <= To | Section 3.4 | M |
| FE-07 | Tạo Page | `src/pages/vehicle-data/DeliverySchedulePage.tsx`: Layout: header "Lịch đi hàng" + Upload button (check permission transport.manage), Filters component, Table component, Pagination. React Query: useQuery với queryKey [filters, pagination], refetch on upload success. State: isUploadModalOpen | Section 2.1, 3.1 | L |
| FE-08 | i18n keys | Thêm keys vào `src/i18n/locales/vi.json` và `en.json`: deliverySchedule.* (title, upload, filter.*, table.*, empty.*, error.*, upload.modal.*, upload.validation.*, upload.success/warning/error) | Section 5 | S |
| FE-09 | Thêm route | `src/Router.tsx`: thêm route `/vehicle-data/delivery-schedule` → DeliverySchedulePage, protected, permission check transport.view | — | S |
| FE-10 | Cập nhật sidebar | `src/layouts/MainLayout.tsx`: thêm menu item "Lịch đi hàng" dưới "Quản lý dữ liệu xe" dropdown, link `/vehicle-data/delivery-schedule`, icon FileSpreadsheet, check permission transport.view | — | S |

**Thứ tự thực hiện Frontend:**
```
FE-01 (Dependencies) → FE-02 (API) → FE-03 (Types) → FE-08 (i18n) → FE-04 (Modal) → FE-05 (Table) → FE-06 (Filters) → FE-07 (Page) → FE-09 (Route) → FE-10 (Sidebar)
```

---

## 📊 Phụ thuộc giữa tasks

### Backend dependencies:
- BE-03 depends on BE-02 (cần xlsx library)
- BE-04 depends on BE-03 (controller gọi service)
- BE-06 depends on BE-04, BE-05, BE-07 (route dùng controller + validation + multer)

### Frontend dependencies:
- FE-04 depends on FE-01, FE-02, FE-03 (modal dùng react-dropzone + API + types)
- FE-05 depends on FE-03 (table dùng types)
- FE-06 depends on FE-03 (filters dùng types)
- FE-07 depends on FE-02, FE-03, FE-04, FE-05, FE-06 (page compose tất cả)
- FE-09 depends on FE-07 (route import page)
- FE-10 depends on FE-09 (sidebar link đến route)

### Cross-stack dependencies:
- Frontend KHÔNG thể test đầy đủ cho đến khi Backend Phase 4 (run migration) hoàn tất

---

## ⚠️ Lưu ý kỹ thuật

### Backend Excel Parsing Logic (BE-03)

**Cấu trúc file Excel:**
- Mỗi sheet chứa 2 ngày (2 cột)
- Cột 1 (A-F): Row 1 = date (A1), Row 2 = "LỊCH ĐI HÀNG", Row 3 = headers, Row 4+ = data
- Cột 2 (G-L): Row 1 = date (G1), Row 2 = "LỊCH ĐI HÀNG", Row 3 = headers, Row 4+ = data

**Parsing steps:**
1. Đọc file bằng `xlsx` library: `XLSX.readFile(path, { cellDates: true })`
2. Loop qua từng sheet (skip 4 sheet đầu nếu không phải schedule sheets)
3. Với mỗi sheet:
   - Đọc date từ cell A1 (column 0, row 0) → convert sang Date object
   - Nếu date trong range [fromDate, toDate]: parse cột 1 (columns A-F)
   - Đọc date từ cell G1 (column 6, row 0) → convert sang Date object
   - Nếu date trong range: parse cột 2 (columns G-L)
4. Parse data rows (từ row 3 trở đi):
   - STT: column A (hoặc G)
   - NƠI GIAO: column B (hoặc H)
   - TẤN: column C (hoặc I)
   - SỐ XE: column D (hoặc J)
   - CAN: column E (hoặc K)
   - GHI CHÚ: column F (hoặc L)
5. Validation rule: chỉ lấy row có STT !== null AND (NƠI GIAO !== null OR SỐ XE !== null)
6. Normalization:
   - so_xe: `value.toString().replace(/,/g, '.').trim()`
   - tan: kiểm tra không phải datetime object → parse float
7. Collect errors: nếu có lỗi → push vào errors array với format `{ sheet, row, ngay, field, value, reason }`
8. Sau khi parse xong tất cả sheets:
   - Nếu errors.length > 0: throw error với details array (fail-fast)
   - Nếu không có lỗi: batch insert với transaction

**Replace mode (EC-009):**
- Trước khi insert: `DELETE FROM delivery_schedules WHERE ngay >= $1 AND ngay <= $2`
- Sau đó: batch insert tất cả rows mới

**Transaction:**
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Delete old data in range
  await client.query(
    'DELETE FROM delivery_schedules WHERE ngay >= $1 AND ngay <= $2',
    [fromDate, toDate]
  );

  // Batch insert new data
  // ... (use parameterized query với $1, $2, ... $N)

  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### Frontend Upload Flow (FE-04)

**react-dropzone config:**
```typescript
const { getRootProps, getInputProps } = useDropzone({
  accept: {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  },
  maxSize: 10 * 1024 * 1024, // 10MB
  multiple: false,
  onDrop: (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      // Show error toast
    } else {
      setFile(acceptedFiles[0]);
    }
  }
});
```

**FormData construction:**
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('from_date', dayjs(fromDate).format('YYYY-MM-DD'));
formData.append('to_date', dayjs(toDate).format('YYYY-MM-DD'));
```

**Error handling:**
```typescript
onError: (error: ApiError) => {
  if (error.details && Array.isArray(error.details)) {
    // Fail-fast errors từ backend
    setUploadErrors(error.details);
    // Scroll modal to top
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    // Modal vẫn mở, user có thể chọn file khác hoặc đóng modal
  } else {
    // Network error hoặc lỗi khác
    toast.error(`Upload thất bại: ${error.message}`);
  }
}
```

### Permission Check Pattern (FE-07, FE-10)

```typescript
const { hasPermission } = useAuth();
const canView = hasPermission('transport.view');
const canManage = hasPermission('transport.manage');

// Trong JSX:
{canManage && <Button onClick={openModal}>Upload</Button>}
```

### Sidebar Menu Structure (FE-10)

```typescript
// Trong MainLayout.tsx, navigation array:
{
  title: 'Quản lý dữ liệu xe',
  permission: 'transport.view',
  children: [
    { title: 'Mã chuyến', path: '/vehicle-data/trip-codes', icon: Hash },
    { title: 'Xe', path: '/vehicle-data/vehicles', icon: Truck },
    { title: 'Tài xế', path: '/vehicle-data/drivers', icon: User },
    { title: 'Lịch đi hàng', path: '/vehicle-data/delivery-schedule', icon: FileSpreadsheet }, // NEW
  ]
}
```

---

## 🧪 Test Cases cần cover (Phase 5-6)

### Backend Unit Tests (deliveryScheduleService.test.ts)

1. **Upload - Happy path:**
   - Mock file Excel với 2 sheets, mỗi sheet 2 ngày
   - fromDate = 01/01/2026, toDate = 16/01/2026
   - Expected: parse đúng 4 ngày, insert đúng số rows

2. **Upload - Fail-fast validation:**
   - Mock file có 1 row với TẤN = datetime object
   - Expected: throw error với details array chứa row đó

3. **Upload - Date range filter:**
   - Mock file có 10 ngày (01/01 - 10/01)
   - fromDate = 05/01, toDate = 07/01
   - Expected: chỉ insert 3 ngày (05, 06, 07)

4. **Upload - Normalization:**
   - Mock row với so_xe = "61C-123,45  " (comma + trailing space)
   - Expected: normalized thành "61C-123.45"

5. **Upload - BR-001 (STT + NƠI GIAO/SỐ XE):**
   - Mock row có STT nhưng thiếu cả NƠI GIAO và SỐ XE
   - Expected: skip row đó (không insert, không throw error)

6. **List - Filter by date range:**
   - Insert 30 rows (01/01 - 30/01)
   - Query với from_date = 10/01, to_date = 15/01
   - Expected: return đúng 6 ngày

7. **List - Search:**
   - Insert rows với noi_giao = "Hà Nội", "TP HCM", "Đà Nẵng"
   - Query với search = "Hà"
   - Expected: return chỉ "Hà Nội"

8. **DeleteByDateRange:**
   - Insert 10 rows (01/01 - 10/01)
   - Delete range 05/01 - 07/01
   - Expected: xóa 3 rows, còn 7 rows

9. **Upload - Replace mode:**
   - Insert 5 rows ngày 01/01/2026
   - Upload lại file với 3 rows ngày 01/01/2026 (khác data)
   - Expected: xóa 5 rows cũ, insert 3 rows mới

### Backend Integration Tests (deliverySchedule.routes.test.ts)

1. **POST /upload - 401 nếu không có token**
2. **POST /upload - 403 nếu không có permission transport.manage**
3. **POST /upload - 400 nếu thiếu file hoặc date range**
4. **POST /upload - 413 nếu file > 10MB**
5. **POST /upload - 200 với stats nếu success**
6. **GET / - 401 nếu không có token**
7. **GET / - 403 nếu không có permission transport.view**
8. **GET / - 200 với pagination**
9. **DELETE /by-date-range - 403 nếu không có permission transport.manage**

---

## 📈 Estimated Total Effort

- **Backend:** 3-4 hours (1 L + 3 M + 3 S tasks)
- **Frontend:** 5-6 hours (2 L + 3 M + 4 S tasks)
- **QA (Phase 5-6):** 2-3 hours (viết tests + chạy tests)
- **Total:** ~10-13 hours

---

## 🔗 Related Files

### Cần đọc để hiểu pattern hiện tại:
- `backend/src/controllers/tripCodeController.ts` → upload pattern với fail-fast
- `backend/src/services/tripCodeService.ts` → soft-update pattern
- `frontend/src/pages/vehicle-data/TripCodePage.tsx` → page layout pattern
- `frontend/src/components/trip-codes/UploadTripCodesModal.tsx` → upload modal pattern

### Cần modify:
- `backend/src/routes/index.ts` → mount route mới
- `frontend/src/Router.tsx` → add route
- `frontend/src/layouts/MainLayout.tsx` → add menu item
- `frontend/src/i18n/locales/vi.json` và `en.json` → add i18n keys

---

**Kết luận:**
Task list đã breakdown đủ chi tiết cho dev implement. Backend focus vào Excel parsing với fail-fast validation và replace mode. Frontend focus vào upload UX với 5 states (loading, empty, error, success, submitting) và fail-fast error display trong modal.
