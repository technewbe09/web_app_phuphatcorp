# UI Spec: Tính giá theo tuyến đường (Route Pricing)

**Ngày:** 2026-07-11  
**BA Doc:** docs/ba/20260711_route-pricing-analysis.md  
**Role liên quan:** ADMIN / ACCOUNTANT (`route_pricing.manage`), VIEWER (`route_pricing.view`)  
**Module:** Giá theo tuyến (`route_pricing`) — module + permission riêng, không thuộc `accounting_data`

---

## 1. User Journey

### Happy Path
```
Sidebar "Giá theo tuyến" (module riêng)
  → RoutePricingPage `/route-pricing`: auto-select NCC mặc định (mã nhỏ nhất)
  → Tab Nhóm tuyến: search (accent-insensitive) + lọc tỉnh → Tạo nhóm
       → Có phường: tên "Hồ Chí Minh - Tân Hiệp/ Dĩ An/ …" + tạo tuyến mới
       → Không phường: tên "Hồ Chí Minh" = nhóm còn lại (phường chưa thuộc nhóm khác)
  → Tab Bảng giá: nhóm chưa có giá → "Thêm bảng giá gốc" (số tuyệt đối)
  → (Page-level) Click "Điều chỉnh %" → +8%, ngày 25
       → Confirm: áp dụng cho TẤT CẢ NCC → Toast success (N configs)
  → Đổi NCC → thấy version mới đã ×1.08; cùng đợt với NCC khác
```

### Alternative Paths
```
- Đang tải danh sách NCC → empty "Đang tải nhà cung cấp…"
- User chỉ view → ẩn nút Thêm / Sửa / Xóa / Điều chỉnh
- Đổi tab giữ filter URL (?supplierId=&tab=prices)
- Hủy modal → không lưu
- Xem lịch sử version → expand / drawer
```

### Error Paths
```
- Duplicate tuyến trong cùng NCC → Toast "Tuyến đã tồn tại với nhà cung cấp này"
- Phường đã có tuyến / thuộc nhóm khác → Toast DUPLICATE_ROUTE hoặc ROUTE_ALREADY_IN_GROUP
- Adjust khi không có bảng giá nào đang mở → Toast "Không có bảng giá để điều chỉnh"
- Thử thêm giá gốc lần 2 → Toast ABSOLUTE_UPDATE_FORBIDDEN
- Soft-delete tuyến trong nhóm → Toast 409
- API fail → Toast error, form giữ data
```

---

## 2. Screen Inventory

### Screen 1: RoutePricingPage (shell)

**Route:** `/route-pricing`  
**Permission:** `route_pricing.view`  
**Sidebar:** item **top-level** (không dưới Dữ liệu kế toán), label `Giá theo tuyến`, icon `MapPinned` (lucide); gate `route_pricing.view`

#### Layout
```
┌──────────────────────────────────────────────────────────────┐
│ Giá theo tuyến                                               │
│ Quản lý nhóm tuyến và bảng giá theo từng nhà cung cấp        │
├──────────────────────────────────────────────────────────────┤
│ Nhà cung cấp * [MCC ▼]       [% Điều chỉnh — mọi NCC]        │
├──────────────────────────────────────────────────────────────┤
│ [Nhóm tuyến] [Bảng giá]                                      │
├──────────────────────────────────────────────────────────────┤
│                    (scoped theo NCC đã chọn)                 │
└──────────────────────────────────────────────────────────────┘
```

#### States
| State | UI |
|-------|-----|
| Chưa có `supplierId` (đang tải / auto-select) | "Đang tải nhà cung cấp…" |
| Loading | Tab skeleton |
| Forbidden | Redirect / toast |

#### Actions
| Action | Kết quả |
|--------|---------|
| Auto-select NCC mặc định | Khi chưa có `?supplierId`, chọn mã NCC nhỏ nhất |
| Chọn / đổi NCC | Sync `?supplierId=`; reload tab data |
| Điều chỉnh % | Mở PriceAdjustModal — **toàn hệ thống**, không theo NCC đang chọn |
| Đổi tab | Sync `?tab=` (`groups` \| `prices`; mặc định `groups`) |

