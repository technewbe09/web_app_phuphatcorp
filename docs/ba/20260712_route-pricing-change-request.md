# Change Request: Route Pricing — bậc Chuyến, ghi chú tuyến, địa điểm text, chuyến/xe/ngày

**Ngày:** 2026-07-12  
**Cập nhật:** 2026-07-13 (đồng bộ as-implemented; Delivery Import **không** gắn lookup — giữ rule hardcode cũ)  
**Status:** ✅ Implemented (Route Pricing module) · Delivery Import: **out of scope / deferred**  
**Feature gốc:** `docs/ba/20260711_route-pricing-analysis.md`  
**UI Spec:** docs/ui/20260711_route-pricing-ui-spec.md  
**Tasks:** `docs/tasks/20260711_route-pricing-tasks.md`  
**Migration:** `backend/src/migrations/037_route_pricing_location_note_trips.sql`  
**Module:** `route_pricing`  
**Impact:** LARGE

---

## 1. Nguồn yêu cầu (user)

1. **Giá chuyến cũng cần Từ (tấn) – Đến (tấn)** — FE v1 đang ẩn khoảng tấn khi đơn vị = Chuyến.
2. **Tuyến có thể lặp kèm ghi chú**, ví dụ:
   - `Hồ Chí Minh` và `Hồ Chí Minh (Đường nhỏ)`
   - `Hồ Chí Minh - Củ Chi` và `Hồ Chí Minh - Củ Chi (Đường nhỏ)`
3. **Thay Phường/Xã bằng tên địa điểm (text)**, ví dụ:
   - `Hồ Chí Minh - KCN Hiệp Phước`
   - `Hồ Chí Minh - Wincom Bình Dương`  
   Địa điểm chỉ cần lưu text, không bắt buộc master ward.
4. **Điều kiện số chuyến/xe/ngày** — giá khác nhau theo điều kiện này.  
   **Chỉ đơn vị Chuyến** mới có chuyến/xe/ngày.
5. **Thêm / bỏ bậc mặc định** trên form bảng giá gốc (không khóa số bậc).

---

## 2. Tóm tắt thay đổi (as-built)

| # | Thay đổi | As-built |
|---|----------|----------|
| 1 | Bậc Chuyến có Từ–Đến tấn | FE hiện field; BE validate mọi bậc phải có khoảng tấn `(from, to]` |
| 2 | Tuyến/nhóm lặp theo ghi chú | `note` tham gia unique + suffix tên `(note)` |
| 3 | Đích = địa điểm text | **1** `location_text` XOR `ward_codes[]`; lưu `delivery_routes.location_text` |
| 4 | Chuyến/xe/ngày | `from/to_trips_per_vehicle_day` trên tier `chuyen` only |
| 5 | Thêm/xóa bậc | FE `+ Thêm bậc` + 🗑 (giữ ≥1) |

---

## 3. Business Rules (delta so với BA gốc)

