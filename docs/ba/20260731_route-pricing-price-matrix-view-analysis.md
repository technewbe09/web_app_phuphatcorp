# BA Analysis: Tab xem Bảng giá (ma trận theo kỳ)

**Ngày:** 2026-07-31  
**Feature:** Route pricing — Price matrix view  
**Role:** `route_pricing.view` (xem), không cần `manage` để xem  
**Tham chiếu layout:** `docs/ui/20260731_route-pricing-price-matrix-layout.md`  
**Phụ thuộc:** Kỳ điều chỉnh + bảng giá theo nhóm tuyến (đã có)

---

## 1. Mô tả yêu cầu

Thêm **tab Bảng giá** (theo NCC) gồm:

### Nhiều bảng Theo trọng lượng (`by_weight`) — xếp dọc
- **Không** gộp mọi bậc của mọi nhóm vào một union cột.
- **Nhóm các nhóm tuyến cùng bộ bậc (tier schema) vào cùng một bảng.**  
  Ví dụ:
  - Bộ `2.5 – 8 – 16 – 23` (+ Pallet cuối) → **một bảng**
  - Bộ `3 – 7 – 10` (+ Pallet cuối) → **bảng khác phía dưới**
- Schema **tập con** cũng gộp chung bảng với schema đủ bậc hơn (vd. thiếu `≤2.5` vẫn chung với `≤2.5 · >8-16 · >16-23 · >23`); cột = **union**, ô thiếu để trống.
- Trong mỗi bảng / mỗi kỳ: **bậc tấn liên tục trước, Pallet sau cùng** (khớp layout mẫu)
- Header 3 tầng như layout mẫu; cùng danh sách kỳ (`periods`) cho mọi bảng

**Định nghĩa cùng bộ bậc (schema key):**  
Fingerprint = danh sách bậc trọng lượng của **version gốc (absolute)** nhóm, đã chuẩn hóa và sort theo `range_from`, gồm `(range_from, range_to, pricing_unit, min_billable_ton)`.  
Hai nhóm cùng fingerprint → cùng bảng.  
Hai fingerprint **tương thích** nếu tập column-key của bên này ⊆ bên kia → gộp một bảng, cột = union. Pallet **không** nằm trong fingerprint (luôn append cuối mỗi block kỳ).

### Bảng Theo chuyến (`by_trips`) — dưới cùng (sau mọi bảng trọng lượng)
- Chỉ hiện khi có nhóm `by_trips`
- **Mỗi dòng = tuyến + bậc số chuyến** (không hiện dòng Pallet)
- **Mỗi cột = một kỳ** (một ô giá)

Tab quản lý đổi tên **Quản lý giá**.

**Chốt:** `1C` · `2A` · `3A` · bảng chuyến riêng · Pallet sau bậc · **nhiều bảng weight theo schema bậc**.

### Giả định

| # | Giả định | Mặc định |
|---|----------|----------|
| A1 | Tab | **Bảng giá** = ma trận; **Quản lý giá** = cũ |
| A2 | Scope | Theo NCC |
| A3 | Kỳ | Mọi kỳ, `start_date ASC`, dùng chung mọi bảng |
| A4 | Weight | **Một HTML table / một schema bậc**; xếp dọc theo schema |
| A5 | Trips | Phía dưới mọi weight tables; hàng tuyến×bậc (không Pallet) |
| A6 | Quyền | View / CRUD như trước |
| A7 | API | `GET /prices/matrix` → `weight_tables[]` + `trips` |
| A8 | Sticky | STT + Tuyến (+ Số chuyến trips) |
| A9 | Phase 1 | Không filter tỉnh / export |
| A10 | Nhóm chưa có giá | Không vào `weight_tables` / `trips` (chỉ thấy ở tab Quản lý giá / Nhóm). Tránh bảng ma trận không cột bậc |

---

## 2. Actors & Permissions

| Actor | Permission | Hành vi |
|-------|------------|---------|
| `route_pricing.view` | view | Xem mọi bảng ma trận |
| `route_pricing.manage` | manage | CRUD ở Quản lý giá / Kỳ |

