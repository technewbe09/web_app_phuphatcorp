# UI Spec CR: 2 chế độ áp giá (theo tấn / theo chuyến·xe·ngày)

**Ngày:** 2026-07-13  
**BA / CR:** User request — 2 chế độ áp giá; gom khoảng bậc thành `range_from`/`range_to`  
**Role:** `route_pricing.manage` (nhập), `route_pricing.view` (xem)  
**Phạm vi UI:** Modal **Thêm bảng giá gốc** + card **Lịch sử phiên bản giá** (Tab Bảng giá)  
**Giữ nguyên:** shell RoutePricingPage, tab Nhóm tuyến, Điều chỉnh %, layout hiện có  

**Migration note (CR-01):** Backfill `range_from`/`range_to` từ `from/to_trips_per_vehicle_day` nếu khác null; ngược lại từ `from_ton`/`to_ton`. Version → `by_trips` nếu có ≥1 bậc dùng trips; không thì `by_weight`.

---

## 1. User Journey

### Happy Path — chế độ theo trọng lượng
```
Tab Bảng giá → nhóm chưa có giá → "Thêm bảng giá gốc"
  → Modal mở: chế độ mặc định "Theo trọng lượng"
  → Template 5 bậc sẵn: (0–2.5] chuyến; (2.5–8] tấn min 5; (8–16]; (16–23]; (23–∞) tấn
  → User nhập giá từng bậc + pallet + ngày hiệu lực → Lưu
  → Toast success → modal đóng → hiện version "Giá gốc"
```

### Happy Path — chế độ theo chuyến/xe/ngày
```
"Thêm bảng giá gốc" → chọn radio "Theo số chuyến/xe/ngày"
  → Form đổi: ẩn Từ–Đến tấn / đơn vị Tấn / tối thiểu tấn
  → Hiện ≥2 bậc chuyến: bậc 1 từ 1 → n; bậc cuối n+1 → ∞ (tự chain)
  → User có thể "+ Thêm bậc" (chèn giữa / trước bậc ∞)
  → Nhập giá từng bậc → Lưu → version hiển thị cột "Chuyến/xe/ngày"
```

### Alternative Paths
```
- Đổi chế độ trong modal (chưa lưu) → confirm mất dữ liệu bậc → reset template theo chế độ mới
- Hủy modal → không lưu
- View-only → không thấy nút Thêm bảng giá gốc
```

### Error Paths
```
- Bậc chồng / khoảng sai / giá ≤ 0 → Toast lỗi BE, form giữ data
- Mode trips thiếu trips_per_vehicle_day khi lookup (Delivery) → Toast / ô trống theo flow hiện tại
```

---

## 2. Screen Inventory

### Screen A: Modal Thêm bảng giá gốc (cập nhật)

**Loại:** Modal `size="lg"`  
**Mở khi:** `canManage && !configId` → "Thêm bảng giá gốc"

