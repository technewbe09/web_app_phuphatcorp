# UI Spec: Tab Bảng giá (ma trận) + đổi tên Quản lý giá

**Ngày:** 2026-07-31  
**BA Doc:** `docs/ba/20260731_route-pricing-price-matrix-view-analysis.md`  
**Layout mẫu:** `docs/ui/20260731_route-pricing-price-matrix-layout.md`  
**Role:** `route_pricing.view`  
**Chốt:** `1C` · `2A` · `3A` · trips riêng · Pallet sau bậc · **nhiều bảng weight theo schema**

---

## 1. User Journey

```
Chọn NCC → tab "Bảng giá"
  → GET /prices/matrix
  → Select «Từ kỳ» (mặc định = kỳ hiện tại) → cột kỳ từ kỳ chọn đến hiện tại
  → Lặp weight_tables[]: mỗi schema = một bảng (header 3 tầng)
  → Cuối: bảng Theo chuyến (nếu có)
```

Alternative: chưa NCC / empty / chỉ trips / API fail — như trước.

---

## 2. Screen Inventory

### Screen A: Tab Bảng giá

**Route:** `/route-pricing?tab=prices` + `supplierId`  
**Nav:** `[ Kỳ ] [ Nhóm tuyến ] [ Bảng giá ] [ Quản lý giá ]`

#### Layout tổng
```
┌──────────────────────────────────────────────────────────────┐
│ Bảng giá                                                      │
│ Từ kỳ [Select: kỳ hiện tại ▼]                                 │
│                                                               │
│ ## Theo trọng lượng                                           │
│ schema: ≤2,5 · >2,5–8 · >8–16 · >16–23 · >23 · Pallet       │
│ [WeightTable #1]                                              │
│                                                               │
│ schema: … · 3 · 7 · 10 · … · Pallet                           │
│ [WeightTable #2]                                              │
│                                                               │
│ ## Theo chuyến / xe / ngày                                    │
│ [TripsTable]                                                  │
└──────────────────────────────────────────────────────────────┘
```

---

### A1. Mỗi bảng Theo trọng lượng (`weight_tables[i]`)

```
STT | Tuyến | [ kỳ: bậc1 | bậc2 | … | Pallet ] × N kỳ
```

- Subtitle / caption nhỏ: `schema_label` (chuỗi mốc bậc — union nếu gộp schema tập con)
- Header 3 tầng; sticky STT + Tuyến
- STT đánh số **trong từng bảng** (bắt đầu lại từ 1)
- Spacing giữa các weight tables: `mt-6`

Ẩn cả section “Theo trọng lượng” nếu `weight_tables.length === 0`.

---

### A2. Bảng Theo chuyến

Hàng = bậc chuyến mỗi tuyến (không dòng Pallet); cột = kỳ. Cho phép 1 bậc từ 1 → ∞.  
Ẩn nếu `trips.rows.length === 0`.

---

### Screen B: Quản lý giá — `tab=manage` (UI cũ)

---

## 3. Component Checklist

| Component | Loại |
|-----------|------|
| Nav prices / manage | Cập nhật |
| `PriceMatrixTab` | Map `weight_tables` + trips |
| `PriceMatrixWeightTable` | Nhận `columns` + `rows` + `periods` (+ optional `schema_label`) |
| `PriceMatrixTripsTable` | Như trước |
| `usePriceMatrix` + API | `weight_tables[]` |

### States
```
- [ ] 0 / 1 / N weight tables
- [ ] Trips ẩn khi rỗng
- [ ] Sticky + format số + null trống
- [ ] schema_label hiện trên mỗi weight table
```

---

## 4. Visual notes

- Section: `Theo trọng lượng` một lần; dưới đó nhiều bảng + `schema_label` (`text-xs text-neutral-500`)
- Màu header kỳ đồng bộ mọi bảng
- `Theo chuyến / xe / ngày` sau weight tables

---

## 5. i18n (gợi ý)

```
routePricing.matrix.tab = "Bảng giá"
routePricing.manage.tab = "Quản lý giá"
routePricing.matrix.section.weight = "Theo trọng lượng"
routePricing.matrix.section.trips = "Theo chuyến / xe / ngày"
routePricing.matrix.schemaLabel = "Khung bậc"
routePricing.matrix.col.route = "Tuyến"
routePricing.matrix.col.trips = "Số chuyến"
routePricing.matrix.col.pallet = "Pallet"
```
