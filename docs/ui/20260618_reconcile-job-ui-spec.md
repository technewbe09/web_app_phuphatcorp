# UI Spec: Cấu hình Job Đối chiếu HĐ

**Ngày:** 2026-06-18
**Feature:** Job Đối chiếu HĐ tự động
**BA Doc:** docs/ba/20260618_reconcile-job-analysis.md

---

## 1. User Journey

### Happy Path

```
1. User truy cập /accounting-data/reconcile-jobs từ sidebar "Quản lý dữ liệu kế toán"
2. Nếu chưa có cấu hình: hiển thị empty state + nút "Tạo cấu hình"
3. User nhấn "Tạo cấu hình" -> hiển thị modal
4. User nhập: Tên job (default "Đối chiếu hóa đơn"), Số ngày quét (default 180), chọn giờ (checkboxes 0-23h)
5. User nhấn "Lưu" -> toast "Đã tạo cấu hình job" -> form hiển thị config vừa tạo
6. Config được bật (active=true) -> hiển thị thông tin "Lần chạy tiếp: ..."
7. User nhấn "Chạy ngay" -> nút chuyển spinner -> toast "Đối chiếu hoàn tất: 25/150 hóa đơn đã khớp"
8. User chuyển sang tab "Lịch sử" -> xem bảng log, filter theo status
```

### Alternative Paths

```
A. User muốn tắt job:
   - Nhấn toggle switch (bật/tắt) -> PATCH /toggle -> scheduler hủy job ngay

B. User muốn sửa cấu hình:
   - Nhấn "Sửa" -> modal pre-filled -> thay đổi -> Lưu

C. User muốn xóa cấu hình:
   - Nhấn "Xóa" -> confirm dialog -> DELETE -> clean up

D. Job gặp lỗi:
   - Tab "Lịch sử" hiển thị row màu đỏ với status "Thất bại"
   - Có thể click vào để xem error_message đầy đủ (popover/tooltip)
```

---

## 2. Screen Inventory

### Screen: Cấu hình Job Đối chiếu (/accounting-data/reconcile-jobs)

#### Layout

Trang dùng layout card đơn, chia làm 2 vùng:
- Vùng trên: Card form cấu hình
- Vùng dưới: Tab "Lịch sử chạy"

#### States

| State | Trigger | Hiển thị |
|-------|---------|----------|
| **Loading** | Trang mount, đang fetch configs | Skeleton card + skeleton table |
| **Empty** | API trả về configs = [] | Empty state: icon Timer + text "Chưa có cấu hình job" + nút "Tạo cấu hình" |
| **View** | Có config, không editing | Form readonly hiển thị config + nút "Sửa", "Chạy ngay", "Xóa" |
| **Edit** | Nhấn "Sửa" | Form editable (hoặc modal) |
| **Saving** | Đang gọi API create/update | Nút "Lưu" có spinner |
| **Error** | API lỗi | Toast error message |

#### Wireframe

