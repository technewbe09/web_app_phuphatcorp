# UI Spec: Sửa giá theo kỳ (manual adjust)

**Ngày:** 2026-09-15  
**BA Doc:** `docs/ba/20260915_route-pricing-period-manual-adjust-analysis.md`  
**Role liên quan:** `route_pricing.manage` (sửa), `route_pricing.view` (xem dấu)  
**Phạm vi UI:** Tab **Quản lý giá** (card kỳ + bút chì), 2 modal mới/cập nhật, tab **Ma trận giá** (hiển thị `-` + highlight)  
**Giữ nguyên:** shell `RoutePricingPage`, tab Kỳ / Nhóm, modal Thêm/Sửa bảng giá gốc (chỉ nới validate ≥ 0 + preserve dấu theo BA), không sửa từ ma trận  

**Web Interface Guidelines (self-check trước khi lưu):**
- Icon-only Pencil: bắt buộc `aria-label`
- Modal: `overscroll-behavior: contain` (Modal hiện có); focus trap giữ pattern hệ thống
- Confirm destructive-ish cascade: modal confirm, không immediate
- Số cột: `tabular-nums`
- Loading submit: disable nút + spinner; toast `aria-live` qua toast hiện có
- Không `window.confirm` cho luồng này (Q14)
- Copy ellipsis `…` trong loading strings

---

## 1. User Journey

### Happy Path — sửa giá kỳ giữa
```
Giá theo tuyến → chọn bảng giá → tab Quản lý giá → chọn nhóm có lịch sử version
  → Card kỳ (không chỉ gốc) hiện [Pencil]
  → Click Pencil → Modal “Điều chỉnh giá — [ngày kỳ]”
  → Prefill Pallet + mọi bậc (chỉ input Đơn giá; nhãn/đơn vị read-only)
  → User đổi 1+ ô → nút Lưu enable
  → Lưu → Modal confirm mở
       • Bảng ô đổi: nhãn | cũ → mới
       • Kỳ sau: danh sách ngày start; dòng có mất dấu ghi chú
  → Xác nhận → API → toast thành công → đóng cả 2 modal → refresh cards + invalidate matrix
  → Card: * / icon trên ô đã sửa; giá 0 hiện “-”
  → Ma trận: ô đã sửa highlight nền; 0 → “-”
```

### Happy Path — Pallet điều chỉnh về 0
```
… → Đổi Pallet thành 0 → confirm → lưu
  → Card: không ẩn dòng; hiện badge “Pallet được điều chỉnh về 0” và “-”
  → Ma trận: ô pallet “-” + highlight (và có thể title/aria mô tả badge chữ)
```

### Alternative Paths
```
- Hủy edit modal / X → không lưu; discard draft
- Hủy confirm → về edit modal, giữ số đang nhập
- Không dirty → Lưu disabled
- View-only → không Pencil
- Sửa bảng giá gốc: luồng cũ; cho giá bậc ≥ 0; không confirm mất dấu kỳ sau
```

### Error Paths
```
- API 400/500 → toast lỗi; confirm đóng hoặc giữ edit mở với data; không clear form
- Load versions fail → giữ error + Thử lại hiện tại
```

---

## 2. Screen Inventory

### Screen A: Card phiên bản giá (cập nhật) — tab Quản lý giá

**Route:** `/route-pricing?tab=manage&…`  
**Role:** view thấy card; manage thấy Pencil  
**Điều kiện:** `versions.length > 0`

#### Layout (delta trên header card)
```
┌──────────────────────────────────────────────────────────────┐
│ [Badges…]                                      [Pencil] (*)  │
│ effective_from → effective_to                                │
│                                                              │
│ Pallet: 1.200.000 *     |  hoặc badge Pallet→0 + “-”         │
│                                                              │
│ Table bậc: nhãn | đơn vị | đơn giá [ * nếu manual ]          │
│            …      …        -     *                           │
└──────────────────────────────────────────────────────────────┘
(*) Pencil chỉ khi canManage; aria-label="Điều chỉnh giá kỳ này"
```

