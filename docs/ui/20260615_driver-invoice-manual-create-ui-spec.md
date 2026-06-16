# UI Spec: Tạo mới / Sửa hóa đơn tài xế & Đối chiếu ngược
**Ngày:** 2026-06-15
**BA Doc:** docs/ba/20260615_driver-invoice-manual-create-analysis.md

---

## 1. User Journey

### Happy Path — Tạo mới
```
DriverInvoicesPage → Bấm "Tạo mới" → Modal Create mở → Nhập form → Bấm "Lưu"
→ Toast: "Đã tạo hóa đơn, cập nhật X hóa đơn đối chiếu" → List tự refresh
```

### Happy Path — Sửa số HĐ
```
DriverInvoicesPage → Bấm icon Sửa → Modal Edit mở → Sửa số HĐ → Bấm "Lưu"
→ Toast: "Cập nhật thành công, cập nhật X hóa đơn đối chiếu" → List tự refresh
```

### Error Paths
- Form thiếu trường bắt buộc → inline error đỏ dưới từng field
- Trùng dữ liệu (409) → toast lỗi: "Dữ liệu trùng lặp"
- Network error → toast lỗi: "Không thể lưu"

---

## 2. Screen Inventory

### 2.1 Update: DriverInvoicesPage (`/vehicle-data/driver-invoices`)

**Thay đổi:** Thêm nút "Tạo mới" bên cạnh nút "Upload Excel".

```
[ Tạo mới ]  [ Upload Excel ]  ← 2 nút cạnh nhau
```

**Giữ nguyên:** Toàn bộ layout table, filters, pagination, edit/delete action.

### 2.2 Component: DriverInvoiceCreateModal (NEW)

**Layout:** Giống hệt `DriverInvoiceEditModal`, nhưng:
- Tiêu đề: "Tạo hóa đơn tài xế" (thay vì "Sửa hóa đơn tài xế")
- Form rỗng ban đầu (không pre-fill)
- Nút submit: "Tạo mới"

**States:**

| State | Mô tả | UI |
|-------|-------|-----|
| **idle** | Form rỗng, chưa nhập gì | Các input rỗng, nút Lưu enabled |
| **submitting** | Đang gửi request | Nút Lưu disabled + spinner |
| **error** | Lỗi từ server | Inline error đỏ dưới field liên quan hoặc toast |

**Form fields (giống EditModal):**
- Mã (`ma`) — required, max 50
- Tên tài xế (`ten_tx`) — required, max 255
- Ngày (`ngay`) — required, date input
- Số xe (`so_xe`) — required, max 50
- Nơi giao (`noi_giao`) — required, max 255
- Ghi chú (`ghi_chu`) — optional
- Số hóa đơn (`so_hoa_don`) — dynamic list, nút + để thêm, nút x để xóa

### 2.3 Update: DriverInvoiceEditModal

**Thay đổi:** Toast message sau khi update thành công hiển thị thêm số lượng đã reconcile.

```
Trước: "Cập nhật hóa đơn thành công"
Sau:   "Cập nhật hóa đơn thành công, cập nhật X hóa đơn đối chiếu"
```

---

## 3. Component Checklist

| Component | File | Thay đổi |
|-----------|------|----------|
| `DriverInvoicesPage` | `pages/admin/accounting-data/DriverInvoicesPage.tsx` | Thêm nút "Tạo mới" + state cho modal create |
| `DriverInvoiceCreateModal` | `components/accounting-data/DriverInvoiceCreateModal.tsx` | **NEW** — form tạo mới |
| `DriverInvoiceEditModal` | `components/accounting-data/DriverInvoiceEditModal.tsx` | Cập nhật toast message |
| `useDriverInvoices` hook | `hooks/useDriverInvoices.ts` | Thêm `useCreateDriverInvoice` hook |

---

## 4. Validation UX

| Trigger | Validation | UX |
|---------|------------|-----|
| Bấm Lưu khi thiếu field bắt buộc | Client-side: react-hook-form | Inline error đỏ dưới field |
| Số HĐ rỗng | Client-side: array empty | Toast: "Cần ít nhất 1 số hóa đơn" |
| Trùng dữ liệu | Server trả 409 | Toast lỗi đỏ: "Dữ liệu trùng lặp" |
| Lỗi server | Server trả 500 | Toast lỗi đỏ + message |

---

## 5. i18n Keys (Thêm vào `vi.json`)

```json
{
  "driverInvoice": {
    "create": "Tạo mới",
    "createTitle": "Tạo hóa đơn tài xế",
    "createSuccess": "Đã tạo hóa đơn, cập nhật {count} hóa đơn đối chiếu",
    "updateSuccess": "Cập nhật thành công, cập nhật {count} hóa đơn đối chiếu"
  }
}
```
