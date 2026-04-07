# Test Cases: Dữ liệu xe (Vehicle Master Data)

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_du-lieu-xe-analysis.md

---

## 1. Unit Tests — vehicleService

### 1.1 list()
- **TC-01:** Returns only active vehicles ordered by start_date DESC
- **TC-02:** Returns empty array when no active vehicles

### 1.2 create()
- **TC-03:** Creates vehicle with required fields only (bien_so, loai) → tai_xe defaults to []
- **TC-04:** Creates vehicle with tai_xe array populated
- **TC-05:** Throws DUPLICATE_BIEN_SO when bien_so already exists (active)
- **TC-06:** Allows same bien_so if existing is deactive (history row)
- **TC-07:** Throws INVALID_LOAI for invalid loai value
- **TC-08:** All three valid loai values accepted: 'Xe lớn', 'Xe nhỏ', 'Xe trung chuyển'

### 1.3 softUpdate()
- **TC-09:** Deactivates old row and creates new row in transaction
- **TC-10:** New row has same data as submitted, not original
- **TC-11:** Throws NOT_FOUND for non-existent id
- **TC-12:** Throws NOT_FOUND for already-deactive id
- **TC-13:** Throws DUPLICATE_BIEN_SO if new bien_so conflicts with another active row
- **TC-14:** Does NOT throw DUPLICATE_BIEN_SO if bien_so unchanged (updating same vehicle)

### 1.4 softDelete()
- **TC-15:** Sets status=deactive and end_date=now for active vehicle
- **TC-16:** Throws NOT_FOUND for non-existent id
- **TC-17:** Throws NOT_FOUND for already-deactive vehicle

### 1.5 uploadMany()
- **TC-18:** Inserts all rows when no duplicates
- **TC-19:** Fails with UPLOAD_ERRORS (no insert) when in-file duplicate bien_so detected
- **TC-20:** Fails with UPLOAD_ERRORS when bien_so already exists in DB
- **TC-21:** Fails with UPLOAD_ERRORS when loai value is invalid
- **TC-22:** Both in-file AND DB errors reported together (all-or-nothing)
- **TC-23:** tai_xe defaults to [] when not provided in upload row

---

## 2. Integration Tests — API routes

### GET /api/vehicles
- **TC-24:** Returns 200 with array of active vehicles
- **TC-25:** Returns 401 without auth token

### POST /api/vehicles
- **TC-26:** Returns 201 with created vehicle on valid input
- **TC-27:** Returns 400 on missing bien_so
- **TC-28:** Returns 400 on missing loai
- **TC-29:** Returns 400 on invalid loai value
- **TC-30:** Returns 409 on duplicate bien_so

### PUT /api/vehicles/:id
- **TC-31:** Returns 200 with newVehicle on valid update
- **TC-32:** Returns 404 for unknown id
- **TC-33:** Returns 409 on duplicate bien_so conflict

### DELETE /api/vehicles/:id
- **TC-34:** Returns 200 on successful soft-delete
- **TC-35:** Returns 404 for unknown id

### POST /api/vehicles/upload
- **TC-36:** Returns 200 with { inserted: N } on valid rows
- **TC-37:** Returns 422 with error list on duplicate/invalid rows
- **TC-38:** Returns 400 on empty rows array

---

## 3. Frontend Unit Tests

### useVehicles hook
- **TC-39:** useGetVehicles fetches and returns vehicle array
- **TC-40:** useCreateVehicle invalidates 'vehicles' query on success
- **TC-41:** useDeleteVehicle invalidates 'vehicles' query on success

### VehicleFormModal
- **TC-42:** Shows Biển số required error when submitted empty
- **TC-43:** Shows Loại required error when submitted empty
- **TC-44:** Adds driver to list when + Thêm clicked
- **TC-45:** Removes driver from list when × clicked
- **TC-46:** Pre-fills fields in edit mode

### VehiclePage
- **TC-47:** Shows skeleton while loading
- **TC-48:** Shows empty state when no vehicles
- **TC-49:** Shows error state with retry button on fetch error
- **TC-50:** Filters table by Biển số search text (client-side)