---

## 3. Use Cases

### UC-1: Nhiều bảng trọng lượng theo schema
**Acceptance:**
- [ ] Nhóm cùng bộ bậc / schema tập con nằm cùng một bảng; bộ unrelated → bảng khác bên dưới
- [ ] Trong mỗi kỳ: bậc liên tục rồi Pallet cuối; ô thiếu bậc = trống
- [ ] Không lẫn `by_trips` vào weight tables
- [ ] Thứ tự bảng: sort theo số nhóm giảm dần, rồi theo `schema_key` ASC

### UC-2: Bảng theo chuyến
Hàng = tuyến × bậc chuyến (không Pallet); cột = kỳ. Cho phép 1 bậc mở từ 1 → ∞.

### UC-3–5
Chưa NCC / empty / Quản lý giá.

---

## 4. Data / API Contract

### `GET /api/route-pricing/prices/matrix?supplier_id=`

```ts
{
  periods: Array<{
    id: number;
    start_date: string;
    end_date: string | null;
    percent: number;
    note: string | null;
  }>;

  /** Mỗi phần tử = một bảng HTML Theo trọng lượng */
  weight_tables: Array<{
    schema_key: string;         // fingerprint ổn định (vd hash/join tier keys)
    schema_label: string;       // gợi ý UI: "≤2,5 · 2,5–8 · … · Pallet"
    columns: Array<{
      key: string;              // tier keys rồi "pallet" cuối
      kind: 'pallet' | 'weight';
      label: string;
      unit_label: string;
      hint?: string | null;
      range_from?: number;
      range_to?: number | null;
      pricing_unit?: 'chuyen' | 'tan';
      min_billable_ton?: number | null;
    }>;
    rows: Array<{
      stt: number;              // STT trong bảng này (1…n)
      route_group_id: number;
      group_name: string;
      is_residual: boolean;
      province_code: string;
      tinh: string;
      cells: Record<string, Record<string, number | null>>; // periodId → columnKey → price
    }>;
  }>;

  trips: {
    rows: Array<{
      stt: number;
      route_group_id: number;
      group_name: string;
      is_residual: boolean;
      province_code: string;
      tinh: string;
      row_kind: 'pallet' | 'trips';
      trips_label: string;
      range_from: number | null;
      range_to: number | null;
      cells: Record<string, number | null>;
    }>;
  };
}
```

**Rules build `weight_tables`:**
1. Lấy nhóm active có absolute `by_weight`
2. Schema key từ **tiers của absolute** (không pallet)
3. Gom nhóm cùng key → một table; `columns` = tiers sort `range_from` + **`pallet` cuối**
4. Fill `cells` từ version từng kỳ (cùng cấu trúc bậc; thiếu bậc → null)
5. Sort tables: `rows.length` DESC, rồi `schema_key` ASC
6. Sort rows trong bảng: `tinh`, `group_name`

**Rules trips:** chỉ bậc chuyến (không append Pallet); cho phép ≥1 bậc, bậc đầu từ 1, bậc cuối ∞.

---

## 5. Out of scope (phase 1)

- CRUD từ ma trận; filter tỉnh; export; nhóm chưa có giá trên ma trận

---

## 6. Rủi ro

| Rủi ro | Mitigation |
|--------|------------|
| Nhiều schema → nhiều bảng | Xếp dọc + `schema_label` nhỏ trên mỗi bảng |
| Absolute vs cascade lệch bậc | Schema lấy absolute; cascade thiếu cột → null |
| Quá nhiều bảng | Chấp nhận phase 1; sau có thể collapse |

---

## 7. Quyết định đã chốt

1. **Bảng giá** = nhiều weight tables theo schema + trips dưới cùng · **Quản lý giá** = tab cũ  
2. API matrix một call (`weight_tables[]`)  
3. Phase 1: không filter / export  
4. Pallet sau bậc (chỉ bảng weight; trips không hiện Pallet)  
5. Cùng bộ bậc liên tục → một bảng; bộ khác → bảng khác
