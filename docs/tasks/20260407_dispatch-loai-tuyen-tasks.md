# Change Plan: Thêm Loại tuyến vào Bảng điều phối xe
**Ngày:** 2026-04-07
**BA Impact:** MEDIUM
**UI Spec:** docs/ui/20260407_dispatch-schedule-loai-tuyen-ui-spec.md

---

## Thay đổi

Thêm trường `loai_tuyen` (Tuyến cố định / Tuyến ngoài) vào bước đầu tiên của wizard tạo chuyến.
Bổ sung bảng "Lịch tuyến ngoài" full-width bên dưới 2 bảng hiện có trên SchedulePage.

---

## Bước thực hiện

| Bước | Thay đổi | File | Layer |
|------|----------|------|-------|
| CR-01 | Tạo migration thêm column `loai_tuyen` | `backend/src/migrations/007_add_loai_tuyen_to_dispatch_schedules.sql` | DB |
| CR-02 | Thêm `loai_tuyen` vào interface + update `listByDate` trả thêm `tuyen_ngoai[]` + update `create` INSERT | `backend/src/services/dispatchScheduleService.ts` | BE |
| CR-03 | Thêm `loai_tuyen` validation vào `dispatchCreateSchema` | `backend/src/controllers/dispatchScheduleController.ts` | BE |
| CR-04 | Thêm `loai_tuyen` vào `DispatchSchedule` interface + `tuyen_ngoai` vào response type + `loai_tuyen` vào create request | `frontend/src/api/dispatchApi.ts` | FE |
| CR-05 | Thêm Step 1 Tuyến cố định/ngoài, renumber steps 1→2, 2→3, 3→4, pass `loai_tuyen` vào onSubmit | `frontend/src/components/dispatch/CreateScheduleModal.tsx` | FE |
| CR-06 | Thêm OutsideRouteTable (dùng lại ScheduleTable) bên dưới grid, truyền `data.tuyen_ngoai` | `frontend/src/pages/dispatch/SchedulePage.tsx` | FE |
| CR-07 | Thêm i18n keys mới (loaiTuyen, tuyenCoDinh, tuyenNgoai, step1Title, tableTuyenNgoai, emptyStateTuyenNgoai, columns.loaiXe) | `frontend/src/i18n/vi.json` + `en.json` | FE |

**Thứ tự:** CR-01 (migration) → CR-02 → CR-03 → CR-04 → CR-05 → CR-06 → CR-07

---

## Chi tiết kỹ thuật

### CR-01 — Migration
```sql
ALTER TABLE dispatch_schedules
  ADD COLUMN loai_tuyen VARCHAR(20) NOT NULL DEFAULT 'Tuyến cố định'
  CHECK (loai_tuyen IN ('Tuyến cố định', 'Tuyến ngoài'));
```

### CR-02 — Service
- `DispatchSchedule` interface: thêm `loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài'`
- `CreateDispatchScheduleData`: thêm `loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài'`
- `listByDate` return type: `{ xe_nho, xe_lon, tuyen_ngoai: DispatchSchedule[] }`
- `listByDate` filter logic:
  - `xe_nho`: `loai_tuyen = 'Tuyến cố định' AND loai_xe = 'Xe nhỏ'`
  - `xe_lon`: `loai_tuyen = 'Tuyến cố định' AND loai_xe = 'Xe lớn'`
  - `tuyen_ngoai`: `loai_tuyen = 'Tuyến ngoài'` (bao gồm cả xe nhỏ lẫn xe lớn)
- `create`: thêm `loai_tuyen` vào INSERT ($14), SELECT RETURNING

### CR-03 — Controller
```typescript
body('loai_tuyen')
  .notEmpty()
  .withMessage('Loại tuyến là bắt buộc')
  .isIn(['Tuyến cố định', 'Tuyến ngoài'])
  .withMessage("Loại tuyến phải là 'Tuyến cố định' hoặc 'Tuyến ngoài'"),
```

### CR-04 — dispatchApi.ts
- `DispatchSchedule`: thêm `loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài'`
- `DispatchScheduleListResponse`: thêm `tuyen_ngoai: DispatchSchedule[]`
- `CreateDispatchScheduleRequest`: thêm `loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài'`

### CR-05 — CreateScheduleModal
- Type: `step: 1|2|3|4`
- State: `loai_tuyen: LoaiTuyen | null`
- Step 1: card buttons MapPin (Tuyến cố định) / Navigation (Tuyến ngoài) → advance step 2
- Step 2: card buttons (Xe nhà/Xe ngoài) → advance step 3, Back → step 1
- Step 3: card buttons (Xe nhỏ/Xe lớn) → advance step 4, Back → step 2
- Step 4: form, Back → step 3
- `handleClose`: reset loai_tuyen
- `handleSubmit`: pass `loai_tuyen` trong onSubmit payload

### CR-06 — SchedulePage
- Thêm section bên dưới grid: `<ScheduleTable>` với `title={t('dispatch.schedule.tableTuyenNgoai')}`, `data={data?.tuyen_ngoai ?? []}`, thêm prop `showLoaiXe` để hiển thị column Loại xe
- **Cách đơn giản hơn:** Tạo `OutsideRouteTable` riêng (tương tự ScheduleTable, thêm cột loai_xe sau bien_so)

### CR-07 — i18n
```json
// dispatch.createModal
"loaiTuyen": "Loại tuyến",
"tuyenCoDinh": "Tuyến cố định",
"tuyenNgoai": "Tuyến ngoài",
"step1Title": "Chọn loại tuyến",
"step2Title": "Chọn loại xe sở hữu",

// dispatch.schedule
"tableTuyenNgoai": "Lịch tuyến ngoài",
"emptyStateTuyenNgoai": "Chưa có lịch tuyến ngoài nào",
"emptyStateTuyenNgoaiSub": "Nhấn 'Tạo chuyến' để thêm chuyến tuyến ngoài",
"columns.loaiXe": "Loại xe"
```

---

## Không thay đổi

- `useDispatchSchedules.ts` — không cần sửa (type inference tự động qua dispatchApi.ts)
- `ScheduleTable.tsx` — giữ nguyên, tạo `OutsideRouteTable.tsx` riêng cho tuyến ngoài
- `dispatchSchedules.ts` (routes) — không thay đổi
- Migration cũ `006_create_dispatch_schedules.sql` — không sửa

---

## Backward compatibility

- Column `loai_tuyen` có `DEFAULT 'Tuyến cố định'` → rows cũ tự động gán giá trị mặc định
- Rows cũ sẽ xuất hiện trong `xe_nho`/`xe_lon` như bình thường
- FE `CreateDispatchScheduleRequest` thêm `loai_tuyen` required → wizard đảm bảo luôn được chọn