---

### Screen 2: ~~Tab Tuyến đường~~ — **đã bỏ**

Tuyến không còn tab riêng. Tuyến vẫn được tạo ở backend khi tạo/sửa nhóm có chọn phường; không quản lý từ UI.

---

### Screen 3: ~~Modal RouteFormModal~~ — **đã bỏ**

Tuyến không tạo thủ công từ tab; chỉ sinh khi tạo/sửa nhóm có chọn phường.

---

### Screen 4: Tab Nhóm tuyến

**Context:** chỉ nhóm của NCC đang chọn.  
**Permission view:** `route_pricing.view` | **mutate:** `route_pricing.manage`

#### Layout
```
┌──────────────────────────────────────────────────────────────┐
│ [🔍 Tìm tên nhóm, tỉnh, phường…] [Lọc theo tỉnh ▼] [+ Tạo nhóm]│
├──────────────────────────────────────────────────────────────┤
│ Tên nhóm │ Tỉnh │ Phường/Xã │ Hành động                      │
│ HCM - Tân Hiệp/ Dĩ An/ … │ HCM │ Tân Hiệp · Dĩ An · … │ [✏️][🗑️] │
│ Hồ Chí Minh [Còn lại]    │ HCM │ Phường chưa thuộc nhóm khác │ │
└──────────────────────────────────────────────────────────────┘
```

Badge `Còn lại` (`Badge` warning) khi `is_residual`.

**Search:** client-side, accent-insensitive — ví dụ `"Hà Tie"` khớp `"Hà Tiên"` (normalize NFD + strip diacritics + `includes`).  
**Lọc tỉnh:** Select từ master `provinces`; kết hợp AND với search.

#### States
| State | UI |
|-------|-----|
| Loading | "Đang tải…" |
| Empty | "Chưa có nhóm tuyến" |
| Empty filter | "Không tìm thấy nhóm phù hợp" |
| Populated | `Table` |

#### Actions
| Action | Kết quả |
|--------|---------|
| Tạo nhóm | GroupFormModal |
| Sửa | GroupFormModal edit (khóa tỉnh; thêm phường = tạo tuyến mới; bỏ phường = gỡ member) |
| Xóa | Confirm soft-delete |
| Search / lọc tỉnh | Lọc danh sách client-side |

---

### Screen 5: Modal GroupFormModal

#### Layout
```
┌──────────────────────────────────────────────┐
│ Tạo nhóm tuyến                           [X] │
├──────────────────────────────────────────────┤
│ Nhà cung cấp: MCC (read)                     │
│ Tỉnh *                                       │
│ [Select provinces master ▼]                  │
│ Phường / Xã (optional)                       │
│ [🔍 Tìm phường/xã…]                          │
│ [Multi-select checkbox list — lọc theo search]│
│   ☐ (trống) hoặc ☑ Tân Hiệp ☑ Dĩ An …        │
│ Hint: Để trống = nhóm còn lại của tỉnh       │
│                                              │
│ Tên nhóm (read-only)                         │
│ Hồ Chí Minh - Tân Hiệp/ Dĩ An/ …             │
│                                              │
│ Ghi chú                                      │
├──────────────────────────────────────────────┤
│ [Hủy]                            [Lưu]       │
└──────────────────────────────────────────────┘
```

**Hành vi tên nhóm:**
- Có phường → `{Tỉnh} - {P1}/ {P2}/ …`; không phường → `{Tỉnh}`.
- Submit: `province_code` + `ward_codes` (có thể `[]`) + `note?` — **không gửi `name`**.
- Có phường → BE tạo tuyến mới; không phường → `is_residual`, không tạo tuyến.
- Field tên: **read-only**.
- **Search phường:** client-side accent-insensitive theo `name` / `full_name` (không mất selection khi lọc).

**Components:** `Modal`, `Select`, `Input` (search + ghi chú), `Button`

