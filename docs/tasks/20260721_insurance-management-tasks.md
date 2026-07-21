# Task List: Quản lý bảo hiểm (Vehicle Insurance Management)
**Ngày:** 2026-07-21
**BA Doc:** docs/ba/20260721_insurance-management-analysis.md
**UI Spec:** docs/ui/20260721_insurance-management-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration `034_vehicle_insurance.sql` | Tạo 2 bảng: `insurance_records` (id SERIAL PK, vehicle_id FK→vehicles, purchase_date DATE NOT NULL, expiry_date DATE NOT NULL, notes TEXT, status VARCHAR(20) CHECK IN ('active','expired','superseded','deleted'), created_by FK→users, created_at, updated_at + trigger) và `insurance_images` (id SERIAL PK, insurance_id FK→insurance_records ON DELETE CASCADE, filename, original_filename, file_path, file_size, mime_type, created_at). Thêm 3 indexes. | M |
| BE-02 | Viết `insuranceService.ts` | 10 methods: `listAll(vehicle_id?, status?, search?, page?, limit?)` — phân trang + filter (active/expiring/expired), search theo plate_number; `getById(id)` — JOIN vehicles lấy plate_number/driver_name + images; `create(input, userId)` — TRANSACTION: nếu có active cũ → check expiry mới > expiry cũ (BR-08), nếu không → ValidationError; nếu OK → supersede cũ → INSERT mới; `update(id, input)` — dynamic field update; `softDelete(id)` — status='deleted'; `getExpiring(days)` — sắp hết hạn; `addImage(id, file)` — upload MinIO + insert; `deleteImage(imageId)` — xóa MinIO + DB; `getImages(id)`; `getVehicleSummary(search?, status?, page?, limit?)` — CTE lấy latest insurance per vehicle + count | L |
| BE-03 | Viết `insuranceController.ts` + validation | express-validator schemas: `insuranceCreateSchema` (vehicle_id int≥1, purchase_date ISO8601 required, expiry_date ISO8601 required, expiry > purchase custom check, notes optional), `insuranceUpdateSchema` (param id, body optional fields), `insuranceDeleteSchema` (param id), `insuranceImageDeleteSchema` (params id + imageId). Handlers: `list`, `getById`, `create` (201, audit log), `update`, `remove` (soft delete, audit log), `getExpiring`, `getVehicleSummary`, `uploadImage` (multer), `deleteImage`, `serveFile` (presigned redirect). Catch NOT_FOUND → 404. | M |
| BE-04 | Tạo `vehicleInsurances.ts` routes + mount | Router: BASE `/vehicle-insurances`. GET `/files/:filename` → public. Authenticated routes: GET `/` / `/summary` / `/expiring` / `/:id` → requirePermission('vehicle_data.view'). POST `/` / `PUT /:id` / `DELETE /:id` / `POST /:id/images` / `DELETE /:id/images/:imageId` → requirePermission('vehicle_data.manage'). Multer memoryStorage 50MB cho upload. Mount vào `routes/index.ts`. Thêm static serve `uploads/insurance-images` vào `app.ts`. | S |

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| FE-01 | Tạo `vehicleInsuranceApi.ts` | API client với types đầy đủ (InsuranceRecord, InsuranceImage, CreateInput, UpdateInput, ListResult, VehicleSummary). Methods: fetchAll, fetchSummary, fetchById, create, update, remove, fetchExpiring, uploadImage (multipart/form-data), deleteImage. Unwrap `response.data.data`. | S |
| FE-02 | Tạo `useVehicleInsurances.ts` | React Query hooks: `useGetInsurances(params)`, `useGetVehicleSummary(params)` — key [\'insurances\', \'summary\', params], `useGetInsurance(id)`, `useGetExpiringInsurances(days)`, `useCreateInsurance()` — invalidate ALL, `useUpdateInsurance()` — invalidate ALL, `useDeleteInsurance()` — invalidate ALL, `useUploadInsuranceImage()` — invalidate ALL, `useDeleteInsuranceImage()` — invalidate ALL. | S |
| FE-03 | Tạo `InsurancePage.tsx` | Trang `/vehicle-data/insurances`. Summary table (1 dòng/xe): STT, Biển số, Tài xế, Mua gần nhất, Ngày hết hạn, Badge trạng thái (Còn hạn green / Sắp hết hạn yellow / Hết hạn red / Chưa có gray), Số lần, Actions (Mắt view, Lịch sử, Bút edit, Xóa delete, Dấu + thêm). Search type-ahead biển số (dùng useGetVehicles). Filter dropdown: Tất cả / Còn hạn / Sắp hết hạn / Hết hạn / Chưa có bảo hiểm. Pagination 20 items. Toast system. All states: loading skeleton, empty, error+retry, empty filter. Ẩn nút thêm/sửa/xóa với VIEWER. | L |
| FE-04 | Tạo `InsuranceFormModal.tsx` | Modal max-w-lg. Props: isOpen, onClose, onSuccess, onError, insurance?, viewInsuranceId?, viewMode?, preselectedVehicleId?. 3 modes: Create (form rỗng/pre-selected xe, có upload), Edit (pre-filled, xe disabled, edit images), View (read-only, không upload, chỉ nút Đóng). Fields: vehicle select (useGetVehicles, hiển thị plate_number - driver_name), purchase_date DateInput, expiry_date DateInput, notes textarea, file upload zone (multiple, max 50MB, thumbnail preview + X delete). FE validation: vehicle required, purchase_date required, expiry_date required, expiry > purchase. API error map to inline errors. Submit disabled + spinner khi saving. | L |
| FE-05 | Tạo `InsuranceHistoryModal.tsx` | Modal max-w-3xl. Props: isOpen, onClose, vehicle, onError. Fetch all insurance records cho xe (limit 100). Table expandable: STT, Ngày mua, Ngày hết hạn, Badge trạng thái (active/expired/superseded/deleted từ DB), Ghi chú, File count. Expand hiển thị grid file (thumbnail cho ảnh, FileText icon cho khác). Link file → presigned URL. Lazy load ảnh per record. States: loading spinner, empty, error+retry. | M |
| FE-06 | Cập nhật Router + Sidebar | `Router.tsx`: thêm `<Route path="/vehicle-data/insurances" element={<InsurancePage />} />`. `MainLayout.tsx`: thêm menu item `{ to: '/vehicle-data/insurances', icon: ShieldCheck, label: 'Quản lý bảo hiểm' }` trong group "Quản lý dữ liệu xe", visibility check `vehicle_data.view` hoặc `vehicle_data.manage`. | S |
| FE-07 | Thêm i18n keys | Thêm ~40 keys vào `vi.json` và `en.json` theo UI Spec section 5. Bao gồm: page (title, empty, error, addButton, retry), status (active, expiring, expired, noInsurance, superseded, deleted), filter, table columns, form (create/edit/view titles, labels, placeholders, buttons), history, validation messages, confirm, success/error messages, sidebar. | S |

## 📊 Thứ tự thực hiện

```
Phase 3:  BE-01 → BE-02 → BE-03 → BE-04
Phase 4:  Run migration (npm run db:push hoặc chạy thủ công SQL)
Phase 5:  Viết tests (test-qa)
Phase 6:  Chạy tests (npm run test)
Phase 7:  FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07
Phase 8:  QA regression (test-qa, đối chiếu UI Spec)
Phase 9:  Update know-how.md
Phase 10: Update system-features.md
```

## Coding Standards
Đọc `.opencode/knowhow/coding_convention.md` trước khi viết bất kỳ dòng code nào.

## ⚠️ Lưu ý kỹ thuật
- **Dùng lại permission có sẵn:** `vehicle_data.view` và `vehicle_data.manage` — KHÔNG seed permission mới
- **Validation dùng express-validator** (không dùng Zod) — theo pattern của inspectionController
- **BR-08 là rule quan trọng:** Khi tạo mới, nếu xe có active record → expiry_date mới PHẢI > expiry_date cũ. Throw ValidationError với message rõ ràng (kèm ngày hết hạn hiện tại)
- **Transaction trong create:** Kiểm tra BR-08 → supersede cũ → INSERT mới → COMMIT. Nếu BR-08 fail → throw ValidationError, không cần ROLLBACK (chưa BEGIN)
- **Static serve:** Thêm `app.use('/uploads/insurance-images', ...)` vào app.ts (tham khảo inspection)
- **Không hardcode text** — mọi string dùng i18n keys (khác với inspection đang hardcode, ta sẽ làm đúng convention)
- **Icon cho sidebar:** Dùng `ShieldCheck` từ lucide-react
- **File upload path:** Dùng chung storageService (MinIO), prefix folder "insurance-images/"
- **Pagination default:** 20 items/page, giống inspection
- **Sort order:** Xe chưa có bảo hiểm lên đầu, sau đó sắp xếp theo expiry_date ASC (sắp hết hạn trước)