#### Hiển thị giá
| Điều kiện | UI |
|-----------|-----|
| `price === 0` (bậc hoặc pallet số) | Text `-` (không hiện `0`) |
| Pallet `=== 0` && `!pallet_manual_adjusted` | Ẩn cả dòng Pallet (như hiện tại) |
| Pallet `=== 0` && `pallet_manual_adjusted` | Dòng: Badge warning/info **"Pallet được điều chỉnh về 0"** + `-` |
| `is_manual_adjusted` (bậc) hoặc pallet manual với giá > 0 | `*` hoặc icon `Pencil`/`Asterisk` nhỏ cạnh số; `title`/`aria-label`="Đã điều chỉnh" |
| Không manual | Chỉ số (hoặc `-`) |

#### Actions
| Action | Trigger | Kết quả |
|--------|---------|---------|
| Điều chỉnh giá | Pencil | Mở Screen B với `version` |

---

### Screen B: Modal Điều chỉnh giá kỳ

**Loại:** Modal `size="lg"`  
**Mở khi:** Pencil trên card  
**Role:** manage  

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Điều chỉnh giá — dd/mm/yyyy                             [X] │
├─────────────────────────────────────────────────────────────┤
│ Hint: Chỉ sửa đơn giá. Các kỳ sau sẽ được tính lại theo %   │
│       của từng kỳ (làm tròn nghìn).                         │
│                                                             │
│ Giá Pallet (chuyến)                                         │
│ [ number input ]                                            │
│                                                             │
│ Bậc (read-only nhãn + đơn vị | input giá)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Nhãn / khoảng     Đơn vị      Đơn giá (vnđ)         │    │
│  │ Truck 0,5mt       vnđ/chuyến  [________]            │    │
│  │ …                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│ Không thêm/xóa bậc; không đổi mode.                         │
├─────────────────────────────────────────────────────────────┤
│                              [Hủy]  [Lưu]                   │
└─────────────────────────────────────────────────────────────┘
```

#### States
| State | UI |
|-------|-----|
| Default | Prefill từ version; Lưu **disabled** |
| Dirty | Lưu enabled |
| Submitting | Không submit từ đây — mở confirm trước; khi API chạy: disable Xác nhận |
| Validation | Giá < 0 hoặc trống: inline dưới ô; chặn mở confirm |

#### Validation UX
| Rule | Message |
|------|---------|
| Bắt buộc số | “Nhập đơn giá” |
| < 0 | “Giá phải ≥ 0” |
| NaN | “Giá không hợp lệ” |

**Dirty:** so sánh số với giá gốc (Number); Pallet + từng tier.id.

**Lưu:** nếu dirty & valid → mở Screen C (không gọi API).

---

### Screen C: Modal Confirm điều chỉnh giá

**Loại:** Modal `size="md"` hoặc `lg` nếu nhiều dòng  
**Mở khi:** Lưu từ Screen B  

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Xác nhận điều chỉnh giá                                 [X] │
├─────────────────────────────────────────────────────────────┤
│ Các ô thay đổi                                              │
│  • Pallet: 1.200.000 → 0                                    │
│  • Truck 0,5mt: 1.100.000 → 2.000.000                       │
│                                                             │
│ Các kỳ sau sẽ được tính lại theo %                          │
│  • 01/08/2026                                               │
│  • 01/09/2026 — sẽ mất dấu đã điều chỉnh trên ô vừa sửa     │
│  (Nếu không có kỳ sau: “Không có kỳ sau để cascade.”)       │
├─────────────────────────────────────────────────────────────┤
│                    [Hủy]  [Xác nhận]                        │
└─────────────────────────────────────────────────────────────┘
```

**Không** hiện giá mới đã tính của kỳ sau.  
Trong confirm, số **0 hiện là `0`** (không dùng `-`) để rõ ràng cũ→mới.

#### States
| State | UI |
|-------|-----|
| Default | List từ diff phía client + periods từ versions cùng config |
| Submitting | Xác nhận disabled + spinner “Đang lưu…” |
| Error | Toast; modal confirm có thể đóng; edit vẫn mở với data |
| Success | Đóng C + B; toast “Đã điều chỉnh giá” |

**FE tự tính list kỳ sau:** versions có `effective_from` / period start > kỳ đang sửa, sort ASC.  
**Mất dấu:** kỳ sau có `is_manual_adjusted` / `pallet_manual_adjusted` trên **cùng ô** nằm trong diff.

---

### Screen D: Modal Sửa bảng giá gốc (delta nhỏ)

- Cho phép nhập giá bậc ≥ 0 (cùng rule Pallet).
- Không thêm bước confirm mất dấu kỳ sau.
- Sau save: refresh; dấu theo BR-MA-007.