Hint: *"Có thể chỉ chọn Tỉnh. Phường trống = giá áp dụng các tuyến còn lại của tỉnh chưa nằm trong nhóm khác."*

#### Validation UX
- Chưa chọn tỉnh → multi-select phường disabled
- Phường optional — 0 phường hợp lệ (nhóm còn lại)
- Phường đã có tuyến cùng NCC → Toast DUPLICATE_ROUTE
- Đã có residual cùng tỉnh → Toast DUPLICATE_RESIDUAL_GROUP

---

### Screen 6: Nhà cung cấp — page filter (không tab riêng)

- Dropdown page-level từ `GET /api/suppliers`
- Label: `{supplier_code} — {name}`
- Khi vào trang không có `?supplierId` → **auto-select mã NCC nhỏ nhất**
- Không có nút/link Catalog trên trang này
- Mỗi NCC có danh sách nhóm / giá **độc lập**

---

### Screen 7: Tab Bảng giá (giá của Nhóm thuộc NCC)

**Permission view:** `route_pricing.view` | **mutate:** `route_pricing.manage`

#### Layout — master/detail
```
┌────────────────────┬─────────────────────────────────────────┐
│ NCC: MCC (page)    │ Timeline phiên bản                      │
│ Nhóm *   [▼]       │ [+ Thêm bảng giá gốc]  ← chỉ nếu chưa có│
│                    │   (không có nút thêm version tuyệt đối) │
│ [Xem bảng giá]     ├─────────────────────────────────────────┤
│ Tóm tắt            │                                         │
│ Nhóm: HCM - Tân Hiệp/ … │
│ Bậc: 3 điều kiện   │                                         │
│ Pallet: 108k       │                                         │
└────────────────────┴─────────────────────────────────────────┘
```

Khi nhóm chưa có version:
```
Empty: "Chưa có bảng giá gốc" + CTA "Thêm bảng giá gốc"
```

Khi đã có version: ẩn CTA tuyệt đối; cập nhật chỉ qua **Điều chỉnh %** (page header).

Khi config chưa có version:
```
Empty: "Chưa có phiên bản giá" + CTA "Thêm phiên bản giá"
```

#### Chi tiết version (card trong Tab Bảng giá)

Mỗi version = **toàn bộ giá của nhóm** tại thời điểm đó.

**Meta:** badge Đang hiệu lực / Đã đóng / Giá gốc / Điều chỉnh % · khoảng ngày hiệu lực

**Giá Pallet:** chỉ hiện khi `pallet_trip_price > 0`. Pallet = 0 → ẩn.

**Bảng bậc — 3 cột (as-built 2026-07-13):**

| Trọng lượng | Đơn vị | Đơn giá |
|-------------|--------|---------|
| `≤ 2.5 tấn` + dòng `(Áp dụng chuyến thứ 1 đến 3)` | vnđ/chuyến | 625,000 |
| `≤ 2.5 tấn` + dòng `(Áp dụng chuyến thứ 4 trở lên)` | vnđ/chuyến | 529,000 |
| `>2.5-8 tấn (cước tối thiểu 5 tấn)` | vnđ/tấn | 90,000 |
| `>8-16` | vnđ/tấn | 80,000 |
| `>16` | vnđ/tấn | 70,000 |

**Derive cột Trọng lượng** (từ khoảng DB `(from_ton, to_ton]`):
- `from ≤ 0`, có `to` → `≤ {to} tấn`
- `from > 0`, có `to` → `>{from}-{to}` (vd. `>8-16`)
- `to` null → `>{from}` (vd. `>16`)
- Đơn vị Tấn + `min_billable_ton > 0` → append ` (cước tối thiểu {n} tấn)`
- Bậc Chuyến có trips `[from, to]` / `[from, ∞)` → dòng 2:
  - `[n, ∞)` → `(Áp dụng chuyến thứ {n} trở lên)`
  - `[a, b]` → `(Áp dụng chuyến thứ {a} đến {b})`
  - `[n, n]` → `(Áp dụng chuyến thứ {n})`

