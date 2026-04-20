# Bug Fix Task List: Rice date parse lệch 1 ngày (UTC vs local)
**Ngày:** 2026-04-19
**Bug:** Upload file data_gao.xlsx → parse ngày 2/3 thành 1/3 → filter trả 0 kết quả
**Root cause:** xlsx `cellDates: true` tạo Date bằng LOCAL constructor → getUTCDate() đọc sai

---

## 🎨 FRONTEND TASKS

| ID | Task | File cần sửa | Mô tả chi tiết | Effort |
|----|------|-------------|----------------|--------|
| BFE-01 | Sửa parseRawDate dùng local methods | `frontend/src/utils/processRiceData.ts` | Trong branch `val instanceof Date` của hàm `parseRawDate`: đổi `val.getUTCFullYear()` → `val.getFullYear()`, `val.getUTCMonth()` → `val.getMonth()`, `val.getUTCDate()` → `val.getDate()` | S |

## 📊 Thứ tự thực hiện
BFE-01

## ⚠️ Ràng buộc khi fix
- Chỉ thay đổi 3 dòng trong hàm parseRawDate, branch instanceof Date
- Không đụng vào excelSerialToDate (đã dùng UTC đúng vì tự tính từ serial)
- Không sửa backend