```
BR-001' (thay BR-001): Tuyến active unique theo
        (supplier_id, province_code,
         COALESCE(ward_code, ''),
         COALESCE(location_text, ''),
         COALESCE(NULLIF(TRIM(note), ''), '')).
        Cho phép cùng tỉnh+phường nếu note khác ("" vs "Đường nhỏ").

BR-001c (mới): Mỗi tuyến / member đích thuộc đúng một trong:
        (A) ward_code NOT NULL, location_text NULL — phường master
        (B) ward_code NULL, location_text NOT NULL (trim ≠ '') — địa điểm text
        Không cho cả hai cùng lúc.
        Residual group: không tạo member / delivery_routes.

BR-001d (mới): `note` trên delivery_routes và route_groups (trim).
        note_key = COALESCE(NULLIF(TRIM(note), ''), '').
        Khi note_key ≠ '' → tên hiển thị gắn suffix ` ({note})`.

BR-004b' (mở rộng tạo nhóm — ba chế độ đích):
        (A) ward_codes ≥ 1, không location_text → tạo tuyến ward + members (nhiều phường OK)
        (B) location_text = đúng 1 chuỗi (trim ≠ ''), ward_codes rỗng → tạo đúng 1 tuyến địa điểm
        (C) không ward và không location_text → residual (is_residual=true), không tạo tuyến
        Gửi đồng thời ward_codes (nonempty) và location_text → 400 INVALID_DESTINATION.
        location_text rỗng / chỉ whitespace → coi như không có (residual nếu không ward).
        Không hỗ trợ nhiều địa điểm trong một nhóm (khác với multi-ward).

BR-004c' (tên nhóm — server-side, không nhận `name` từ client):
        base =
          residual → `{tinh}`
          có ward → `{tinh} - {phuong1}/ {phuong2}/ …`
          có location → `{tinh} - {location_text}`   -- đúng 1 địa điểm
        name = note_key? `{base} ({note})` : base
        Ví dụ:
          - Hồ Chí Minh
          - Hồ Chí Minh (Đường nhỏ)
          - Hồ Chí Minh - Củ Chi (Đường nhỏ)
          - Hồ Chí Minh - KCN Hiệp Phước
          - Hồ Chí Minh - Wincom Bình Dương

BR-004d' (residual): Tối đa một residual active /
        (supplier_id, province_code, note_key).
        Cho phép `HCM` và `HCM (Đường nhỏ)` cùng tồn tại.

BR-005b' (lookup chọn nhóm):
        Input thêm: location_text?, note?, trips_per_vehicle_day?
        note_key input = noteKey(note) (thiếu note → '').
        1) Match member: cùng supplier+province AND
           (ward_code khớp) OR (location_text khớp LOWER/TRIM với location_text hoặc phuong)
           AND note_key(route) = note_key(group) = note_key(input)
        2) Else residual cùng province + cùng note_key
        3) Else → NOT_FOUND (không fallback hardcode)

BR-012' (bậc điều kiện):
        - Mọi bậc (chuyen | tan) BẮT BUỘC khoảng tấn `(from_ton, to_ton]` (to NULL = ∞).
        - pricing_unit='chuyen':
            + from_trips_per_vehicle_day / to_trips_per_vehicle_day optional
            + cả hai NULL = không lọc theo chuyến/xe/ngày (khớp mọi giá trị)
            + Khi có điều kiện trips: khoảng **đóng–đóng** `[from, to]` với to NULL = `[from, ∞)`
              Ví dụ: `[1, 3]` và `[4, ∞)` — không dùng `(from, to]` như tấn
            + nếu có to → phải có from và from ≤ to (cho phép 1 điểm [n, n])
            + nếu chỉ có from (to NULL) → `[from, ∞)`
            + min_billable_ton phải NULL
          Match trips: trips >= from AND (to IS NULL OR trips <= to)
        - pricing_unit='tan': trips_* phải NULL; min_billable như BA gốc
        - Overlap:
            • Khoảng tấn chồng giữa Chuyến và Tấn → INVALID_TIERS
            • Cùng unit tan + ton chồng → INVALID_TIERS
            • Cùng unit chuyen + ton chồng + trips chồng theo khoảng đóng
              (NULL-NULL coi phủ toàn bộ trục trips) → INVALID_TIERS
        - Match lookup: đúng 1 bậc; 0 → NOT_FOUND; >1 → INVALID_TIERS (không rõ ràng)
        - User được thêm/xóa bậc; ≥1 bậc / version.
        - Adjust %: nhân giá + copy nguyên trips fields sang version mới.

BR-013' (lookup): query thêm location_text?, note?, trips_per_vehicle_day?
        - is_pallet: không dùng trips / weight
        - Bậc tan: bỏ qua trips
        - Bậc chuyen có điều kiện trips mà thiếu trips_per_vehicle_day → không khớp bậc đó
```

### Công thức tính tiền (không đổi logic gốc)

| Trường hợp | Công thức |
|------------|-----------|
| Pallet | `pallet_trip_price` (1 chuyến); **cho phép = 0** |
| Bậc `chuyen` khớp ton (+ trips nếu có) | `price` (1 chuyến) |
| Bậc `tan` | `bill_ton = max(w, min_billable_ton ?? w)` → `bill_ton × price` |

### `khung_label` / hiển thị FE (Tab Bảng giá)

**Lookup `khung_label` (API):** derive từ from/to ton (+ trips nếu có). Dùng cho `GET /route-pricing/lookup` và UI/API consumers — **không** dùng trong Delivery Import (xem §7).

**UI Tab Bảng giá — cột Trọng lượng (as-built):**
- `≤ 2.5 tấn`, `>8-16`, `>16`
- Min tính: ` (cước tối thiểu 5 tấn)`
- Trips dòng 2: `(Áp dụng chuyến thứ 13 trở lên)` / `(Áp dụng chuyến thứ 1 đến 3)`
- Cột Đơn vị: `vnđ/chuyến` | `vnđ/tấn`
- Pallet = 0 → không hiện dòng pallet

