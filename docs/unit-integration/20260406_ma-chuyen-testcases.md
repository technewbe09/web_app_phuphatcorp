# Test Cases — Mã chuyến (trip_codes)

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_ma-chuyen-analysis.md

---

## 1. Service Layer Tests — tripCodeService

### 1.1 `create()`
- **TC-01:** Tạo mới với đầy đủ trường bắt buộc → INSERT thành công, trả row với status='active', start_date set
- **TC-02:** Tạo với Mã đã tồn tại (active) → throw `{ code: 'DUPLICATE_MA' }`
- **TC-03:** Tạo với Mã là lowercase, đã có uppercase trong DB → không conflict (case-sensitive)
- **TC-04:** Tạo với so_tien = null → OK
- **TC-05:** Tạo với so_tien = 0 → OK
- **TC-06:** Tạo với so_tien âm → thất bại ở validation layer (API test)

### 1.2 `softUpdate()`
- **TC-07:** Update row active → row cũ status='deactive' + end_date set; row mới status='active'
- **TC-08:** Update row đã deactive (id không active) → throw `{ code: 'NOT_FOUND' }`
- **TC-09:** Update đổi Mã sang Mã đã tồn tại ở row active khác → throw `{ code: 'DUPLICATE_MA' }`
- **TC-10:** Update giữ nguyên Mã (không đổi) → OK (không bị báo duplicate)
- **TC-11:** Update với id không tồn tại → throw `{ code: 'NOT_FOUND' }`
- **TC-12:** Transaction rollback nếu INSERT row mới fail → row cũ vẫn active

### 1.3 `softDelete()`
- **TC-13:** Delete row active → status='deactive', end_date set
- **TC-14:** Delete row đã deactive → throw `{ code: 'NOT_FOUND' }`
- **TC-15:** Delete row id không tồn tại → throw `{ code: 'NOT_FOUND' }`

### 1.4 `uploadMany()`
- **TC-16:** Upload 3 rows hợp lệ, không trùng → INSERT 3 rows thành công
- **TC-17:** Upload có 1 row trùng Mã với DB → throw `{ code: 'UPLOAD_ERRORS', errors: [...] }`
- **TC-18:** Upload có 2 rows trong file cùng Mã → throw UPLOAD_ERRORS
- **TC-19:** Upload 0 rows → thất bại validation (API test)
- **TC-20:** Upload có lỗi → không insert bất kỳ dòng nào (all-or-nothing)
- **TC-21:** Duplicate Mã case-sensitive: "MC01" vs "mc01" → cả hai được insert (không conflict)

---

## 2. API Integration Tests — /api/trip-codes

### 2.1 GET /api/trip-codes
- **TC-22:** Không có token → 401
- **TC-23:** Token hợp lệ → 200 + array (chỉ active rows)
- **TC-24:** Có deactive rows trong DB → không trả về trong response

### 2.2 POST /api/trip-codes
- **TC-25:** Không có token → 401
- **TC-26:** Thiếu `ma` → 400 validation error
- **TC-27:** Thiếu `tuyen` → 400 validation error
- **TC-28:** Tạo hợp lệ → 201 + data
- **TC-29:** Mã trùng → 409 "Mã '[ma]' đã tồn tại"
- **TC-30:** `so_tien` âm → 400 validation error
- **TC-31:** `ma` dài hơn 100 ký tự → 400 validation error

### 2.3 PUT /api/trip-codes/:id
- **TC-32:** Không có token → 401
- **TC-33:** id không tồn tại → 404
- **TC-34:** Update hợp lệ → 200 + newRow
- **TC-35:** Đổi Mã sang Mã trùng → 409
- **TC-36:** id không phải số → 400

### 2.4 DELETE /api/trip-codes/:id
- **TC-37:** Không có token → 401
- **TC-38:** id không tồn tại → 404
- **TC-39:** Delete hợp lệ → 200 "Đã xóa mã chuyến"
- **TC-40:** Delete đã deactive → 404

### 2.5 POST /api/trip-codes/upload
- **TC-41:** Không có token → 401
- **TC-42:** rows rỗng → 400 validation error
- **TC-43:** Upload hợp lệ → 200 + inserted count
- **TC-44:** Có Mã trùng trong file → 422 + errors array
- **TC-45:** Có Mã trùng với DB → 422 + errors array

---

## 3. Manual QA Checklist

### Frontend — TripCodePage
- [ ] Trang load, hiển thị skeleton khi fetching
- [ ] Empty state hiển thị khi chưa có dữ liệu
- [ ] Error state + nút Thử lại khi API fail
- [ ] Table hiển thị đúng 7 cột: Mã, Tuyến, Số tiền, Bốc xếp, Ghi chú, Start Date, Thao tác
- [ ] Số tiền format VND (formatCurrency)
- [ ] Start Date format datetime (formatDateTime)
- [ ] Search bar filter theo Mã hoặc Tuyến (client-side)

### Frontend — TripCodeFormModal (Create)
- [ ] Mở khi click "Tạo mới"
- [ ] Validation inline khi submit thiếu Mã hoặc Tuyến
- [ ] Submit disabled khi đang loading
- [ ] Toast "Tạo mã chuyến thành công!" sau khi tạo thành công
- [ ] Modal đóng sau success
- [ ] Table refresh sau khi tạo thành công
- [ ] 409 error hiển thị inline dưới field Mã

### Frontend — TripCodeFormModal (Edit)
- [ ] Mở với data đã điền khi click icon Edit
- [ ] Validation hoạt động
- [ ] Toast "Cập nhật mã chuyến thành công!" sau success
- [ ] Table refresh sau khi update

### Frontend — TripCodeUploadModal
- [ ] Drag & drop hoặc click chọn file
- [ ] Chỉ accept .xlsx
- [ ] Upload button disabled khi không có file
- [ ] Loading khi đang upload
- [ ] Toast success sau upload thành công
- [ ] Bảng lỗi hiển thị khi có duplicate

### Frontend — Delete
- [ ] Confirm dialog hiện trước khi delete
- [ ] Toast "Đã xóa mã chuyến!" sau delete thành công
- [ ] Row biến mất khỏi table sau khi delete

### Frontend — Sidebar
- [ ] Menu "Quản lý dữ liệu xe" hiển thị trong sidebar
- [ ] Có thể expand/collapse
- [ ] Sub-item "Mã chuyến" link đến /vehicle-data/trip-codes
- [ ] Active state hiển thị đúng khi trên trang