**Đơn vị hiển thị:** `vnđ/chuyến` | `vnđ/tấn`  
**Đơn giá:** `toLocaleString('vi-VN')`

w=2.5 → bậc `≤ 2.5 tấn`; w vừa trên 2.5 → bậc `>2.5-…`.

---

### Screen 8: Modal PriceVersionFormModal

**Mở khi:** Thêm **bảng giá gốc** (tuyệt đối) — chỉ khi nhóm chưa có version

Form: bậc điều kiện (mỗi dòng chọn Chuyến|Tấn) + giá Pallet.

#### Layout
```
┌──────────────────────────────────────────────────────────┐
│ Thêm phiên bản giá nhóm                              [X] │
├──────────────────────────────────────────────────────────┤
│ Nhóm: HCM - Tân Hiệp/ Dĩ An/ … — read                        │
│ Nhà cung cấp: MCC — read                                 │
│ Ngày hiệu lực *  [datepicker]                            │
│                                                          │
│ —— Bậc điều kiện * ——                                    │
│ ┌────┬────┬──────────┬────────┬─────────┬────┐           │
│ │Từ  │Đến │Đơn vị    │Min tính│Giá      │ 🗑 │           │
│ │0   │2.5 │[Chuyến▼] │ (ẩn)   │1500000  │    │           │
│ │2.5 │8   │[Tấn   ▼] │5       │90000    │    │           │
│ │8   │    │[Tấn   ▼] │        │80000    │    │           │
│ └────┴────┴──────────┴────────┴─────────┴────┘           │
│ [+ Thêm bậc]                                             │
│ Hint: Mỗi bậc chọn Chuyến hoặc Tấn độc lập.              │
│ Khoảng: (Từ, Đến] — Đến inclusive; Từ exclusive.         │
│                                                          │
│ —— Giá Pallet của nhóm (Chuyến) ——                       │
│ Giá Pallet *     [number VND]                            │
│                                                          │
│ Ghi chú                                                  │
├──────────────────────────────────────────────────────────┤
│ [Hủy]                                        [Lưu]       │
└──────────────────────────────────────────────────────────┘
```

- Đến trống → ∞.
- Đơn vị = Chuyến → hiện Từ/Đến (tấn) + optional trips (≥ / ≤, trống đến = ∞); ẩn Min tính; Giá = VND/chuyến.
- Đơn vị = Tấn → hiện Min tính (optional); ẩn trips; Giá = VND/tấn.
- Có thể thêm/xóa bậc (giữ ≥1).
- Pallet ≥ 0 (cho phép 0).

#### Validation
- Ngày bắt buộc; Pallet ≥ 0 (cho phép 0)
- ≥1 bậc; mỗi bậc có pricing_unit + price > 0
- Ton: from < to (nếu to có); overlap theo `(from, to]`
- Trips (chuyến): khoảng đóng `[from, to]`; to trống = `[from, ∞)`
- Match ton: weight > from AND (to IS NULL OR weight <= to)
- min_billable chỉ khi unit=Tấn; nếu unit=Chuyến mà gửi min → INVALID_TIERS
- OVERLAPPING_VERSION → Toast

---

### Screen 9: Modal PriceAdjustModal (toàn hệ thống)

**Mở khi:** Click **Điều chỉnh %** trên page header (không gắn NCC đang chọn)

#### Layout
```
┌──────────────────────────────────────────────┐
│ Điều chỉnh giá theo % — mọi nhà cung cấp [X] │
├──────────────────────────────────────────────┤
│ ⚠ Thao tác này áp dụng cho TẤT CẢ NCC đang   │
│   có bảng giá hiệu lực (không chỉ NCC đang   │
│   xem trên trang).                           │
│                                              │
│ Phần trăm *  [  8  ] %                       │
│ Ngày hiệu lực mới * [25/07/2026]             │
│                                              │
│ Tóm tắt sẽ ảnh hưởng (từ API preview optional│
│ hoặc đếm configs đang mở):                   │
│  • N nhà cung cấp · M bảng giá               │
│                                              │
│ Ghi chú                                      │
├──────────────────────────────────────────────┤
│ [Hủy]     [Áp dụng cho mọi nhà cung cấp]     │
└──────────────────────────────────────────────┘
```

