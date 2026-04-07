# UI Spec — Thêm chức năng Edit lịch chuyến xe
**Ngày:** 2026-04-07
**Feature:** Bảng điều phối xe — Dispatch Schedule
**Change:** Edit lịch chuyến xe (PUT /api/dispatch-schedules/:id)

---

## Giữ nguyên

- Layout header, date picker, nút Tạo chuyến
- CreateScheduleModal (4-step wizard) — không thay đổi
- ScheduleTable / OutsideRouteTable layout và columns
- Delete functionality

---

## 1. ScheduleTable & OutsideRouteTable — Thêm Edit button

### Actions column (mỗi row)

Thay đổi: action cell hiện tại chỉ có 1 nút xóa (Trash2) → thêm 1 nút sửa (Pencil) trước nút xóa.

```
[ ✏️ ]  [ 🗑️ ]
```

- Cả 2 icon đều `opacity-0 group-hover:opacity-100`
- Edit icon: `text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400`
- Delete icon: giữ nguyên màu đỏ
- Khi click edit → mở EditScheduleModal với row data pre-filled
- `<th className="w-20" />` (rộng hơn để chứa 2 nút)

---

## 2. EditScheduleModal — Màn hình mới

### Trigger
Click icon ✏️ trên row bất kỳ (ScheduleTable hoặc OutsideRouteTable).

### Header
- Title: "Sửa chuyến xe"
- Size: `md`

### Context (readonly, không thay đổi được)
Hiển thị 3 badge/tag nhỏ phía trên form để user biết đang edit loại chuyến nào:
```
[loai_tuyen]  [xe_type]  [loai_xe]
```
Ví dụ: `Tuyến cố định` · `Xe nhà` · `Xe nhỏ`
Style: `text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full`

### Form fields (editable)

| Field | Type | Required | Behavior |
|-------|------|----------|----------|
| Điểm nhận | text input | ✅ | pre-filled từ row.diem_nhan |
| Điểm trả | text input | ✅ | pre-filled từ row.diem_tra |
| Giờ nhận | time input | ✅ | pre-filled từ row.gio_nhan |
| Mã chuyến | select (trip codes) | ❌ | pre-selected nếu row.trip_code_id != null; else blank |
| Biển số | select hoặc text | ✅ | xe_type='Xe nhà' → dropdown vehicles filter theo loai_xe; xe_type='Xe ngoài' → text input pre-filled |
| Tài xế | text (readonly nếu Xe nhà) | ❌ | Xe nhà: auto-fill từ vehicle.tai_xe[0], readonly; Xe ngoài: text input pre-filled |
| Ghi chú | textarea | ❌ | pre-filled từ row.ghi_chu |

**Layout:** 2-column grid cho Điểm nhận / Điểm trả, Giờ nhận / Mã chuyến. Biển số, Tài xế, Ghi chú mỗi field chiếm full width.

### Validation (inline, dưới field)

| Lỗi | Điều kiện |
|-----|-----------|
| "Điểm nhận là bắt buộc" | diem_nhan empty |
| "Điểm trả là bắt buộc" | diem_tra empty |
| "Giờ nhận là bắt buộc" | gio_nhan empty |
| "Biển số là bắt buộc" | bien_so empty (Xe ngoài) |
| "Vui lòng chọn biển số xe" | vehicle_id null (Xe nhà) |

### Actions (footer)

```
[ Hủy ]                                    [ Lưu thay đổi ]
```

- Hủy: variant="outline", đóng modal, reset form
- Lưu thay đổi: isLoading khi đang submit, disabled khi isSubmitting
- Toast success: "Cập nhật chuyến xe thành công"
- Toast error: "Cập nhật thất bại. Vui lòng thử lại."

### States

| State | Behavior |
|-------|----------|
| Loading | Nút "Lưu thay đổi" disabled + spinner |
| Error (validation) | Inline error dưới field, không submit |
| Error (API) | Toast đỏ trên SchedulePage |
| Success | Toast xanh + modal đóng + bảng refresh |

---

## 3. SchedulePage — State thêm mới

```
editingSchedule: DispatchSchedule | null   ← null = modal đóng
```

- `handleEdit(schedule)` → set editingSchedule
- `handleEditClose()` → set null
- `handleEditSubmit(id, data)` → gọi mutation PUT, đóng modal, toast

---

## 4. i18n Keys mới

| Key | VI | EN |
|-----|----|----|
| `dispatch.editModal.title` | Sửa chuyến xe | Edit Trip |
| `dispatch.editModal.context` | Thông tin tuyến | Route Info |
| `dispatch.editModal.submit` | Lưu thay đổi | Save Changes |
| `dispatch.editModal.submitting` | Đang lưu... | Saving... |
| `dispatch.editModal.updateSuccess` | Cập nhật chuyến xe thành công | Trip updated successfully |
| `dispatch.editModal.updateError` | Cập nhật thất bại. Vui lòng thử lại. | Failed to update. Please try again. |