#### Layout — chung
```
┌─────────────────────────────────────────────────────────────┐
│ Thêm bảng giá gốc                                       [X] │
├─────────────────────────────────────────────────────────────┤
│ Ngày hiệu lực *  [DateInput]                                │
│ Giá Pallet (chuyến) *  [number]  (hint: cho phép 0)         │
│                                                             │
│ Chế độ áp giá *                                             │
│  (•) Theo trọng lượng                                       │
│  ( ) Theo số chuyến/xe/ngày                                 │
│                                                             │
│ Bậc điều kiện *                                             │
│  ┌─ (tier rows — phụ thuộc chế độ) ─────────────────────┐   │
│  └──────────────────────────────────────────────────────┘   │
│  [+ Thêm bậc]                                               │
├─────────────────────────────────────────────────────────────┤
│                              [Hủy]  [Lưu]                   │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — mode `by_weight`
Mỗi bậc (giống hiện tại, bỏ field trips):
```
[Đơn vị: Chuyến|Tấn] [Từ (tấn)] [Đến (tấn)] [Tối thiểu tấn nếu Tấn] [Giá] [🗑]
```
- Template mặc định: 5 bậc như đã chốt trước đó
- Không còn Từ/Đến chuyến/xe/ngày trên từng bậc

#### Layout — mode `by_trips`
Mỗi bậc (chỉ giá chuyến, mọi trọng lượng):
```
Bậc 1:  Từ (≥) = 1 (readonly) | Đến (≤) = [n editable] | Giá | [🗑 nếu >2 bậc]
Bậc k:  Từ = prev.to+1 (readonly) | Đến = [editable] hoặc ∞ (bậc cuối) | Giá
Bậc cuối: Từ = … (readonly) | Đến = ∞ (readonly / trống) | Giá
[+ Thêm bậc] — chèn bậc mới trước bậc cuối (∞); re-chain khoảng
```

**Chain rule (UX):**
- Bậc 1 luôn `from = 1`
- Đổi `to` bậc i → bậc i+1.`from` = `to + 1` (tự động)
- Bậc cuối luôn `to = null` (∞)
- Tối thiểu **2** bậc khi mode trips
- Không cho xóa nếu còn đúng 2 bậc; không cho xóa bậc làm đứt chain (chỉ xóa bậc giữa hoặc reset về 2)

#### States
| State | UI |
|-------|-----|
| Default weight | Radio weight + 5 bậc template, giá 0 |
| Default trips | Radio trips + 2 bậc: `[1, n]` + `[n+1, ∞)`, n mặc định `2` |
| Switch mode | Confirm → reset template |
| Submitting | Lưu disabled + pending |
| Error | Toast, giữ form |

#### Actions
| Action | Kết quả |
|--------|---------|
| Chọn chế độ | Đổi form + template |
| Thêm bậc | Weight: thêm hàng ton; Trips: chèn trước ∞ + rechain |
| Xóa bậc | Theo rule tối thiểu từng mode |
| Lưu | POST prices kèm `pricing_mode` + tiers `range_from`/`range_to` |

---

### Screen B: PriceVersionCard (cập nhật hiển thị)

**Điều kiện:** mọi version trong lịch sử

#### Mode `by_weight` — cột
| Khoảng trọng lượng | Đơn vị | Đơn giá |
| `≤ 2.5 tấn` / `>8-16` / `>16` (+ min tấn) | vnđ/chuyến \| vnđ/tấn | số |

#### Mode `by_trips` — cột
| Chuyến/xe/ngày | Đơn vị | Đơn giá |
| `1–n` / `từ n+1 trở lên` / `a–b` | vnđ/chuyến | số |

Badge nhỏ trên card (optional): `Theo trọng lượng` | `Theo chuyến/xe/ngày` — dùng Badge `info` / `default`, không phá layout hiện tại.

Pallet = 0 → vẫn ẩn như hiện tại.

---

## 3. Component Checklist

| Component | Path | Loại |
|-----------|------|------|
| `PriceFormModal` | `RoutePricingPage.tsx` | Cập nhật |
| `PriceVersionCard` + format helpers | `RoutePricingPage.tsx` | Cập nhật |
| Types `PriceTierInput` / version | `routePricingApi.ts` | Cập nhật |

States bắt buộc (giữ pattern hiện có):
- [x] Loading / empty tab (không đổi)
- [x] Toast success/error sau Lưu
- [x] Confirm khi đổi chế độ (destructive reset)
- [x] Submit disabled khi pending

---

## 4. Validation UX

| Trường hợp | Hiển thị | Message gợi ý |
|------------|----------|----------------|
| Giá ≤ 0 | Toast sau submit (BE) | Giá phải > 0 |
| Trips: to < from / không liền mạch | Toast BE | Khoảng chuyến không hợp lệ |
| Weight: chồng khoảng tấn | Toast BE | Các bậc chồng nhau |
| Đổi chế độ | `window.confirm` | Đổi chế độ sẽ xóa các bậc đang nhập. Tiếp tục? |

---

## 5. Copy / i18n

Project đang hardcode VI — không thêm i18n framework. Chuỗi UI:

| Key logic | Text |
|-----------|------|
| mode.weight | Theo trọng lượng |
| mode.trips | Theo số chuyến/xe/ngày |
| mode.label | Chế độ áp giá |
| tier.trips.from | Từ (≥) |
| tier.trips.to | Đến (≤, trống=∞) |
| badge.weight | Theo trọng lượng |
| badge.trips | Theo chuyến/xe/ngày |
| confirm.switchMode | Đổi chế độ sẽ xóa các bậc đang nhập. Tiếp tục? |

---

## 6. Design notes

- Giữ Modal / Input / Select / Button / Badge / DateInput hiện có — không card mới trong hero (N/A).
- Radio chế độ dùng native radio + label text-sm (cùng pattern Destination mode ở GroupFormModal).
- Không thêm pill cluster / stat strip.
- Mobile: tier rows `flex-wrap` như form hiện tại.
