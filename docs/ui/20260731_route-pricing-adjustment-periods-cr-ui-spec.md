# UI Spec CR: Kỳ điều chỉnh + cascade bảng giá

**Ngày:** 2026-07-31  
**BA / CR:** Change request — master Kỳ điều chỉnh (start/%/note); thêm kỳ = áp dụng % toàn hệ thống; tạo bảng giá gốc = sinh version cho kỳ gốc + mọi kỳ tiếp theo  
**Role:** `route_pricing.manage` (CRUD kỳ / nhập giá / sửa gốc), `route_pricing.view` (xem)  
**Phạm vi UI:** Tab mới **Kỳ điều chỉnh** + Modal **Thêm bảng giá gốc** + **Sửa bảng giá gốc**; **bỏ** nút/modal “Điều chỉnh %” riêng (thay bằng Thêm kỳ)  
**Giữ nguyên:** Tab Nhóm tuyến; shell chọn NCC; chế độ `by_weight` / `by_trips`; lookup Delivery  

**Giả định nghiệp vụ (chốt khi implement):**
1. Kỳ điều chỉnh là master **global** (không theo NCC). Schema: `start_date`, `end_date`, `percent`, `note` (optional). **UI không nhập `end_date`** — hệ thống tự set (vd: kỳ mở `end_date=NULL`; khi thêm kỳ mới, đóng kỳ trước bằng `end_date = start_date kỳ mới`).
2. Không bắt buộc có kỳ trước khi tạo nhóm tuyến.
3. Bắt buộc có ≥1 kỳ trước khi tạo **bảng giá gốc**.
4. **Thêm kỳ = đã áp dụng toàn hệ thống:** sau khi lưu kỳ mới, BE tự điều chỉnh % mọi phiên bản giá đang mở (mọi NCC) — `%` và ngày hiệu lực lấy từ kỳ vừa tạo. Không còn modal Điều chỉnh riêng.
5. **Tạo bảng giá gốc = cascade kỳ:** user nhập giá absolute một lần + chọn **kỳ gốc**. BE tạo version absolute gắn kỳ gốc + cascade mọi kỳ có `start_date` sau kỳ gốc.
6. `%` trên kỳ áp dụng khi kỳ được “chạy” (thêm kỳ mới khi đã có giá, hoặc cascade khi tạo giá gốc). Kỳ gốc không nhân % khi tạo absolute.
7. **Không cho sửa kỳ.** Chỉ **Thêm** và **Xóa kỳ gần nhất**. Muốn đổi %/ngày → xóa kỳ gần nhất rồi tạo lại.
8. **Xóa kỳ gần nhất = rollback:** vì Thêm kỳ đã tạo/gắn version ngay. Xóa = xóa mọi `route_price_versions` gắn kỳ đó + xóa kỳ + mở lại kỳ trước (`end_date=NULL`). Nếu kỳ đó là kỳ gốc của một nhóm (version absolute), cascade absolute cũng bị xóa theo.
9. **Version giá gắn kỳ (`adjustment_period_id` bắt buộc).** Ngày hiệu lực / ngày kết thúc / % điều chỉnh của version **suy từ kỳ** (không lưu trùng trên `route_price_versions`). API/UI vẫn hiển thị các field derived đó như hiện tại.
10. **Note kỳ ≠ note bảng giá.** Không đồng bộ giữa hai loại ghi chú.

---

## 1. User Journey

### Happy Path — thêm kỳ (áp dụng toàn hệ thống)
```
Giá theo tuyến → tab "Kỳ điều chỉnh"
  → Click "Thêm kỳ" → Modal: Ngày bắt đầu *, %, Ghi chú (optional) → Lưu
  → Confirm: "Thêm kỳ sẽ điều chỉnh giá mọi nhà cung cấp đang có bảng giá hiệu lực theo %. Tiếp tục?"
  → BE: tạo kỳ + nếu có version mở → adjust global theo kỳ
  → Toast: "Đã tạo kỳ" / "Đã tạo kỳ và điều chỉnh N bảng giá" → list refresh
```

