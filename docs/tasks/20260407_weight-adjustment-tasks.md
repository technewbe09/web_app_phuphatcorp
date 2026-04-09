# Task List: Điều chỉnh trọng lượng
**Ngày:** 2026-04-07
**BA Doc:** docs/ba/20260407_weight-adjustment-analysis.md
**UI Spec:** docs/ui/20260407_weight-adjustment-ui-spec.md

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BE-01 | Tạo migration | `009_create_weight_adjustments.sql`: tạo bảng `weight_adjustments` (ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh, status, version, start_date, end_date, action_type, action_by FK→users, action_by_name, created_at, updated_at) + index + trigger reuse `update_updated_at_column()` + INSERT permissions (accounting_data.view/manage) + gán role_permissions (ADMIN, ACCOUNTANT: cả hai; VIEWER: chỉ view) | M |
| BE-02 | Viết service | `weightAdjustmentService.ts`: `list()` (active only, ORDER BY ma_hang ASC), `create(data, userId)` (check duplicate ma_hang, query user full_name, INSERT version=1 action_type=create), `softUpdate(id, data, userId)` (check exists+active, check ma_hang conflict, transaction: deactivate+insert version+1 action_type=update), `softDelete(id, userId)` (check exists, UPDATE status=deactive action_type=delete), `uploadMany(rows, userId)` (fail-fast: in-file + DB duplicate check, bulk INSERT action_type=upload) | M |
| BE-03 | Controller + Validation | `weightAdjustmentController.ts`: schemas (createSchema, updateSchema, deleteSchema, uploadSchema) dùng express-validator + handlers (list, create, update, remove, upload) — pattern giống tripCodeController. Upload handler trả 422 với error array khi có UPLOAD_ERRORS | M |
| BE-04 | API Route + Register | `weightAdjustments.ts`: GET / (accounting_data.view), POST / (accounting_data.manage), PUT /:id (accounting_data.manage), DELETE /:id (accounting_data.manage), POST /upload (accounting_data.manage). Register trong `routes/index.ts` dưới key `/weight-adjustments` | S |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|----|------|-------------------|-------------|--------|
| FE-01 | API + Hook | `weightAdjustmentApi.ts`: types (WeightAdjustment, CreateWeightAdjustmentRequest, UploadWeightAdjustmentRow, UploadError) + 5 methods (fetch, create, update, delete, upload). `useWeightAdjustments.ts`: useGetWeightAdjustments, useCreateWeightAdjustment, useUpdateWeightAdjustment, useDeleteWeightAdjustment, useUploadWeightAdjustments — pattern giống useTripCodes | — | S |
| FE-02 | Page | `WeightAdjustmentPage.tsx`: header (h1 + Upload Excel + Tạo mới), search card, table card với 9 columns (ma_hang, ten_hang, gia_tri_cu "—" nếu null, gia_tri_dieu_chinh, version badge "v{N}", action_type badge màu, action_by_name, start_date, thao tác). Loading/empty/error states. Delete confirm dialog inline. Buttons Sửa/Xóa chỉ hiển thị nếu có accounting_data.manage | Screen 1 | M |
| FE-03 | FormModal + UploadModal | `WeightAdjustmentFormModal.tsx`: create/edit mode, 4 fields (ma_hang required, ten_hang required, gia_tri_cu optional number>=0, gia_tri_dieu_chinh required number>=0), loading/error states. `WeightAdjustmentUploadModal.tsx`: drag-drop zone, parse Excel 4 cột (Mã hàng hóa/Tên hàng hóa/Giá trị cũ/Giá trị điều chỉnh), preview count, error table, submit — pattern giống TripCodeUploadModal | Modal 1, Modal 2 | M |
| FE-04 | i18n | `vi.json` + `en.json`: thêm `accountingData.menuTitle` / `accountingData.weightAdjustment`, toàn bộ `weightAdjustment.*` keys (theo UI Spec Section 5). Thêm `permissions.modules.accounting_data` + `permissions.permCodes.accounting_data_view/manage` | Section 5 | S |
| FE-05 | Router | `Router.tsx`: thêm route `<Route path="/accounting-data/weight-adjustments" element={<WeightAdjustmentPage />} />`, import component | — | S |
| FE-06 | Sidebar | `MainLayout.tsx`: thêm state `accountingDataOpen` (init từ `location.pathname.startsWith('/accounting-data')`), constant `ACCOUNTING_DATA_ROUTES`, subItems array với WeightAdjustmentPage route, `showAccountingData` condition (`accounting_data.view / accounting_data.manage` hoặc ADMIN), render `renderSubGroup(...)` với icon `BookOpen` (lucide) | — | S |

---

## 📊 Thứ tự thực hiện

```
Phase 3: BE-01 → BE-02 → BE-03 → BE-04
Phase 4: npm run migrate
Phase 5: Viết tests
Phase 6: Chạy tests
Phase 7: FE-01 → FE-04 → FE-05 → FE-06 → FE-02 → FE-03
Phase 8: QA đối chiếu UI Spec
```

---

## ⚠️ Lưu ý kỹ thuật

1. **Migration trigger:** `update_updated_at_column()` đã tồn tại từ migration 004, dùng `CREATE OR REPLACE` hoặc chỉ tạo trigger mới (không tạo lại function)
2. **action_by_name:** query `SELECT full_name FROM users WHERE id = $1` trong service để lưu denormalized. Cần `UserService.findById()` hoặc inline query.
3. **softUpdate version:** query version cũ từ row bị deactivate, rồi INSERT với `version = old_version + 1`
4. **Permission check FE:** dùng `hasPermission('accounting_data.manage') || user?.role === 'ADMIN'` để ẩn/hiện buttons Sửa/Xóa/Tạo mới/Upload
5. **Upload Excel header tên cột đầy đủ:** "Mã hàng hóa", "Tên hàng hóa", "Giá trị cũ", "Giá trị điều chỉnh" (khác với trip_codes dùng tên ngắn)
6. **Icon sidebar:** `BookOpen` từ lucide-react cho menu "Quản lý dữ liệu kế toán", `Scale` cho sub-item "Điều chỉnh trọng lượng"
7. **Không thay đổi:** TripCode, Vehicle, Driver, Dispatch, auth, user management — không đụng vào các module khác