```
┌──────────────────────────────────────────────────────┐
│  Cấu hình Job Đối chiếu                               │
│  ┌──────────────────────────────────────────────┐    │
│  │  Tên job:     [Đối chiếu hóa đơn           ] │    │
│  │  Số ngày quét: [180] ngày                    │    │
│  │  Giờ chạy:                                     │    │
│  │  ┌───┬───┬───┬───┬───┬───┐                   │    │
│  │  │☑0 │☑1 │☑2 │☑3 │☐4 │☐5 │  ...            │    │
│  │  │☑6 │☐7 │☑8 │☐9 │☐10│☐11│                  │    │
│  │  │☑12│☐13│☐14│☐15│☐16│☑17│                  │    │
│  │  │☑18│☐19│☐20│☐21│☑22│☐23│                  │    │
│  │  └───┴───┴───┴───┴───┴───┘                   │    │
│  │  Trạng thái:  [========●] Đang hoạt động     │    │
│  │                                               │    │
│  │  Lần chạy cuối: 18/06/2026, 12:00             │    │
│  │  Lần chạy tiếp: 18/06/2026, 18:00             │    │
│  │                                               │    │
│  │  [💾 Lưu]  [▶ Chạy ngay]  [🗑 Xóa]           │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  ┌─ Lịch sử chạy ────────────────────────────────┐   │
│  │  Filter: [Tất cả ▾]          Page 1/3          │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │ Thời gian bắt đầu │ Trạng thái │Quét│Khớp│  │   │
│  │  │ 18/06/2026 12:00  │✅ Thành công│150 │ 25 │  │   │
│  │  │ 18/06/2026 08:00  │✅ Thành công│148 │ 12 │  │   │
│  │  │ 17/06/2026 18:00  │❌ Thất bại  │ -  │ -  │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

#### Fetching Strategy

- `useGetConfigs()`: fetch configs khi page mount (TanStack Query, staleTime: 5min)
- `useGetLogs(filters)`: fetch logs khi tab "Lịch sử" active (staleTime: 30s - thay đổi nhanh)
- Mutation cache:
  - createConfig / updateConfig / deleteConfig / toggleConfig -> invalidate `['reconcile-jobs', 'configs']`
  - triggerReconcile -> invalidate `['reconcile-jobs', 'configs']` + `['reconcile-jobs', 'logs']`

#### Actions

| Action | Trigger | Gọi API | UX feedback |
|--------|---------|---------|-------------|
| Tạo mới | Nút "Tạo cấu hình" | POST /configs | Toast "Đã tạo", form chuyển sang View |
| Sửa | Nút "Sửa" | - | Form chuyển sang Edit mode |
| Lưu | Nút "Lưu" | PUT /configs/:id | Toast "Đã lưu", form về View |
| Xóa | Nút "Xóa" + Confirm | DELETE /configs/:id | Toast "Đã xóa", về Empty state |
| Bật/Tắt | Toggle switch | PATCH /toggle | Toast "Đã bật/tắt" |
| Chạy ngay | Nút "Chạy ngay" | POST /trigger | Toast kết quả, refresh logs |
| Chuyển tab | Click tab "Lịch sử" | GET /logs | Auto-fetch + render table |

---

## 3. Component Checklist

| Component | File Path | Props | States bắt buộc |
|-----------|-----------|-------|-----------------|
| **ReconcileJobPage** | `frontend/src/pages/admin/accounting-data/ReconcileJobPage.tsx` | - | loading, empty, view, edit, saving, error |
| **HourSelector** | `frontend/src/components/accounting-data/HourSelector.tsx` | `selected: number[]`, `onChange: (h: number[]) => void`, `disabled?: boolean` | normal, disabled |
| **LogTable** | (inline trong page, tab "Lịch sử") | `logs: ReconcileJobLog[]`, loading | loading, empty, data, pagination, error |
| **StatusBadge** | Tái dùng pattern từ InvoiceMatchingPage | `status: string` | success (green), failed (red), running (blue+animate) |
| **ConfigForm** | (inline trong page card) | `config: ReconcileJobConfig \| null`, `mode: 'view' \| 'edit' \| 'create'` | view, edit, creating, saving |

---

## 4. Validation UX

| Rule | Khi trigger | Cách hiển thị |
|------|-------------|---------------|
| `lookback_days < 1` | onBlur + onSubmit | Inline error bên dưới input: "Số ngày quét phải >= 1" |
| `schedule_hours.length === 0` | onSubmit | Inline error dưới HourSelector: "Vui lòng chọn ít nhất 1 giờ" |
| `name.trim() === ''` | onBlur + onSubmit | Inline error: "Tên job không được để trống" |
| Trigger khi không có config | onClick "Chạy ngay" | Toast warning: "Chưa có cấu hình job. Vui lòng tạo cấu hình trước." |
| API error (network/500) | Sau mutation | Toast error với message từ BE |
| Toggle khi config đang lưu | onClick toggle | Disable toggle trong quá trình saving |

---

## 5. i18n Keys cần thêm

```json
{
  "reconcileJob": {
    "title": "Cấu hình Job Đối chiếu",
    "configCardTitle": "Cấu hình",
    "name": "Tên job",
    "lookbackDays": "Số ngày quét",
    "lookbackDaysUnit": "ngày",
    "scheduleHours": "Giờ chạy",
    "active": "Đang hoạt động",
    "inactive": "Đã tắt",
    "lastRun": "Lần chạy cuối",
    "nextRun": "Lần chạy tiếp",
    "neverRun": "Chưa chạy",
    "save": "Lưu",
    "edit": "Sửa",
    "delete": "Xóa",
    "create": "Tạo cấu hình",
    "runNow": "Chạy ngay",
    "logTab": "Lịch sử chạy",
    "logStartedAt": "Thời gian bắt đầu",
    "logFinishedAt": "Thời gian kết thúc",
    "logStatus": "Trạng thái",
    "logScanned": "Đã quét",
    "logMatched": "Đã khớp",
    "logError": "Lỗi",
    "logTriggerScheduled": "Định kỳ",
    "logTriggerManual": "Thủ công",
    "statusSuccess": "Thành công",
    "statusFailed": "Thất bại",
    "statusRunning": "Đang chạy",
    "noConfig": "Chưa có cấu hình job nào",
    "confirmDelete": "Bạn có chắc muốn xóa cấu hình này?",
    "deleteSuccess": "Đã xóa cấu hình job",
    "createSuccess": "Đã tạo cấu hình job",
    "updateSuccess": "Đã cập nhật cấu hình job",
    "toggleOn": "Đã bật job",
    "toggleOff": "Đã tắt job",
    "triggerSuccess": "Đối chiếu hoàn tất",
    "triggerResult": "{matched}/{scanned} hóa đơn đã khớp",
    "noLogs": "Chưa có lịch sử chạy",
    "validation": {
      "lookbackMin": "Số ngày quét phải >= 1",
      "hoursRequired": "Vui lòng chọn ít nhất 1 giờ",
      "nameRequired": "Tên job không được để trống"
    }
  }
}
```

---

## 6. Sidebar Integration

Menu item mới thêm vào `accountingDataSubItems`:

```typescript
// Trong MainLayout.tsx
{ to: '/accounting-data/reconcile-jobs', icon: RefreshCw, label: 'Cấu hình Job' }
```

Icon: `RefreshCw` từ `lucide-react` (biểu tượng xoay vòng = đồng bộ/đối chiếu).

Thứ tự trong sub-menu:
1. Điều chỉnh trọng lượng
2. Danh sách khách hàng
3. Import 5 nhà
4. Đối chiếu HĐ
5. **Cấu hình Job** ← mới
