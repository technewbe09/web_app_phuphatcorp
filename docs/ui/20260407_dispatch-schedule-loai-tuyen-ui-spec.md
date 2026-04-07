# UI Spec — Thêm bước Chọn tuyến + Lịch tuyến ngoài
**Ngày:** 2026-04-07
**Feature:** Bảng điều phối xe — Dispatch Schedule
**Change:** Thêm loai_tuyen (Tuyến cố định / Tuyến ngoài)

---

## Giữ nguyên

- Layout header (date picker + nút Tạo chuyến)
- Toast notifications (success/error)
- ScheduleTable component (columns, loading/empty/error states, delete icon)
- 2-column grid xe_nho / xe_lon tables
- Step 2 (Xe nhà / Xe ngoài), Step 3 (Xe nhỏ / Xe lớn), Step 4 Form — chỉ renumber

---

## 1. CreateScheduleModal — Thêm Step 1 mới

### Wizard từ 3 bước → 4 bước

| Bước cũ | Bước mới | Nội dung |
|---------|---------|----------|
| —       | **Step 1** | Chọn loại tuyến: **Tuyến cố định** / **Tuyến ngoài** |
| Step 1  | Step 2  | Chọn loại sở hữu: Xe nhà / Xe ngoài |
| Step 2  | Step 3  | Chọn loại xe: Xe nhỏ / Xe lớn |
| Step 3  | Step 4  | Form điền thông tin chuyến |

### Step 1 — Chọn loại tuyến

Layout: giống Step 2/3 cũ — 2 card buttons ngang hàng nhau trong `grid grid-cols-2 gap-3`.

```
┌──────────────────────┬──────────────────────┐
│         🗺️           │         🚌           │
│   Tuyến cố định      │    Tuyến ngoài       │
└──────────────────────┴──────────────────────┘
```

- Icon trái: `MapPin` (lucide-react) — đại diện tuyến cố định
- Icon phải: `Navigation` (lucide-react) — đại diện tuyến ngoài
- Click → tự động advance sang Step 2 (không cần Back ở Step 1)
- Không có nút Back (giống Step 1 cũ)

### Step 2/3/4 — Không thay đổi nội dung, chỉ đổi số

- Step 2 và Step 3: Back button → về step trước (step--)
- Step 4: Back button → Step 3

### Step title (i18n)

```
step1Title: "Chọn loại tuyến"
step2Title: "Chọn loại xe sở hữu" (đổi từ "Chọn loại sở hữu")
step3Title: ...  (giữ nguyên)
step4Title: ...  (giữ nguyên, đổi từ step3Title)
```

### State mới trong modal

```typescript
type LoaiTuyen = 'Tuyến cố định' | 'Tuyến ngoài';
const [loai_tuyen, setLoaiTuyen] = useState<LoaiTuyen | null>(null);
```

Khi close modal → reset loai_tuyen về null.

---

## 2. SchedulePage — Thêm "Lịch tuyến ngoài"

### Layout mới

```
┌─────────────────────────────────────────────────────┐
│ Header: date picker + nút Tạo chuyến                │
├─────────────────────────────────────────────────────┤
│ Toast notifications (nếu có)                        │
├───────────────────────┬─────────────────────────────┤
│  Lịch xe nhỏ          │  Lịch xe lớn                │
│  (ScheduleTable)      │  (ScheduleTable)             │
├───────────────────────┴─────────────────────────────┤
│  Lịch tuyến ngoài                                   │
│  (OutsideRouteTable — full width)                   │
└─────────────────────────────────────────────────────┘
```

- "Lịch tuyến ngoài" chiếm full width (không nằm trong grid 2 cột)
- Đặt ngay bên dưới grid 2 cột, cùng section, cùng padding

### OutsideRouteTable — Component mới

Có thể dùng lại `ScheduleTable` với props bổ sung hoặc tạo component riêng. **Khuyến nghị: dùng lại `ScheduleTable`** — cùng columns cộng thêm **1 cột "Loại xe"** ở vị trí sau "Biển số".

#### Columns

| Cột | Source |
|-----|--------|
| Điểm nhận | diem_nhan |
| Điểm trả | diem_tra |
| Biển số | bien_so |
| **Loại xe** | loai_xe ← cột mới |
| Giờ nhận | gio_nhan |
| Mã chuyến | ma_chuyen |
| Ghi chú | ghi_chu |
| (Delete icon) | — |

#### States

- **Loading**: 3 skeleton rows, 8 cột
- **Empty**: "Chưa có lịch tuyến ngoài nào" + sub "Nhấn 'Tạo chuyến' để thêm chuyến tuyến ngoài"
- **Data**: rows with hover delete icon (giống ScheduleTable)

---

## 3. i18n Keys mới

### vi.json / en.json — dispatch.createModal

```json
"loaiTuyen": "Loại tuyến",
"tuyenCoDinh": "Tuyến cố định",
"tuyenNgoai": "Tuyến ngoài",
"step1Title": "Chọn loại tuyến"
```

### vi.json / en.json — dispatch.schedule

```json
"tableTuyenNgoai": "Lịch tuyến ngoài",
"emptyStateTuyenNgoai": "Chưa có lịch tuyến ngoài nào",
"emptyStateTuyenNgoaiSub": "Nhấn 'Tạo chuyến' để thêm chuyến tuyến ngoài",
"columns": {
  ...existing...,
  "loaiXe": "Loại xe"
}
```