Confirm cứng trước submit (destructive-scope): user phải hiểu scope toàn hệ thống.

**Làm tròn sau %:** backend `round_to_thousands` — hàng nghìn (vd. `1.000`), không thập phân; UI hiển thị VND nguyên đã làm tròn.

---

### Screen 10: ConfirmDialog (reuse)

Dùng cho soft-delete tuyến / nhóm.
Copy theo pattern Customers Delete dialog.

---

## 3. Component Checklist

| Component | Path (đề xuất) | Loại | Screen |
|-----------|----------------|------|--------|
| RoutePricingPage | `pages/route-pricing/RoutePricingPage.tsx` | Mới | Shell (2 tabs: Nhóm tuyến, Bảng giá) — dùng `Button`/`Input`/`Select`/`Modal`/`Table`/`Badge`/`DateInput` |
| ~~RoutesTab~~ | — | **Đã bỏ** | Không còn tab Tuyến đường |
| GroupsTab | (inline trong page) | — | Search accent-insensitive + filter tỉnh; cột **Phường/Xã** |
| PricesTab | (inline trong page) | — | Tab Bảng giá |
| GroupFormModal | (inline) | — | Search phường + multi-select |
| PriceVersionFormModal | (inline) | — | + `DateInput` |
| PriceAdjustModal | (inline) | — | + `DateInput` |
| ~~RouteFormModal~~ | — | **Đã bỏ** | — |
| (update) Delivery Import | `utils/processDeliveryData.ts` | Cập nhật | Lookup API |
| routePricingApi | `api/routePricingApi.ts` | Mới | — |
| useRoutePricing hooks | `hooks/useRoutePricing.ts` | Mới | — |
| (reuse) supplier catalog | đã có | Reuse | Dropdown NCC |

### States bắt buộc
```
- [ ] Loading — skeleton
- [ ] Empty — message + CTA
- [ ] Error — + Thử lại
- [ ] Success toast — create/update/delete/adjust
- [ ] Confirm — mọi soft-delete
- [ ] Disabled submit khi submitting
- [ ] manage-only actions ẩn khi chỉ view
```

---

## 4. Validation UX

| Trường hợp | Hiển thị | Khi nào | Message ví dụ |
|------------|----------|---------|---------------|
| Required trống | Inline | blur/submit | "Trường này là bắt buộc" |
| Số ≤ 0 (bậc giá) | Inline | blur | "Giá phải lớn hơn 0" |
| Pallet < 0 | Inline | blur | "Giá Pallet phải ≥ 0" |
| Bậc chồng | Inline trên PriceTiersEditor | change | "Các bậc không được chồng nhau" |
| Min tính khi đơn vị=Chuyến | Inline | change unit | "Min tính chỉ dùng khi đơn vị là Tấn" |
| Duplicate route | Toast | sau submit | "Tuyến đã tồn tại" |
| Route in group | Toast | delete | "Tuyến đang thuộc nhóm, hãy gỡ khỏi nhóm trước" |
| Ward already in group | Toast | submit group | "Phường đã thuộc nhóm khác" |
| Invalid ward | Toast | submit | "Phường không thuộc tỉnh đã chọn" |
| Overlap version | Toast | submit | "Đã có phiên bản trùng ngày hiệu lực" |
| 401 | Redirect login | interceptor | — |
| 500 | Toast | submit | "Lỗi hệ thống, vui lòng thử lại" |

---

## 5. i18n Keys cần thêm