---

## 4. Data Model (delta) — migration 037

```sql
-- delivery_routes
ALTER TABLE delivery_routes ALTER COLUMN ward_code DROP NOT NULL;
ALTER TABLE delivery_routes
  ADD COLUMN IF NOT EXISTS location_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS note VARCHAR(255);

-- CHECK đích XOR
CHECK (
  (ward_code IS NOT NULL AND location_text IS NULL)
  OR (ward_code IS NULL AND location_text IS NOT NULL)
);

-- Unique active (supplier, province, ward, location, note_key)
-- Residual unique active (supplier, province, note_key) WHERE is_residual

-- route_price_tiers
ADD COLUMN from_trips_per_vehicle_day NUMERIC(10,3),
ADD COLUMN to_trips_per_vehicle_day NUMERIC(10,3);
-- CHECK: tan → cả hai NULL; chuyen → cho phép
```

`phuong` denormalized: = `wards.name` khi có ward; = `location_text` khi địa điểm.

Apply: `npx tsx src/scripts/apply-route-pricing-migrations.ts`

---

## 5. API Contract (delta)

Base: `/api/route-pricing`

### Groups POST / PUT

```
Body:
  supplier_id, province_code          -- create
  ward_codes?: string[]               -- XOR với location_text (multi-ward OK)
  location_text?: string | null       -- đúng 1 địa điểm text; KHÔNG có locations[]
  note?: string | null                -- suffix tên + unique residual/route

name vẫn server-side (BR-004c')
```

### Routes POST / PUT

```
Body:
  ward_code?: string | null           -- XOR với location_text
  location_text?: string | null
  note?: string | null
```

### Prices POST — tiers[]

```
{
  from_ton, to_ton?,
  pricing_unit: 'chuyen' | 'tan',
  price,
  min_billable_ton?,                  -- chỉ tan
  from_trips_per_vehicle_day?,        -- chỉ chuyen
  to_trips_per_vehicle_day?           -- chỉ chuyen
}
```

### Lookup GET

```
Query (bổ sung):
  location_text?
  note?
  trips_per_vehicle_day?

(vẫn hỗ trợ: supplier_id, tinh, phuong, province_code, ward_code, weight_mt, is_pallet, as_of)
```

### Error codes thêm / cập nhật

| Code | HTTP | Ý nghĩa |
|------|------|---------|
| INVALID_DESTINATION | 400 | Vừa ward vừa location / đích lặp / thiếu XOR |
| DUPLICATE_ROUTE | 409 | Trùng unique mới (kèm note/location) |
| DUPLICATE_RESIDUAL_GROUP | 409 | Đã có residual cùng note_key cho tỉnh |
| INVALID_TIERS | 400 | Bậc chồng / trips sai unit / ambiguous match |
| AMBIGUOUS_ROUTE | 409 | (reserved) Khớp nhiều nhóm |

---

## 6. UI (delta) — tóm tắt

Chi tiết layout bảng giá: `docs/ui/20260711_route-pricing-ui-spec.md` (Screen 7 chi tiết version).

- **GroupFormModal:** radio Đích = Phường/Xã | Địa điểm (1 text) | Còn lại; preview tên + note
- **GroupsTab:** cột **Đích**
- **PriceVersionFormModal:** Từ/Đến tấn cho mọi đơn vị; Chuyến thêm trips; 🗑 xóa bậc; Pallet ≥ 0
- **Version detail:** bảng 3 cột Trọng lượng | Đơn vị | Đơn giá  
  Format: `≤ 2.5 tấn`, `>8-16`, `>16` + dòng trips; ẩn pallet khi = 0

---

## 7. Delivery Import

**Quyết định (2026-07-13):** Delivery Import **không** tích hợp `GET /route-pricing/lookup`.  
`frontend/src/utils/processDeliveryData.ts` giữ rule hardcode cũ (`getKhungGia`) — độc lập với bảng giá Route Pricing.

### As-built (cột Khung giá / Đơn vị tính)

| Điều kiện | Khung giá | Đơn vị tính |
|-----------|-----------|-------------|
| Biển số / Số tàu-xe bắt đầu `PPH-P` | `Pallet` | `Tấn` |
| Tổng Round(MT) nhóm ≤ 2.5 | `≤2.5MT` | `Chuyến` |
| Tổng Round(MT) nhóm > 16 | `>16-23MT` | `Tấn` |
| Còn lại | `>8-16MT` | `Tấn` |

