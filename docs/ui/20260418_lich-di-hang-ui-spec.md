# UI/UX Specification: Lịch đi hàng (Delivery Schedule)

**Ngày:** 2026-04-18
**Feature:** Upload và quản lý lịch đi hàng từ file Excel
**BA Document:** docs/ba/20260418_lich-di-hang-analysis.md

---

## 1. User Journey

### 1.1 Happy Path — Upload file thành công

```
User login với role có permission transport.manage
  ↓
Navigate to /vehicle-data/delivery-schedule
  ↓
Click button "Upload" (top right)
  ↓
Modal "Upload Lịch đi hàng" xuất hiện
  ↓
Chọn file Excel (.xlsx) từ máy tính
  ↓
File name hiển thị, icon file xuất hiện
  ↓
Chọn From Date (date picker) — vd: 01/01/2026
  ↓
Chọn To Date (date picker) — vd: 16/04/2026
  ↓
Click "Upload" button
  ↓
Button disabled, loading spinner xuất hiện
  ↓
Upload progress (nếu file lớn) — optional
  ↓
Backend xử lý thành công
  ↓
Modal đóng
  ↓
Toast success: "Upload thành công: 4,918 chuyến xe từ 01/01/2026 đến 16/04/2026"
  ↓
Table tự động reload với dữ liệu mới
  ↓
User thấy danh sách lịch đi hàng đã upload
```

### 1.2 Alternative Path — Validation Error (fail-fast)

```
User upload file có lỗi dữ liệu
  ↓
Backend trả về error response với details array
  ↓
Modal KHÔNG đóng
  ↓
Error section xuất hiện trong modal (trên form)
  ↓
Hiển thị error list với format:
  "Sheet 204, Row 15, Ngày 16/04/2026, Field tan: Invalid datetime in TAN column"
  ↓
Scroll modal to top để user thấy error list
  ↓
User có 2 options:
  A) Đóng modal → fix file Excel → upload lại
  B) Chọn file khác ngay trong modal → upload lại
```

### 1.3 Alternative Path — Không có dữ liệu trong date range

```
User chọn date range không có data trong file
  ↓
Backend trả về success với total_rows_inserted: 0
  ↓
Modal đóng
  ↓
Toast warning: "Không có dữ liệu nào trong khoảng thời gian đã chọn (01/05/2026 - 31/05/2026)"
  ↓
Table không thay đổi
```

### 1.4 Error Path — Network error / Timeout

```
User upload file
  ↓
Network bị mất giữa chừng
  ↓
Modal vẫn mở, loading spinner biến mất
  ↓
Toast error: "Upload thất bại: Network error. Vui lòng thử lại."
  ↓
User click "Upload" lại
```

### 1.5 Alternative Path — User không có permission transport.manage

```
User login với role VIEWER (chỉ có transport.view)
  ↓
Navigate to /vehicle-data/delivery-schedule
  ↓
Button "Upload" KHÔNG hiển thị
  ↓
User chỉ xem được table danh sách (read-only)
```

---

## 2. Screen Inventory

### Screen 2.1: DeliverySchedulePage