```
routePricing.title = "Giá theo tuyến"
routePricing.subtitle = "Quản lý nhóm tuyến và bảng giá theo từng nhà cung cấp"
routePricing.supplier.required = "Chọn nhà cung cấp"
routePricing.supplier.loading = "Đang tải nhà cung cấp…"
routePricing.prices.selectHint = "Chọn nhóm tuyến để xem / nhập giá"
routePricing.message.error.duplicateRoute = "Tuyến đã tồn tại với nhà cung cấp này"

routePricing.groups.empty = "Chưa có nhóm tuyến"
routePricing.groups.emptyFilter = "Không tìm thấy nhóm phù hợp"
routePricing.groups.search = "Tìm tên nhóm, tỉnh, phường…"
routePricing.groups.filterProvince = "Lọc theo tỉnh"
routePricing.groups.filterProvinceAll = "Tất cả tỉnh"
routePricing.groups.add = "Tạo nhóm"
routePricing.groups.phuongXa = "Phường/Xã"
routePricing.groups.membersOptional = "Phường (để trống = còn lại của tỉnh)"
routePricing.groups.wardSearch = "Tìm phường/xã…"
routePricing.groups.residualHint = "Không chọn phường: áp dụng các tuyến còn lại chưa thuộc nhóm khác"
routePricing.groups.residualBadge = "Còn lại"
routePricing.groups.nameLabel = "Tên nhóm (chỉ xem)"
routePricing.groups.nameReadonlyHint = "Tự sinh theo tỉnh và phường — không chỉnh sửa"
routePricing.groups.palletHint = "Đơn vị tính chọn theo từng bậc khi nhập bảng giá"
routePricing.message.error.duplicateResidual = "Đã có nhóm còn lại cho tỉnh này"

routePricing.prices.empty = "Chưa có phiên bản giá"
routePricing.prices.addVersion = "Thêm bảng giá gốc"
routePricing.prices.adjust = "Điều chỉnh % (mọi nhà cung cấp)"
routePricing.prices.adjustWarn = "Áp dụng cho tất cả nhà cung cấp đang có bảng giá hiệu lực"
routePricing.prices.adjustConfirm = "Xác nhận điều chỉnh % cho mọi nhà cung cấp?"
routePricing.message.success.adjust = "Đã điều chỉnh giá cho {n} bảng giá"
routePricing.message.error.absoluteForbidden = "Đã có giá — chỉ được cập nhật bằng điều chỉnh %"
routePricing.prices.effectiveFrom = "Ngày hiệu lực"
routePricing.prices.palletPrice = "Giá Pallet của nhóm (chuyến)"
routePricing.prices.palletSection = "Giá Pallet của nhóm"
routePricing.prices.tiers = "Bậc điều kiện"
routePricing.prices.tierUnit = "Đơn vị tính"
routePricing.prices.tierUnit.chuyen = "Chuyến"
routePricing.prices.tierUnit.tan = "Tấn"
routePricing.prices.tierUnitHint = "Mỗi bậc chọn Chuyến hoặc Tấn độc lập"
routePricing.prices.current = "Đang hiệu lực"
routePricing.prices.percent = "Phần trăm"
routePricing.prices.preview = "Xem trước"

routePricing.message.success.create = "Đã lưu thành công"
routePricing.message.success.adjust = "Đã điều chỉnh giá"
routePricing.message.success.delete = "Đã xóa"
routePricing.message.error.duplicate = "Dữ liệu đã tồn tại"
routePricing.confirm.delete = "Bạn có chắc muốn xóa?"
```

---

## 6. Web Design Guidelines Check

- Giữ pattern table + modal của Customers / Supplier catalog (không invent layout mới).
- Không card-hero; tab + toolbar + table là đủ.
- Number format VND: `formatCurrency` hiện có (nếu chưa — dùng Intl `vi-VN`).
- Date: dayjs theo convention project.
- Dark/light: dùng class token hiện tại (`neutral-*`, dark variants).
- Touch target / button: reuse `Button` component `ui/`.

---

## 7. Navigation wiring

| Item | Value |
|------|--------|
| Sidebar | Top-level **Giá theo tuyến** (không dưới Dữ liệu kế toán) |
| Path | `/route-pricing` |
| Router | thêm Route trong `Router.tsx` |
| Permission gate | `route_pricing.view` để vào trang; mutate cần `route_pricing.manage` |
| Seed permissions | `route_pricing.view`, `route_pricing.manage` (module riêng) |