---

### Screen E: Tab Ma trận giá (delta)

**Route:** tab `prices`  
**Role:** view  

#### Hiển thị ô
| Điều kiện | UI |
|-----------|-----|
| `value == null` | trống (như hiện tại) |
| `value === 0` | `-` |
| `manual_adjusted === true` | nền highlight (vd. `bg-amber-50` / dark tương đương); giữ `tabular-nums` |
| Pallet `value===0` && `manual_adjusted` | `-` + highlight; `title`="Pallet được điều chỉnh về 0" |

Không nút sửa trên header kỳ / ô.

---

## 3. Component Checklist

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| `PriceVersionCard` | `RoutePricingPage.tsx` (hoặc tách file nếu quá dài) | Cập nhật | Screen A |
| `PeriodPriceAdjustModal` | `frontend/src/pages/route-pricing/PeriodPriceAdjustModal.tsx` (khuyến nghị tách) | Mới | B |
| `PeriodPriceAdjustConfirmModal` | cùng folder hoặc trong file modal | Mới | C |
| `PriceFormModal` | `RoutePricingPage.tsx` | Cập nhật validate ≥ 0 | D |
| `PriceMatrixTab` + cell render | `PriceMatrixTab.tsx` | Cập nhật | E |
| `formatPriceCell(value)` helper | utils hoặc local | Mới | A, E — `0 → '-'`, null → '' |
| `useManualAdjustPrice` | `useRoutePricing.ts` | Mới | B/C |
| API `manualAdjustVersion` | `routePricingApi.ts` | Mới | hook |

### States bắt buộc
```
- [ ] Loading versions / matrix (giữ hiện tại)
- [ ] Empty / error (giữ)
- [ ] Confirm trước cascade
- [ ] Disabled Lưu khi !dirty
- [ ] Submitting trên confirm
- [ ] Toast success / error
- [ ] aria-label trên Pencil
```

---

## 4. Validation UX

| Trường hợp | Ở đâu | Khi nào | Message |
|------------|-------|---------|---------|
| Giá trống / không phải số | Inline dưới input | blur / Lưu | “Nhập đơn giá” / “Giá không hợp lệ” |
| Giá < 0 | Inline | blur / Lưu | “Giá phải ≥ 0” |
| Business 400 | Toast | sau Xác nhận | message BE |
| 500 | Toast | sau Xác nhận | “Lỗi hệ thống, vui lòng thử lại” |
| 401 | Redirect login | interceptor | — |

---

## 5. i18n Keys cần thêm

```
routePricing.manage.adjustPrice = "Điều chỉnh giá"
routePricing.manage.adjustPricePeriod = "Điều chỉnh giá — {date}"
routePricing.manage.adjustHint = "Chỉ sửa đơn giá. Các kỳ sau sẽ được tính lại theo % của từng kỳ (làm tròn nghìn)."
routePricing.manage.saveAdjust = "Lưu"
routePricing.manage.confirmTitle = "Xác nhận điều chỉnh giá"
routePricing.manage.confirmChanges = "Các ô thay đổi"
routePricing.manage.confirmLaterPeriods = "Các kỳ sau sẽ được tính lại theo %"
routePricing.manage.confirmNoLater = "Không có kỳ sau để cascade."
routePricing.manage.confirmLoseMark = "sẽ mất dấu đã điều chỉnh trên ô vừa sửa"
routePricing.manage.confirmSubmit = "Xác nhận"
routePricing.manage.palletAdjustedToZero = "Pallet được điều chỉnh về 0"
routePricing.manage.manualMarkTitle = "Đã điều chỉnh"
routePricing.manage.priceZeroDisplay = "-"
routePricing.message.success.manualAdjust = "Đã điều chỉnh giá"
routePricing.message.error.manualAdjust = "Không điều chỉnh được giá"
routePricing.validation.priceRequired = "Nhập đơn giá"
routePricing.validation.priceMin0 = "Giá phải ≥ 0"
routePricing.validation.priceInvalid = "Giá không hợp lệ"
```

(EN tương ứng trong `en.json`.)

---

## 6. Screens / Components count

- Screens cập nhật: 3 (card, absolute form validate, matrix)  
- Modal mới: 2 (edit + confirm)  
- Components mới khuyến nghị: 2–3  