- Không map theo NCC / phường / `location_text` / `note` / trips.
- Không gọi `supplierCatalogApi` / `routePricingApi` khi xử lý file.
- **Tuyến lên HĐ** vẫn ghép `tuyenPhuong + khungGia + (soXe)` từ customer master + rule trên.

### Lý do / phạm vi

- CR này chỉ ship module Route Pricing (CRUD nhóm, bậc, lookup API, UI).
- Gắn lookup vào Delivery Import cần cột nguồn ổn định (`note`, `trips_per_vehicle_day`, …) và regression nghiệp vụ — **deferred** (xem §10–§11).

### Khi tích hợp lại (follow-up)

- Gọi lookup với `supplier_id` + `phuong` / `location_text` (+ `note`, `trips_per_vehicle_day` nếu có cột nguồn).
- Lookup fail → để trống khung/ĐVT + warning (không fallback hardcode trong luồng API).

---

## 8. Acceptance Criteria

```
AC-CR-01: Form bậc Chuyến hiện Từ/Đến (tấn); lưu + lookup theo (from, to].
AC-CR-02: Tạo 2 residual HCM note="" và note="Đường nhỏ" → OK; tên có/không suffix.
AC-CR-03: Tạo 2 nhóm cùng phường Củ Chi, note khác → OK (unique cũ không chặn).
AC-CR-04: Tạo nhóm location_text="KCN Hiệp Phước" → tên "HCM - KCN Hiệp Phước"; không cần ward.
AC-CR-04b: Gửi locations[] (field không còn) hoặc >1 địa điểm → 400.
AC-CR-05: Hai bậc chuyen cùng (0,2.5] với trips [1, 3] và [4, ∞) → giá khác; lookup theo trips_per_vehicle_day.
AC-CR-06: Bậc tan gửi trips_* → 400 INVALID_TIERS.
AC-CR-07: Form giá: + Thêm bậc và xóa bậc (giữ ≥1).
AC-CR-08: Lookup location_text / note đúng nhóm; không lẫn nhóm "Đường nhỏ".
AC-CR-09: XOR ward+location → INVALID_DESTINATION.
AC-CR-10: Adjust % copy trips fields sang version mới; làm tròn giá hàng nghìn như cũ.
AC-CR-11: pallet_trip_price = 0 được chấp nhận khi tạo bảng giá gốc.
AC-CR-12: Tab Bảng giá hiện `≤ 2.5 tấn` / `>8-16` / `>16`; ẩn pallet khi = 0; trips dạng "(Áp dụng chuyến thứ …)".
```

---

## 9. Files chạm (implement)

| Layer | Path |
|-------|------|
| Migration | `backend/src/migrations/037_route_pricing_location_note_trips.sql` |
| Types | `backend/src/types/routePricing.ts` |
| Service | `backend/src/services/routePricingService.ts` |
| Controller | `backend/src/controllers/routePricingController.ts` |
| Tests | `backend/src/__tests__/routePricingService.test.ts` |
| FE API | `frontend/src/api/routePricingApi.ts` |
| FE Page | `frontend/src/pages/route-pricing/RoutePricingPage.tsx` |
| Import | ~~`processDeliveryData.ts`~~ — **không** đổi theo CR; giữ `getKhungGia` hardcode |
| Docs | know-how / system-features / tasks / UI Spec CR |

---

## 10. Out of scope

- Đồng bộ tự động `customers.tuyen_phuong` → location/note
- Catalog địa điểm riêng (chỉ free-text)
- Điều kiện chuyến/xe/ngày cho Pallet hoặc bậc Tấn
- **Delivery Import gắn Route Pricing lookup** (khung giá / ĐVT từ API) — giữ rule hardcode §7
- Truyền `trips_per_vehicle_day` / `note` từ Delivery Import (chờ cột nguồn + quyết định tích hợp)

---

## 11. Open / follow-up

| # | Item | Ghi chú |
|---|------|--------|
| F1 | Tích hợp Delivery Import ↔ `GET /route-pricing/lookup` | Thay `getKhungGia`; cần supplier map + phường/location |
| F2 | Cột nguồn chuyến/xe/ngày trên file giao hàng | Để lookup chọn đúng bậc Chuyến có trips |
| F3 | Cột / quy ước `note` trên delivery data | Match nhóm `(Đường nhỏ)` |
| F4 | QA regression UI Spec CR | Manual checklist AC-CR-* |
