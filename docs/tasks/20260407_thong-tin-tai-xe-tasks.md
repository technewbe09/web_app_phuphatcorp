# Task List: Thông tin tài xế (Driver Master Data)
**Ngày:** 2026-04-07
**BA Doc:** docs/ba/20260407_thong-tin-tai-xe-analysis.md
**UI Spec:** docs/ui/20260407_thong-tin-tai-xe-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Tạo migration | File `006_create_drivers.sql`: CREATE TABLE drivers (id SERIAL PK, ten_ky_hieu VARCHAR(100) NOT NULL UNIQUE, ho_ten VARCHAR(255), lien_he VARCHAR(100), cccd VARCHAR(50), ghi_chu TEXT, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()); CREATE TABLE driver_documents (id SERIAL PK, driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE, file_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100), file_data TEXT NOT NULL, file_size INTEGER, created_at TIMESTAMP DEFAULT NOW()); + Indexes | S |
| BE-02 | Viết service | `backend/src/services/driverService.ts`: interfaces Driver + DriverDocument + CreateDriverData; methods: list() → active only ORDER BY ten_ky_hieu; findById(id); findByTenKyHieu(ten_ky_hieu); create(data); update(id, data); softDelete(id) → UPDATE SET status='deactive'; getDocuments(driverId) → no file_data; uploadDocument(driverId, doc) → INSERT; deleteDocument(driverId, docId) → DELETE; downloadDocument(driverId, docId) → with file_data | M |
| BE-03 | Tạo controller | `backend/src/controllers/driverController.ts`: 8 handlers — list, create, update, remove, getDocuments, uploadDocument, deleteDocument, downloadDocument. Validation với express-validator (NOT Zod). Error codes: DUPLICATE_TEN_KY_HIEU→409, NOT_FOUND→404, FILE_TOO_LARGE→400 (file_size > 5*1024*1024). Document upload validate file_size (max 5MB). | M |
| BE-04 | Tạo API route | `backend/src/routes/drivers.ts`: router.use(authenticateToken); GET /; POST /; PUT /:id; DELETE /:id; GET /:id/documents; POST /:id/documents; DELETE /:id/documents/:docId; GET /:id/documents/:docId. Đăng ký trong `routes/index.ts`: router.use('/drivers', driverRoutes) | S |

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | API layer | `frontend/src/api/driverApi.ts`: interfaces Driver, DriverDocument, DriverDocumentMeta, CreateDriverRequest, UploadDocumentRequest; methods: fetchDrivers, createDriver, updateDriver, deleteDriver, getDocuments, uploadDocument, deleteDocument, downloadDocument | — | S |
| FE-02 | React Query hooks | `frontend/src/hooks/useDrivers.ts`: useGetDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver — invalidate ['drivers']. `frontend/src/hooks/useDriverDocuments.ts`: useGetDriverDocuments(driverId), useUploadDocument, useDeleteDocument — invalidate ['driver-documents', driverId] | — | S |
| FE-03 | DriverPage | `frontend/src/pages/admin/vehicle-data/DriverPage.tsx`: table columns (Tên ký hiệu bold, Họ tên, Liên hệ, CCCD, Ghi chú truncate+tooltip, Thao tác: edit+docs+delete icons); client-side search by ten_ky_hieu/ho_ten; loading skeleton, empty state, error state; toast system; delete confirm dialog (với note về tài liệu bị xóa) | Screen 1, Screen 4 | M |
| FE-04 | DriverFormModal | `frontend/src/components/vehicle-data/DriverFormModal.tsx`: fields ten_ky_hieu (required), ho_ten, lien_he, cccd, ghi_chu (textarea); edit mode: amber warning banner dưới ten_ky_hieu; Yup validation; 409 → inline error; size max-w-md | Screen 2 | M |
| FE-05 | DriverDocumentsModal | `frontend/src/components/vehicle-data/DriverDocumentsModal.tsx`: fetch docs on open; table (file_name, formatFileSize, formatDate, download icon, delete icon); upload button → hidden file input → FileReader → base64 → POST; FE validate 5MB trước khi upload; download: decode base64 → Blob → URL.createObjectURL → trigger <a> download; delete: inline (no separate dialog), disable icon while deleting; size max-w-lg | Screen 3 | L |
| FE-06 | Update VehicleFormModal | `frontend/src/components/vehicle-data/VehicleFormModal.tsx`: đổi tai_xe field từ free-text + "+ Thêm" button thành searchable multi-select dropdown. Load active drivers via useGetDrivers(). Dropdown hiển thị "{ten_ky_hieu} — {ho_ten}". Selected = tags với ×. Edit mode: nếu tai_xe có driver deactivated → hiện tag với suffix " (đã xóa)". Fallback khi load fail: warning + retry + free-text mode. Empty drivers state: link tới /vehicle-data/drivers | Screen 5 | M |
| FE-07 | Sidebar + Router | MainLayout.tsx: thêm `{ to: '/vehicle-data/drivers', icon: Users, label: t('vehicleData.drivers') }` vào vehicleDataSubItems. Router.tsx: thêm `<Route path="/vehicle-data/drivers" element={<DriverPage />} />` | — | S |
| FE-08 | i18n keys | vi.json + en.json: thêm keys theo Section 5 của UI Spec (drivers.*, vehicleForm.driversLoadError, vehicleForm.driversEmpty, vehicleForm.driversDeactivated) | Section 5 | S |

---

## 📊 Thứ tự thực hiện

**Phase 3 (Backend):** BE-01 → BE-02 → BE-03 → BE-04
**Phase 4:** Run migration 006_create_drivers.sql
**Phase 5:** Viết tests cho service + API
**Phase 6:** Chạy tests
**Phase 7 (Frontend):** FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07 → FE-08
**Phase 8:** QA đối chiếu UI Spec

---

## ⚠️ Lưu ý kỹ thuật

- Migration là `006_create_drivers.sql` (005 đã dùng bởi vehicles)
- Dùng **express-validator** (không phải Zod/Yup) cho BE validation — xem vehicleController.ts làm template
- `driver_documents.file_data` là TEXT (base64), max 5MB validated ở cả FE lẫn BE (file_size > 5*1024*1024 byte gốc)
- `GET /api/drivers/:id/documents` KHÔNG trả `file_data` (metadata only — tránh payload lớn)
- `GET /api/drivers/:id/documents/:docId` trả đầy đủ bao gồm `file_data` (cho download)
- `vehicles.tai_xe` vẫn lưu `string[]` — chỉ UI VehicleFormModal thay đổi, không cần migration vehicles
- `ten_ky_hieu` UNIQUE constraint ở DB level (khác `bien_so` unique ở service layer)
- VehicleFormModal fallback khi drivers load fail: giữ nguyên behavior cũ (free-text + Thêm) để không break existing users
- Download doc ở FE: dùng `URL.createObjectURL(new Blob([atob(file_data)], { type: mime_type }))` + `<a>` click
- useGetDrivers cần accessible từ cả DriverPage lẫn VehicleFormModal — đặt tại `hooks/useDrivers.ts`
