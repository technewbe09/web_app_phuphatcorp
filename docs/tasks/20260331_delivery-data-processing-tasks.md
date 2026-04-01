# Task List: Delivery Data Processing Feature
**Ngày:** 2026-03-31
**BA Doc:** docs/ba/20260331_delivery-data-processing-analysis.md

---

## ⚙️ BACKEND TASKS

Không có backend tasks — xử lý hoàn toàn client-side trong browser.

---

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| FE-01 | Tạo utility function xử lý data | `src/utils/processDeliveryData.ts` — đọc XLSX, group, sort, tính Round(MT), tạo output blob | M |
| FE-02 | Tạo page DeliveryDataPage | `src/pages/admin/DeliveryDataPage.tsx` — upload zone, processing, success, error states | M |
| FE-03 | Thêm route vào App.tsx | Route `/admin/delivery-data` → DeliveryDataPage | S |
| FE-04 | Thêm sidebar nav item | Thêm vào `navItems` trong `src/layouts/DashboardLayout.tsx` | S |
| FE-05 | Thêm i18n keys | `vi.json` + `en.json` — deliveryData namespace | S |

---

## 📊 Thứ tự thực hiện

FE-01 (utility logic) → FE-02 (page) → FE-03 (route) → FE-04 (sidebar) → FE-05 (i18n)

---

## ⚠️ Lưu ý kỹ thuật

- **xlsx library:** `import * as XLSX from 'xlsx'` — đã có trong devDependencies (`xlsx: ^0.18.5`)
- **File reading:** Dùng `FileReader.readAsArrayBuffer()` + `XLSX.read(buffer, { type: 'array' })`
- **Date conversion:** Excel serial date numbers cần convert sang DD/MM/YYYY bằng `XLSX.SSF.parse_date_code()`
- **Tham chiếu script:** Logic xử lý đã có ở `scripts/process-delivery-data.cjs` — port sang TypeScript
- **Column indices:** Cẩn thận index-based (0-based) vì `XLSX.utils.sheet_to_json(ws, { header: 1 })` trả array of arrays
- **Header skip:** Skip 4 dòng đầu (index 0-3), row index 4 là header, data từ index 5
- **Blob download:** Dùng `XLSX.write(wb, { bookType: 'xlsx', type: 'array' })` → `new Blob([...], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })`
- **Pattern tái sử dụng:** Follow pattern của ExecuteDataPage (drag-drop zone, states, toast notifications)
- **i18n namespace:** Dùng key `deliveryData.*` để không conflict với `executeData.*`
- **Route guard:** Wrap với `<AuthGuard>` + `<AdminGuard>` như các routes khác