**File:** `frontend/src/pages/vehicle-data/DeliverySchedulePage.tsx`
**Route:** `/vehicle-data/delivery-schedule`
**Permission:** `transport.view`

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Header: "Lịch đi hàng"]                  [Upload Button]   │
├─────────────────────────────────────────────────────────────┤
│ Filter Bar:                                                  │
│   From Date: [DatePicker]  To Date: [DatePicker]           │
│   Search: [Input: "Tìm nơi giao, số xe, ghi chú..."]       │
│   [Tìm kiếm Button]                                         │
├─────────────────────────────────────────────────────────────┤
│ Table:                                                       │
│ ┌────┬──────────┬─────┬──────────┬──────┬────────┬───────┐ │
│ │Ngày│STT       │Nơi  │  Tấn     │Số xe │Cân     │Ghi chú│ │
│ │    │          │giao │          │      │        │       │ │
│ ├────┼──────────┼─────┼──────────┼──────┼────────┼───────┤ │
│ │... │...       │...  │...       │...   │...     │...    │ │
│ └────┴──────────┴─────┴──────────┴──────┴────────┴───────┘ │
│                                                              │
│ [Pagination: < 1 2 3 ... 10 >]   [50 rows per page ▼]     │
└─────────────────────────────────────────────────────────────┘
```

#### States

##### State 1: Loading (Initial load)
- Header visible
- Upload button visible (nếu có permission transport.manage)
- Filter bar visible với default values:
  - From Date: 30 days ago
  - To Date: today
  - Search: empty
- Table: Skeleton rows (6 rows × 7 columns)
- Pagination: hidden

##### State 2: Empty (Không có dữ liệu)
- Header visible
- Upload button visible
- Filter bar visible
- Table: Empty state component
  ```
  ┌─────────────────────────────────────┐
  │         [Icon: FileX]               │
  │                                     │
  │   Chưa có dữ liệu lịch đi hàng      │
  │                                     │
  │   [Upload file Excel Button]        │ ← Chỉ hiện nếu có permission
  └─────────────────────────────────────┘
  ```
- Pagination: hidden

##### State 3: Success (Có dữ liệu)
- Header visible
- Upload button visible
- Filter bar visible với user-selected values
- Table: Hiển thị danh sách schedules
  - Mỗi row: ngay, stt, noi_giao, tan, so_xe, can_info, ghi_chu
  - Format ngay: DD/MM/YYYY
  - Format tan: number với 2 decimal places (vd: 12.50)
  - so_xe: normalize (vd: 61C-123.45)
  - Nếu field null: hiển thị "—"
- Pagination: visible với total pages

##### State 4: Error (API call failed)
- Header visible
- Upload button visible
- Filter bar visible
- Table: Error state component
  ```
  ┌─────────────────────────────────────┐
  │         [Icon: AlertCircle]         │
  │                                     │
  │   Không thể tải dữ liệu             │
  │   Lỗi: {error_message}              │
  │                                     │
  │   [Thử lại Button]                  │
  └─────────────────────────────────────┘
  ```
- Pagination: hidden

##### State 5: Searching (User change filter)
- Header visible
- Upload button visible
- Filter bar visible, inputs disabled
- Table: Skeleton rows (keep previous data visible với opacity 0.5)
- Pagination: disabled

#### Actions

| Action | Trigger | Permission | Behavior |
|--------|---------|------------|----------|
| Click "Upload" button | Button click | transport.manage | Open UploadDeliveryScheduleModal |
| Change From Date | DatePicker change | transport.view | Auto trigger search (debounce 500ms) |
| Change To Date | DatePicker change | transport.view | Auto trigger search (debounce 500ms) |
| Type in Search | Input change | transport.view | Auto trigger search (debounce 500ms) |
| Click "Tìm kiếm" | Button click | transport.view | Trigger search immediately |
| Change page | Pagination click | transport.view | Fetch new page data |
| Change limit | Select change | transport.view | Reset to page 1, fetch with new limit |

#### Validation

- From Date phải <= To Date (validate ở client-side)
- Nếu From Date > To Date: disable "Tìm kiếm" button, hiển thị error text dưới To Date: "To Date phải >= From Date"

---

### Screen 2.2: UploadDeliveryScheduleModal

**File:** `frontend/src/components/delivery-schedule/UploadDeliveryScheduleModal.tsx`

#### Layout Structure

```
┌───────────────────────────────────────────────────┐
│ Upload Lịch đi hàng                        [X]    │
├───────────────────────────────────────────────────┤
│                                                   │
│ [Error Section — chỉ hiện khi có error]          │
│ ┌───────────────────────────────────────────────┐ │
│ │ ⚠ Có lỗi trong dữ liệu (3 lỗi):              │ │
│ │                                               │ │
│ │ • Sheet 204, Row 15, Ngày 16/04/2026,        │ │
│ │   Field tan: Invalid datetime in TAN column   │ │
│ │ • Sheet 184, Row 8, Ngày 10/04/2026,         │ │
│ │   Field so_xe: Missing required field         │ │
│ │ • Sheet 150, Row 22, Ngày 25/03/2026,        │ │
│ │   Field tan: Invalid number format            │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ File Excel *                                      │
│ ┌───────────────────────────────────────────────┐ │
│ │ [Icon: Upload] Chọn hoặc kéo thả file .xlsx  │ │ ← State: empty
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ OR (after file selected):                         │
│ ┌───────────────────────────────────────────────┐ │
│ │ [Icon: FileSpreadsheet] lich_di_hang_2026.xlsx│ │ ← State: selected
│ │                                    [X Remove]  │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ Khoảng thời gian *                                │
│ From Date:       To Date:                         │
│ [01/01/2026 ▼]  [16/04/2026 ▼]                   │
│                                                   │
│ [Validation error text — nếu có]                 │
│                                                   │
├───────────────────────────────────────────────────┤
│                           [Hủy]   [Upload]       │
└───────────────────────────────────────────────────┘
```

#### States

##### State 1: Initial (Modal vừa mở)
- Error section: hidden
- File upload area: empty state (dropzone)
- From Date: empty (placeholder: "Chọn ngày bắt đầu")
- To Date: empty (placeholder: "Chọn ngày kết thúc")
- Upload button: disabled (gray)
- Hủy button: enabled

##### State 2: File selected, dates empty
- Error section: hidden
- File upload area: selected state (file name + Remove icon)
- From Date: empty
- To Date: empty
- Upload button: disabled (gray)
- Validation: "Vui lòng chọn khoảng thời gian"

##### State 3: File + dates selected, valid
- Error section: hidden
- File upload area: selected state
- From Date: filled (vd: 01/01/2026)
- To Date: filled (vd: 16/04/2026)
- Upload button: enabled (blue)
- Validation: pass

##### State 4: Dates invalid (From > To)
- Error section: hidden
- File upload area: selected state
- From Date: filled
- To Date: filled, error border (red)
- Validation error text dưới To Date: "To Date phải >= From Date"
- Upload button: disabled

##### State 5: Uploading (Loading)
- Error section: hidden (nếu re-upload sau error trước đó)
- File upload area: selected state, disabled
- Date pickers: disabled
- Upload button: disabled, spinner visible, text "Đang upload..."
- Hủy button: disabled
- User không thể đóng modal (overlay click disabled)

##### State 6: Upload failed — Validation errors (fail-fast)
- Error section: visible với danh sách lỗi
  - Scroll modal to top tự động
  - Error message format: "Sheet {sheet}, Row {row}, Ngày {ngay}, Field {field}: {reason}"
  - Max height: 200px, scrollable nếu nhiều lỗi
- File upload area: selected state, enabled (user có thể chọn file khác)
- Date pickers: enabled
- Upload button: enabled (text "Upload lại")
- Hủy button: enabled
- Modal vẫn mở, user fix file rồi upload lại

##### State 7: Upload failed — Network error
- Error section: visible với message "Upload thất bại: {error_message}"
- File upload area: selected state, enabled
- Date pickers: enabled
- Upload button: enabled (text "Thử lại")
- Hủy button: enabled

##### State 8: Upload success
- Modal đóng ngay lập tức
- Toast success xuất hiện ở DeliverySchedulePage
- Table reload

#### Actions

| Action | Trigger | Validation | Behavior |
|--------|---------|------------|----------|
| Click dropzone | Click | — | Open file picker (accept: .xlsx only) |
| Drag & drop file | Drop | File extension = .xlsx | Set file, validate form |
| Select file from picker | File input change | File extension = .xlsx | Set file, validate form |
| Click Remove file | Icon click | — | Clear file, disable Upload button |
| Change From Date | DatePicker change | — | Validate From <= To, enable/disable Upload |
| Change To Date | DatePicker change | — | Validate From <= To, enable/disable Upload |
| Click Hủy | Button click | — | Close modal, clear form |
| Click Upload | Button click | File + dates valid | Submit form → API call → handle response |
| Click X (top right) | Icon click | — | Close modal (chỉ enabled khi không đang upload) |
| Click overlay | Outside click | — | Close modal (chỉ enabled khi không đang upload) |

#### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| File | Required | "Vui lòng chọn file Excel" |
| File | Extension = .xlsx | "Chỉ chấp nhận file .xlsx" |
| File | Size <= 10MB | "File quá lớn (tối đa 10MB)" |
| From Date | Required | "Vui lòng chọn ngày bắt đầu" |
| To Date | Required | "Vui lòng chọn ngày kết thúc" |
| Date Range | From <= To | "To Date phải >= From Date" |

---

## 3. Component Checklist

### Component 3.1: DeliverySchedulePage

**File:** `frontend/src/pages/vehicle-data/DeliverySchedulePage.tsx`

**Props:** None (route component)

**States (component-level):**
```typescript
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
const [filters, setFilters] = useState({
  from_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
  to_date: dayjs().format('YYYY-MM-DD'),
  search: ''
});
const [pagination, setPagination] = useState({
  page: 1,
  limit: 50
});
```

**React Query:**
```typescript
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['delivery-schedules', filters, pagination],
  queryFn: () => deliveryScheduleApi.getList(filters, pagination)
});
```

**Required states to implement:**
- ✅ Loading state (skeleton table)
- ✅ Empty state (no data message + Upload CTA)
- ✅ Error state (error message + retry button)
- ✅ Success state (table with data)

**Permissions check:**
```typescript
const { hasPermission } = useAuth();
const canManage = hasPermission('transport.manage');
```

---

### Component 3.2: UploadDeliveryScheduleModal

**File:** `frontend/src/components/delivery-schedule/UploadDeliveryScheduleModal.tsx`

**Props:**
```typescript
interface UploadDeliveryScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;  // Callback to reload table
}
```

**States:**
```typescript
const [file, setFile] = useState<File | null>(null);
const [fromDate, setFromDate] = useState<Date | null>(null);
const [toDate, setToDate] = useState<Date | null>(null);
const [validationErrors, setValidationErrors] = useState<string[]>([]);
const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
```

**React Hook Form:**
```typescript
const { register, handleSubmit, formState: { errors }, reset } = useForm({
  resolver: yupResolver(uploadSchema)
});
```

**React Query Mutation:**
```typescript
const uploadMutation = useMutation({
  mutationFn: (data: UploadFormData) => deliveryScheduleApi.upload(data),
  onSuccess: (response) => {
    toast.success(`Upload thành công: ${response.data.total_rows_inserted} chuyến xe từ ${fromDate} đến ${toDate}`);
    onSuccess();  // Reload table
    onClose();
    reset();
  },
  onError: (error: ApiError) => {
    if (error.details) {
      setUploadErrors(error.details);  // Fail-fast errors
      // Scroll to top of modal
      modalRef.current?.scrollTo(0, 0);
    } else {
      toast.error(`Upload thất bại: ${error.message}`);
    }
  }
});
```

**Required states to implement:**
- ✅ Empty state (dropzone)
- ✅ File selected state
- ✅ Loading state (uploading)
- ✅ Validation error state (client-side)
- ✅ Upload error state (fail-fast from backend)
- ✅ Network error state

---

### Component 3.3: DeliveryScheduleTable

**File:** `frontend/src/components/delivery-schedule/DeliveryScheduleTable.tsx`

**Props:**
```typescript
interface DeliveryScheduleTableProps {
  data: DeliverySchedule[];
  isLoading: boolean;
  isEmpty: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  onUploadClick: () => void;  // For empty state CTA
  canManage: boolean;         // Show Upload button in empty state
}
```

**Required states to implement:**
- ✅ Loading state (skeleton)
- ✅ Empty state (message + CTA)
- ✅ Error state (message + retry)
- ✅ Success state (data table)

---

### Component 3.4: DeliveryScheduleFilters

**File:** `frontend/src/components/delivery-schedule/DeliveryScheduleFilters.tsx`

**Props:**
```typescript
interface DeliveryScheduleFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  isLoading: boolean;
}
```

**States:**
- Debounce search input (500ms)
- Validate date range (From <= To)

---

## 4. Validation UX

### 4.1 Client-side Validation (Inline)

| Field | Validation | Display | Timing |
|-------|------------|---------|--------|
| File extension | .xlsx only | Error text dưới dropzone | On file select |
| File size | <= 10MB | Error text dưới dropzone | On file select |
| From Date | Required | Error text dưới date picker | On blur |
| To Date | Required | Error text dưới date picker | On blur |
| Date range | From <= To | Error text dưới To Date picker, To Date input border red | On To Date change |

### 4.2 Backend Validation (Toast + Modal)

| Scenario | Display Method | Action |
|----------|----------------|--------|
| Fail-fast errors (data invalid) | Error section in modal + error list | Modal stays open, user can re-upload |
| Network error | Toast error | Modal stays open |
| Success | Toast success | Modal closes, table reloads |
| Warning (no data) | Toast warning | Modal closes |

### 4.3 Error Message Format

**Inline validation (client):**
```
"Vui lòng chọn file Excel"
"Chỉ chấp nhận file .xlsx"
"File quá lớn (tối đa 10MB)"
"To Date phải >= From Date"
```

**Fail-fast errors (backend):**
```
"Sheet 204, Row 15, Ngày 16/04/2026, Field tan: Invalid datetime in TAN column"
"Sheet 184, Row 8, Ngày 10/04/2026, Field so_xe: Missing required field"
```

**Toast messages:**
```
✅ Success: "Upload thành công: 4,918 chuyến xe từ 01/01/2026 đến 16/04/2026"
⚠ Warning: "Không có dữ liệu nào trong khoảng thời gian đã chọn (01/05/2026 - 31/05/2026)"
❌ Error: "Upload thất bại: Network error. Vui lòng thử lại."
```

---

## 5. i18n Keys

### 5.1 DeliverySchedulePage

```json
{
  "deliverySchedule.title": "Lịch đi hàng",
  "deliverySchedule.upload": "Upload",
  "deliverySchedule.filter.fromDate": "Từ ngày",
  "deliverySchedule.filter.toDate": "Đến ngày",
  "deliverySchedule.filter.search": "Tìm nơi giao, số xe, ghi chú...",
  "deliverySchedule.filter.searchButton": "Tìm kiếm",
  "deliverySchedule.table.ngay": "Ngày",
  "deliverySchedule.table.stt": "STT",
  "deliverySchedule.table.noiGiao": "Nơi giao",
  "deliverySchedule.table.tan": "Tấn",
  "deliverySchedule.table.soXe": "Số xe",
  "deliverySchedule.table.canInfo": "Cân",
  "deliverySchedule.table.ghiChu": "Ghi chú",
  "deliverySchedule.empty.title": "Chưa có dữ liệu lịch đi hàng",
  "deliverySchedule.empty.cta": "Upload file Excel",
  "deliverySchedule.error.title": "Không thể tải dữ liệu",
  "deliverySchedule.error.retry": "Thử lại"
}
```

### 5.2 UploadDeliveryScheduleModal

```json
{
  "deliverySchedule.upload.modal.title": "Upload Lịch đi hàng",
  "deliverySchedule.upload.modal.fileLabel": "File Excel",
  "deliverySchedule.upload.modal.dropzone": "Chọn hoặc kéo thả file .xlsx",
  "deliverySchedule.upload.modal.remove": "Xóa",
  "deliverySchedule.upload.modal.dateRange": "Khoảng thời gian",
  "deliverySchedule.upload.modal.fromDate": "From Date:",
  "deliverySchedule.upload.modal.toDate": "To Date:",
  "deliverySchedule.upload.modal.fromDatePlaceholder": "Chọn ngày bắt đầu",
  "deliverySchedule.upload.modal.toDatePlaceholder": "Chọn ngày kết thúc",
  "deliverySchedule.upload.modal.cancel": "Hủy",
  "deliverySchedule.upload.modal.submit": "Upload",
  "deliverySchedule.upload.modal.submitting": "Đang upload...",
  "deliverySchedule.upload.modal.retry": "Thử lại",
  "deliverySchedule.upload.modal.reupload": "Upload lại",
  "deliverySchedule.upload.error.title": "Có lỗi trong dữ liệu ({count} lỗi):",
  "deliverySchedule.upload.validation.fileRequired": "Vui lòng chọn file Excel",
  "deliverySchedule.upload.validation.fileType": "Chỉ chấp nhận file .xlsx",
  "deliverySchedule.upload.validation.fileSize": "File quá lớn (tối đa 10MB)",
  "deliverySchedule.upload.validation.fromDateRequired": "Vui lòng chọn ngày bắt đầu",
  "deliverySchedule.upload.validation.toDateRequired": "Vui lòng chọn ngày kết thúc",
  "deliverySchedule.upload.validation.dateRange": "To Date phải >= From Date",
  "deliverySchedule.upload.success": "Upload thành công: {count} chuyến xe từ {fromDate} đến {toDate}",
  "deliverySchedule.upload.warning.noData": "Không có dữ liệu nào trong khoảng thời gian đã chọn ({fromDate} - {toDate})",
  "deliverySchedule.upload.error.network": "Upload thất bại: {message}. Vui lòng thử lại."
}
```

---

## 6. Responsive Design

### 6.1 Desktop (>= 1024px)
- Table: 7 columns hiển thị đầy đủ
- Modal width: 600px
- Filter bar: inline (From Date, To Date, Search cùng hàng)

### 6.2 Tablet (768px - 1023px)
- Table: scroll horizontal
- Modal width: 90vw
- Filter bar: inline

### 6.3 Mobile (< 768px)
- Table: scroll horizontal, sticky first column (Ngày)
- Modal width: 95vw
- Filter bar: stack vertical (From Date, To Date, Search khác hàng)
- Upload button text: "Upload" (không có icon text)

---

## 7. Accessibility

- All form inputs có label với `htmlFor`
- Error messages có `aria-live="polite"`
- Modal có `role="dialog"` và `aria-labelledby`
- Upload button disabled state có `aria-disabled="true"`
- Dropzone có keyboard navigation (Tab → Enter to open file picker)
- Date pickers accessible (keyboard navigable)

---

## 8. Performance

- Debounce search input: 500ms
- Table pagination: 50 rows default (options: 20, 50, 100)
- File upload: multipart/form-data, max 10MB
- React Query cache: 5 minutes staleTime
- Skeleton rows: 6 rows (match typical viewport)

---

## 9. Web Design Guidelines Compliance

### ✅ Đã tuân thủ:

1. **Loading states:** Skeleton cho table, spinner cho upload button
2. **Empty states:** Message + CTA (Upload button) nếu có permission
3. **Error states:** Error message + Retry button cho table, error list cho modal
4. **Success feedback:** Toast message với số lượng rows inserted
5. **Confirm dialog:** Không cần (upload là additive action, có thể undo bằng cách xóa)
6. **Disable submit:** Upload button disabled khi đang loading, inputs disabled
7. **Validation inline:** Client-side validation hiển thị ngay dưới field
8. **i18n:** Không có text hardcode, tất cả dùng i18n keys
9. **Permission check:** Upload button chỉ hiện với transport.manage
10. **Responsive:** Layout adapt theo breakpoints

---

## 10. Implementation Notes

### 10.1 File Upload Technical Details

- Sử dụng `react-dropzone` cho drag & drop UX
- Accept: `{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }`
- Max size: 10MB (10 * 1024 * 1024 bytes)
- FormData format:
  ```typescript
  const formData = new FormData();
  formData.append('file', file);
  formData.append('from_date', dayjs(fromDate).format('YYYY-MM-DD'));
  formData.append('to_date', dayjs(toDate).format('YYYY-MM-DD'));
  ```

### 10.2 Date Handling

- Sử dụng `dayjs` cho date manipulation
- Date format: YYYY-MM-DD cho API, DD/MM/YYYY cho display
- Default date range: Last 30 days đến hôm nay

### 10.3 Error Handling Strategy

- Client validation → inline error text
- Backend fail-fast → error section in modal (không đóng modal)
- Network error → toast error (modal vẫn mở)
- Success → toast success (modal đóng, table reload)

---

**Kết luận:**
UI Spec đã cover đủ 5 states bắt buộc (loading, empty, error, success, submitting), validation UX (inline + toast), i18n keys, và responsive design. Frontend team có thể implement theo spec này mà không cần đoán UX.
