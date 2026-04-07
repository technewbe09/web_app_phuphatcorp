# Task List: Bảng điều phối xe

**Ngày:** 2026-04-07
**BA Doc:** docs/ba/20260407_bang-dieu-phoi-xe-analysis.md
**UI Spec:** docs/ui/20260407_bang-dieu-phoi-xe-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID    | Task | Chi tiết kỹ thuật | Effort |
|-------|------|-------------------|--------|
| BE-01 | Tạo migration | File `006_create_dispatch_schedules.sql`: table `dispatch_schedules` (id, ngay DATE, loai_xe CHECK, xe_type CHECK, bien_so VARCHAR(50) NOT NULL, tai_xe TEXT, ma_chuyen VARCHAR(100), diem_nhan TEXT NOT NULL, diem_tra TEXT NOT NULL, gio_nhan TIME NOT NULL, ghi_chu TEXT, vehicle_id FK nullable, trip_code_id FK nullable, created_by FK nullable, created_at, updated_at) + 2 indexes | S |
| BE-02 | Viết service | `src/services/dispatchScheduleService.ts`: interface `DispatchSchedule`, `CreateDispatchScheduleData`, methods: `listByDate(date: string)` → `{xe_nho, xe_lon}`, `create(data, userId)`, `remove(id)` | M |
| BE-03 | Tạo controller + validation | `src/controllers/dispatchScheduleController.ts`: validation schemas (listQuerySchema, createSchema, deleteSchema), controller methods (list, create, remove) | M |
| BE-04 | Tạo route + đăng ký | `src/routes/dispatchSchedules.ts`: GET /?date=, POST /, DELETE /:id (tất cả require `authenticateToken`). Đăng ký vào `src/routes/index.ts` với `/dispatch-schedules` | S |

## 🎨 FRONTEND TASKS

| ID    | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|-------|------|-------------------|-------------|--------|
| FE-01 | API client | `src/api/dispatchApi.ts`: `DispatchSchedule` type, `DispatchScheduleListResponse` type, `dispatchApi.fetchByDate(date)`, `dispatchApi.create(data)`, `dispatchApi.remove(id)` | — | S |
| FE-02 | React Query hooks | `src/hooks/useDispatchSchedules.ts`: `useDispatchSchedules(date: string)` (useQuery, queryKey ['dispatch-schedules', date]), `useCreateDispatchSchedule()` (useMutation, invalidate ['dispatch-schedules']), `useDeleteDispatchSchedule()` (useMutation, invalidate) | — | S |
| FE-03 | Page | `src/pages/dispatch/SchedulePage.tsx`: header với date input (default today) + nút "Tạo chuyến", grid 2 cột (lg+) / 1 cột (mobile), render `<ScheduleTable>` ×2 | Screen 1 | M |
| FE-04 | Component ScheduleTable | `src/components/dispatch/ScheduleTable.tsx`: props (title, data, isLoading, onDelete), states: loading (skeleton 3 rows), empty (message + sub-text), data (rows with hover delete icon) | Screen 1 | M |
| FE-05 | Component CreateScheduleModal | `src/components/dispatch/CreateScheduleModal.tsx`: 3-step wizard (xe_type → loai_xe → form), step 3 dùng `useGetVehicles()` filtered + `useTripCodes()`, Biển số là select (Xe nhà) / input (Xe ngoài), Tài xế tự điền từ vehicle.tai_xe[0] khi chọn xe | Screen Modal 1 | L |
| FE-06 | Router + route | Thêm `import { SchedulePage }` và `<Route path="/dispatch/schedule" element={<SchedulePage />} />` vào `src/Router.tsx` | — | S |
| FE-07 | Sidebar group | Thêm nhóm "Điều hành vận tải" collapsible vào `MainLayout.tsx`: state `dispatchOpen`, routes `DISPATCH_ROUTES = ['/dispatch']`, sub-item `{ to: '/dispatch/schedule', icon: CalendarDays, label: t('dispatch.menuTitle') }` wait — sub-item là "Bảng điều phối xe". Group icon dùng `Truck` hoặc `MapPin` | — | S |
| FE-08 | i18n keys | Thêm `"dispatch": { ... }` vào cả `vi.json` và `en.json` theo UI Spec Section 5 | Section 5 | S |

## 📊 Thứ tự thực hiện

```
Phase 3 (BE): BE-01 → BE-02 → BE-03 → BE-04
Phase 4: npm run migrate
Phase 5: Viết tests cho dispatchScheduleService + API routes
Phase 6: Chạy tests
Phase 7 (FE): FE-08 → FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07
Phase 8: QA đối chiếu UI Spec
```

## ⚠️ Lưu ý kỹ thuật

1. **Lưu value không lưu ID (BR-001):** `bien_so`, `tai_xe`, `ma_chuyen` là text columns. Khi user chọn xe từ dropdown → lấy `vehicle.bien_so` (string), không lấy `vehicle.id` (number) để lưu.

2. **Migration số thứ tự:** Hiện có `005_create_vehicles.sql`, file mới là `006_create_dispatch_schedules.sql`. Lưu ý có 2 file `004_*` (naming conflict đã tồn tại — không sửa, chỉ tạo `006`).

3. **vehicle_id nullable reference:** Khi chọn biển số từ dropdown (Xe nhà), lưu cả `bien_so` (text) VÀ `vehicle_id` (FK). Khi nhập tay (Xe ngoài), `vehicle_id = null`. Điều này giúp trace back nếu cần nhưng không bắt buộc.

4. **tai_xe từ vehicle:** `vehicles.tai_xe` là `JSONB array` (e.g. `["Nguyễn Văn A", "Trần B"]`). Lấy `tai_xe[0]` — nếu array rỗng thì field rỗng.

5. **Reuse hooks có sẵn:** `useGetVehicles()` từ `useVehicles.ts` và `useTripCodes()` từ `useTripCodes.ts` — import thẳng, không tạo mới.

6. **date query param format:** Backend nhận `date=YYYY-MM-DD`. Frontend gửi `new Date().toISOString().split('T')[0]` làm default.

7. **Sort:** Backend đã sort `gio_nhan ASC` trước khi trả về — FE không cần sort lại.

8. **FE-07 MainLayout:** Thêm state `dispatchOpen` và constant `DISPATCH_ROUTES = ['/dispatch']`. Dùng lại `renderSubGroup()` function đã có. Icon cho group: `Clipboard` hoặc `CalendarRange` từ lucide-react.