### Happy Path — xóa kỳ gần nhất (rollback; cách duy nhất để “đổi” kỳ)
```
Tab Kỳ → kỳ mới nhất → Xóa
  → Confirm: "Xóa kỳ sẽ gỡ mọi bảng giá sinh từ kỳ này và mở lại kỳ trước. Tiếp tục?"
  → BE: DELETE versions gắn kỳ + DELETE kỳ + end_date kỳ trước = NULL
  → Toast success → refresh list kỳ + prices
  → (Optional) Thêm kỳ lại với % / ngày đúng
```

### Happy Path — tạo bảng giá gốc + cascade kỳ tiếp theo
```
Tab Bảng giá → nhóm chưa có giá → "Thêm bảng giá gốc"
  → Modal: Select "Kỳ gốc *" + nhập pallet / chế độ / bậc (giá absolute)
  → Lưu
  → BE: tạo version gốc + cascade mọi kỳ sau kỳ gốc
  → Toast success → lịch sử hiện nhiều version (Giá gốc + các đợt ±%)
```

### Happy Path — sửa bảng giá gốc
```
Tab Bảng giá → version "Giá gốc" → "Sửa" (nếu còn cho phép theo rule BE)
  → Prefill absolute → Lưu
  → BE cập nhật absolute + recompute cascade kỳ sau
  → Toast success
```

### Alternative Paths
```
- Hủy modal → không lưu
- View-only → không Thêm kỳ / Thêm giá / Sửa absolute / Xóa kỳ
- Thêm kỳ khi chưa có bảng giá nào → chỉ tạo master kỳ, không adjust (adjusted=0);
  xóa kỳ này vẫn được (không có version nào để gỡ)
- Chưa chọn NCC → vẫn CRUD tab Kỳ; tab Nhóm/Bảng giá cần NCC
```

### Error Paths
```
- Tạo giá gốc khi chưa có kỳ → chặn + CTA sang tab Kỳ
- start_date trùng / không sau kỳ gần nhất → Toast lỗi BE
- Thêm kỳ trùng start với version đã có → OVERLAPPING_VERSION toast
- Xóa kỳ không phải gần nhất → ẩn nút / 409
- Sửa absolute không còn được phép → ẩn nút / Toast
```

---

## 2. Screen Inventory

### Screen A: Tab Kỳ điều chỉnh (mới)

**Route:** `/route-pricing?tab=periods` (không cần `supplierId`)  
**Role:** view / manage  
**Điều kiện:** Luôn hiện tab trên page Giá theo tuyến (cùng cấp Nhóm tuyến / Bảng giá)

#### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ Kỳ điều chỉnh                          [+ Thêm kỳ] (manage)     │
│ Master ngày hiệu lực & % — áp dụng mọi nhà cung cấp              │
├──────────────────────────────────────────────────────────────────┤
│ Table (UI giống Nhóm tuyến):                                     │
│   Ngày bắt đầu | % (tăng X% / giảm X%) | Ghi chú | Actions       │
│   (Không hiện cột Ngày kết thúc)                                 │
│   (Actions: chỉ Xóa trên kỳ gần nhất — không có nút Sửa)         │
├──────────────────────────────────────────────────────────────────┤
│ Empty: "Chưa có kỳ điều chỉnh" + CTA Thêm kỳ                     │
└──────────────────────────────────────────────────────────────────┘
```

#### States
| State | Trigger | UI |
|-------|---------|-----|
| Loading | Fetch list | Skeleton / spinner table |
| Empty | `[]` | Message + CTA Thêm kỳ (manage) |
| Error | API fail | Text + Thử lại |
| Populated | Có data | Table sort `start_date DESC` |

#### Actions
| Action | Trigger | Kết quả |
|--------|---------|---------|
| Thêm kỳ | Click | PeriodFormModal create → confirm → tạo kỳ + adjust global |
| Xóa | Chỉ kỳ gần nhất | Confirm rollback → xóa versions gắn kỳ + xóa kỳ + mở kỳ trước |

**Ghi chú layout page:** Tab Kỳ không phụ thuộc Select NCC. **Ẩn** nút header “Điều chỉnh (mọi nhà cung cấp)” — thay bằng Thêm kỳ. Select NCC nằm ngang title “Giá theo tuyến” (giữ chỗ layout khi ẩn trên tab Kỳ).

---

### Screen B: Modal Thêm kỳ điều chỉnh

**Loại:** Modal `size="md"`  
**Mở khi:** Thêm kỳ  
**Không có** modal Sửa kỳ.

#### Layout
```
┌─────────────────────────────────────┐
│ Thêm kỳ điều chỉnh              [X] │
├─────────────────────────────────────┤
│ ⚠ Thêm kỳ sẽ áp dụng % cho mọi     │
│   NCC đang có bảng giá hiệu lực.    │
│                                     │
│ Ngày bắt đầu *   [DateInput]        │
│ Phần trăm (%) *  [number]           │
│  hint: VD 8 = tăng 8%; -5 = giảm 5% │
│ Ghi chú          [textarea]         │
│  (optional; không liên quan note    │
│   bảng giá)                         │
├─────────────────────────────────────┤
│              [Hủy]  [Lưu]           │
└─────────────────────────────────────┘
```

**Không có** field Ngày kết thúc trên form. `end_date` do BE quản lý. **List không hiện cột kết thúc.**

#### Validation UX
| Rule | Message |
|------|---------|
| start_date required | Inline bắt buộc |
| percent ≠ 0 | "Phần trăm phải khác 0" |
| start phải > start kỳ gần nhất | Toast từ BE |
| overlapping version / kỳ | Toast từ BE |

---

### Screen C: Modal Thêm bảng giá gốc (cập nhật)

**Thay đổi so với UI Spec modes 2026-07-13:**

| Trước | Sau |
|-------|-----|
| `DateInput` Ngày hiệu lực * | `Select` Kỳ gốc * |
| 1 version absolute | Absolute + cascade mọi kỳ có start sau kỳ gốc |

#### Layout — phần đầu (thay DateInput)
```
│ Kỳ gốc *  [Select: "01/01/2026 (tăng 8%) — Ghi chú…"]          │
│  hint: Ngày hiệu lực gốc = start của kỳ.                      │
│  Hệ thống sẽ tự tạo bảng giá cho các kỳ tiếp theo             │
│  (sau kỳ gốc), nhân % từng kỳ.                                │
│  Empty → "Chưa có kỳ — vào tab Kỳ điều chỉnh để tạo"          │
```

Phần chế độ + bậc + pallet: **giữ nguyên** UI Spec modes.

**Submit disabled** khi chưa chọn kỳ gốc hoặc list kỳ rỗng.

---

### Screen D: Modal Điều chỉnh — **GỠ**

Thay bằng flow **Thêm kỳ** (Screen B). Không còn nút Percent trên header page.  
Endpoint `POST /prices/adjust` (nếu còn) cũng gỡ — không còn `effective_from` tự do trên version.

---

### Screen E: Sửa bảng giá gốc (mới)

**Loại:** Modal giống Thêm bảng giá gốc, title "Sửa bảng giá gốc"  
**Hiện nút khi:** `canManage` && còn version absolute của nhóm (cascade recompute các kỳ sau)

Prefill tiers/mode/pallet; kỳ gốc readonly.  
Lưu → cập nhật absolute + recompute cascade kỳ tiếp theo.  
**Note trên form này là note bảng giá** — không đụng note kỳ.

---

### Screen F: Lịch sử version (PricesTab) — hiển thị derived

UI vẫn hiện khoảng hiệu lực và badge ±% như hiện tại:
- `effective_from` / `effective_to` = `period.start_date` / `period.end_date` (API derived)
- Badge “Điều chỉnh ±X%” khi version phái sinh = `period.percent`
- Không đổi layout bảng lịch sử

---

## 3. Component Checklist

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| Tab periods + table | `RoutePricingPage.tsx` | Cập nhật | Screen A — bỏ nút Sửa kỳ |
| PeriodFormModal | cùng file | Cập nhật | Screen B — **chỉ create** |
| PriceFormModal | `RoutePricingPage.tsx` | Cập nhật | Screen C / E |
| AdjustModal | `RoutePricingPage.tsx` | **Gỡ** | — |
| Edit absolute entry | PricesTab / PriceFormModal | Cập nhật | Screen E |
| useRoutePricing hooks + API | `useRoutePricing.ts`, `routePricingApi.ts` | Cập nhật | Bỏ/không dùng updatePeriod; invalidate prices sau delete kỳ |

### States bắt buộc
```
- [ ] Loading / Empty / Error cho list kỳ
- [ ] Success toast sau create/delete kỳ, create/edit giá
- [ ] Confirm trước xóa kỳ (rollback) và trước thêm kỳ (apply global)
- [ ] Submit disabled khi submitting hoặc thiếu kỳ
- [ ] Nút Xóa kỳ chỉ hiện trên kỳ gần nhất (không có Sửa kỳ)
- [ ] Sau delete kỳ → refresh versions / prices list
```

---

## 4. Validation UX

| Trường hợp | Hiển thị | Khi |
|------------|----------|-----|
| start_date trống | Inline | blur/submit |
| percent = 0 | Inline | blur/submit |
| start không sau kỳ gần nhất | Toast | sau submit thêm kỳ |
| Xóa kỳ không phải gần nhất | Ẩn nút / Toast 409 | mở hoặc submit |
| Không có kỳ khi tạo giá | Inline Select + hint | mở modal / submit |
| OVERLAPPING_VERSION | Toast | sau thêm kỳ / cascade |
| Server 500 | Toast | sau submit |

---

## 5. i18n Keys (gợi ý)

```
routePricing.periods.tab = "Kỳ điều chỉnh"
routePricing.periods.title = "Kỳ điều chỉnh"
routePricing.periods.empty = "Chưa có kỳ điều chỉnh"
routePricing.periods.add = "Thêm kỳ"
routePricing.periods.deleteConfirm = "Xóa kỳ sẽ gỡ mọi bảng giá sinh từ kỳ này và mở lại kỳ trước. Tiếp tục?"
routePricing.periods.fields.start = "Ngày bắt đầu"
routePricing.periods.fields.percent = "Phần trăm (%)"
routePricing.periods.fields.note = "Ghi chú"
routePricing.periods.warnApply = "Thêm kỳ sẽ điều chỉnh giá mọi nhà cung cấp đang có bảng giá hiệu lực theo %."
routePricing.periods.confirmApply = "Xác nhận thêm kỳ và áp dụng toàn hệ thống?"
routePricing.price.basePeriod = "Kỳ gốc"
routePricing.price.cascadeHint = "Hệ thống sẽ tự tạo bảng giá cho các kỳ tiếp theo"
routePricing.price.editAbsolute = "Sửa bảng giá gốc"
routePricing.message.success.periodSave = "Đã lưu kỳ điều chỉnh"
routePricing.message.success.periodApply = "Đã tạo kỳ và điều chỉnh {n} bảng giá"
routePricing.message.success.periodDelete = "Đã xóa kỳ điều chỉnh"
```

*(Project hiện dùng nhiều hardcode VI trên RoutePricingPage — giữ consistent với page hiện tại; i18n keys trên là checklist khi team chuyển i18n.)*
