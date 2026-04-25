# Task List: Danh sách khách nhận hàng (Customers)

**Ngày:** 2026-04-21
**BA Doc:** docs/ba/20260421_customers-analysis.md
**UI Spec:** docs/ui/20260421_customers-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Tạo migration | `012_create_customers.sql` — bảng customers (diem_tra_hang, ten_khach_hang, tuyen_phuong, tuyen_cu, dia_chi_giao_hang, boc_xep BOOLEAN, status, timestamps) + trigger updated_at | S |
| BE-02 | Viết service | `customerService.ts` — list, findById, findActiveByDiemTraHang, create, update, softDelete, uploadMany (fail-fast) | M |
| BE-03 | Tạo controller + route | `customerController.ts` + `customers.ts` — 5 endpoints: GET /, POST /, PUT /:id, DELETE /:id, POST /upload | S |
| BE-04 | Validation | express-validator schemas trong controller — create/update/delete/upload | S |
| BE-05 | Register route | Thêm `/customers` vào `backend/src/routes/index.ts` | XS |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | API module | `frontend/src/api/customersApi.ts` — Customer interface + listCustomers, createCustomer, updateCustomer, deleteCustomer, uploadCustomers | — | S |
| FE-02 | React Query hook | `frontend/src/hooks/useCustomers.ts` — useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useUploadCustomers | — | S |
| FE-03 | CustomersPage | `frontend/src/pages/admin/accounting-data/CustomersPage.tsx` — table + search + filter + action buttons | Screen 1 | M |
| FE-04 | CreateCustomerModal | `frontend/src/components/admin/CreateCustomerModal.tsx` — form modal | Screen 2 | S |
| FE-05 | EditCustomerModal | `frontend/src/components/admin/EditCustomerModal.tsx` — form modal pre-filled | Screen 3 | S |
| FE-06 | DeleteCustomerDialog | `frontend/src/components/admin/DeleteCustomerDialog.tsx` — confirm dialog | Screen 4 | XS |
| FE-07 | UploadCustomersModal | `frontend/src/components/admin/UploadCustomersModal.tsx` — step wizard: chọn file → preview → upload → result | Screen 5 | M |
| FE-08 | Router + Sidebar | Thêm route `/accounting-data/customers` vào Router.tsx + menu item vào MainLayout.tsx | — | S |
| FE-09 | i18n keys | Thêm key `customers.*` vào `vi.json` và `en.json` | Section 5 | S |

## 📊 Thứ tự thực hiện

Phase 3: BE-01 → BE-02 → BE-03 → BE-04 → BE-05
Phase 4: Run migration
Phase 5: Viết tests cho customerService
Phase 6: Chạy tests
Phase 7: FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07 → FE-08 → FE-09
Phase 8: QA

## ⚠️ Lưu ý kỹ thuật

- Migration số 012 (tiếp theo sau 011_add_loai_to_delivery_schedules.sql)
- Permissions `accounting_data.view` / `accounting_data.manage` đã tồn tại trong DB (từ migration 009) — KHÔNG insert lại
- uploadMany: check duplicate trong file trước (inFileErrors), rồi check DB (dbErrors) — giống weightAdjustmentService pattern
- Update không dùng soft-update/versioning — UPDATE trực tiếp row (khác với weightAdjustments)
- boc_xep: BOOLEAN DEFAULT TRUE — "Không" trong Excel = false, rỗng/khác = true
- FE parse Excel: cột trống (col index 3) bỏ qua; boc_xep = row[6] === 'Không' ? false : true
- Filter search realtime phía client (không gọi API thêm)
- Tuyến dropdown lấy từ data hiện có (unique values từ tuyen_phuong)
