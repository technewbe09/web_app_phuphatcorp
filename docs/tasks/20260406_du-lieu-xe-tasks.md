# Task List: Dữ liệu xe (Vehicle Master Data)

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_du-lieu-xe-analysis.md
**UI Spec:** docs/ui/20260406_du-lieu-xe-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Tạo migration | `005_create_vehicles.sql` — table `vehicles`: id, bien_so VARCHAR(50) NOT NULL, loai VARCHAR(50) NOT NULL, tai_xe JSONB DEFAULT '[]', status VARCHAR(20) DEFAULT 'active', start_date TIMESTAMP DEFAULT NOW(), end_date TIMESTAMP, created_at, updated_at. 3 indexes: bien_so, status, bien_so+status | S |
| BE-02 | Viết service | `vehicleService.ts` — interface Vehicle + CreateVehicleData, methods: list(), findActiveByBienSo(), findById(), create(), softUpdate(), softDelete(), uploadMany() | M |
| BE-03 | Tạo controller + route | `vehicleController.ts` — schemas + handlers (list, create, update, remove, upload); `routes/vehicles.ts` — router with authenticateToken | S |
| BE-04 | Đăng ký route | `routes/index.ts` — thêm `router.use('/vehicles', vehicleRoutes)` | S |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | API + React Query hook | `api/vehicleApi.ts` (Vehicle interface: id, bien_so, loai, tai_xe: string[], status, start_date, end_date, created_at, updated_at; CreateVehicleRequest; UploadVehicleRow); `hooks/useVehicles.ts` (useGetVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useUploadVehicles) | — | S |
| FE-02 | VehicleFormModal | `components/vehicle-data/VehicleFormModal.tsx` — fields: Biển số (text, required, max 50), Loại (select 3 options), Tài xế (dynamic tag-list: input + Thêm button + remove tags). React Hook Form + Yup. Handles 409 inline error on Biển số | Screen 2 | M |
| FE-03 | VehicleUploadModal | `components/vehicle-data/VehicleUploadModal.tsx` — drag & drop .xlsx, generate template (header: Biển số / Loại / Tài xế), parse Tài xế column as comma-split array, error table on 422. Pattern identical to TripCodeUploadModal | Screen 3 | M |
| FE-04 | VehiclePage | `pages/admin/vehicle-data/VehiclePage.tsx` — table: Biển số (bold), Loại (badge), Tài xế (comma-joined, truncate + tooltip), Start Date. Loading skeleton, empty state, error state, client-side search by Biển số, inline toast, delete confirm dialog | Screen 1, 4 | M |
| FE-05 | Routing + Sidebar | `Router.tsx`: add route `/vehicle-data/vehicles` → VehiclePage. `MainLayout.tsx`: add `{ to: '/vehicle-data/vehicles', icon: Car, label: t('vehicleData.vehicles') }` to vehicleDataSubItems. `i18n/vi.json` + `en.json`: add key `vehicleData.vehicles` | Section 3 | S |

## 📊 Thứ tự thực hiện

```
Phase 3: BE-01 → BE-02 → BE-03 → BE-04
Phase 4: Run migration (005_create_vehicles.sql)
Phase 5: Viết tests
Phase 6: Chạy tests
Phase 7: FE-01 → FE-02 → FE-03 → FE-04 → FE-05
Phase 8: QA đối chiếu UI Spec
```

## ⚠️ Lưu ý kỹ thuật

- `tai_xe` là JSONB array — FE gửi `string[]`, BE store as-is với `JSON.stringify` nếu dùng pg thường (pg tự xử lý JSONB nếu pass JS array)
- Soft update + soft delete: cùng pattern với tripCodeService (transaction cho softUpdate)
- Biển số unique enforcement: service layer only, không có DB UNIQUE constraint
- Excel template: cột Tài xế là comma-separated (FE split → array khi parse)
- Migration filename: `005_create_vehicles.sql` (sau 004_roles_permissions.sql)
- `Car` icon đã được import sẵn trong MainLayout — không cần import mới
- Pattern của VehiclePage và modals: clone từ TripCode equivalents, thay đổi field names
