# UI Spec — Delivery Data: Verify Trọng Lượng Trước Khi Xử Lý

**Ngày:** 2026-04-09
**Feature:** Delivery Data Processing — Bước xác nhận điều chỉnh trọng lượng
**Phạm vi:** Chỉ mô tả phần THAY ĐỔI so với UI hiện tại. Phần còn lại giữ nguyên.

---

## 1. Tổng quan thay đổi flow

**Trước:**
```
User click "Xử lý" → [processing] → success
```

**Sau:**
```
User click "Xử lý"
  → [verifying] "Đang kiểm tra dữ liệu..."
      ↓ (parse file + fetch masterdata + so sánh)
  → Không có dòng cần điều chỉnh?
      → [processing] (giữ nguyên flow hiện tại)
  → Có dòng cần điều chỉnh?
      → [awaiting_confirmation] → mở WeightAdjustmentConfirmDialog
          ↓ User xác nhận       ↓ User bỏ qua
          → apply adjustments   → không áp dụng
          → [processing]        → [processing]
          → success             → success
```

---

## 2. State mới của DeliveryDataPage

| State | Hiển thị |
|-------|----------|
| `verifying` | Spinner + text "Đang kiểm tra dữ liệu..." (thay thế "Đang xử lý...") |
| `awaiting_confirmation` | Upload zone ẩn, dialog mở |

### 2.1 State `verifying` — spinner trong upload zone

Giữ nguyên layout spinner hiện tại, chỉ đổi text:
```
[spinner icon]
"Đang kiểm tra dữ liệu..."
"Vui lòng đợi trong giây lát"
```

---

## 3. WeightAdjustmentConfirmDialog

**Component:** `frontend/src/components/delivery-data/WeightAdjustmentConfirmDialog.tsx`
**Base:** dùng `<Modal>` component hiện có, size `xl`

### 3.1 Header

```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Phát hiện dữ liệu cần điều chỉnh trọng lượng      [×] │
│   X dòng có mã sản phẩm khớp masterdata điều chỉnh      │
└─────────────────────────────────────────────────────────┘
```

- Icon: `AlertTriangle` (yellow-500)
- Subtitle: `"{X} dòng có mã sản phẩm khớp với masterdata điều chỉnh trọng lượng"`

### 3.2 Body — Bảng danh sách thay đổi

Scrollable table (max-height ~400px, overflow-y-auto):

| Dòng | Mã hàng | Tên hàng (file) | Tên hàng (masterdata) | HĐ TL gốc | Giá trị áp dụng | Lý do |
|------|---------|----------------|----------------------|-----------|-----------------|-------|
| 6 | SP001 | Sữa tươi | Sữa tươi nguyên kem | 1500 | 1480 | Giá trị cũ |
| 8 | SP002 | Bột mì | Bột mì đa dụng | 2000 | 2050 | Giá trị điều chỉnh |

**Column specs:**
- `Dòng`: số dòng trong file gốc (sourceRowNum), right-align, min-width 50px
- `Mã hàng`: font-mono, min-width 100px
- `Tên hàng (file)`: text-sm, min-width 150px
- `Tên hàng (masterdata)`: text-sm, min-width 150px
- `HĐ TL gốc`: right-align, text-sm
- `Giá trị áp dụng`: right-align, font-semibold, text-sm
- `Lý do`: Badge — "Giá trị cũ" (info/blue), "Giá trị điều chỉnh" (warning/yellow)

### 3.3 Footer

```
[Bỏ qua, xử lý nguyên gốc]  [Xác nhận và xử lý →]
    variant="outline"              variant="primary"
```

- "Bỏ qua" → emit `onSkip()` → process without adjustments
- "Xác nhận và xử lý" → emit `onConfirm()` → apply adjustments then process

---

## 4. Props của WeightAdjustmentConfirmDialog

```typescript
interface AdjustmentRow {
  sourceRowNum: number;      // Số dòng trong file gốc
  maHang: string;            // Mã hàng hóa
  tenHangFile: string;       // Tên hàng hóa trong file
  tenHangMaster: string;     // Tên hàng hóa trong masterdata
  hdTrongLuongGoc: number;   // Giá trị HD_TRONG_LUONG gốc
  giaTriApDung: number;      // Giá trị sẽ thay thế (gia_tri_cu hoặc gia_tri_dieu_chinh)
  lyDo: 'gia_tri_cu' | 'gia_tri_dieu_chinh';  // Lý do thay thế
}

interface WeightAdjustmentConfirmDialogProps {
  isOpen: boolean;
  adjustments: AdjustmentRow[];
  onConfirm: () => void;   // Áp dụng và xử lý
  onSkip: () => void;      // Bỏ qua, xử lý nguyên gốc
}
```

---

## 5. Logic verify (trong DeliveryDataPage)

```
Sau khi parseDeliveryFile(file):
  Fetch masterdata: weightAdjustmentApi.fetchAll()
  Build map: masterdata indexed by ma_hang

  For each rawRow:
    maHang = cell(row, COL.MA_HANG)      // col 23
    tenHang = cell(row, COL.TEN_HANG_HOA) // col 16
    hdTrongLuong = Number(row[COL.HD_TRONG_LUONG]) // col 19

    If maHang in masterMap:
      master = masterMap[maHang]
      If tenHang === master.ten_hang:
        → lyDo = 'gia_tri_cu', giaTriApDung = master.gia_tri_cu
        → (nếu gia_tri_cu null thì bỏ qua dòng này, không điều chỉnh)
      Else:
        → lyDo = 'gia_tri_dieu_chinh', giaTriApDung = master.gia_tri_dieu_chinh
      → Thêm vào adjustments list

  If adjustments.length === 0 → skip dialog, process immediately
  If adjustments.length > 0  → open dialog
```

---

## 6. Không thay đổi

- Upload zone layout (drag/drop, file selection, "Đổi file" button)
- Success result card (Số dòng, Số nhóm, Khoảng ngày, Download)
- Warning card
- Error state
- "Xử lý file mới" button
- processDeliveryData core logic
