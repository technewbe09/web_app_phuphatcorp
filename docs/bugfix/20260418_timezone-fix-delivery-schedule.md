# Bug Fix: Lỗi Timezone Khi Upload Lịch Đi Hàng

## 📅 Ngày: 2026-04-18

## 🐛 Mô tả Bug

### Bug 1: Ngày bị lệch 1 ngày
- **Hiện tượng**: File Excel có ngày **10/4/2026** nhưng hệ thống ghi nhận là **9/4/2026**
- **Tác động**: Dữ liệu lịch đi hàng bị sai ngày

### Bug 2: Range không bao gồm ngày cuối
- **Hiện tượng**: User chọn từ **9/4 → 10/4** nhưng chỉ lưu dữ liệu ngày 9/4, không lưu ngày 10/4
- **Tác động**: Thiếu dữ liệu khi upload theo khoảng thời gian

## 🔍 Root Cause

### Vấn đề timezone conversion
Code cũ sử dụng **UTC timezone** để parse và so sánh ngày, nhưng:
- Server chạy ở **UTC+7** (Vietnam timezone)
- File Excel date được xlsx library parse theo **local timezone (UTC+7)**
- Khi convert qua lại giữa UTC và local time gây ra lệch ngày

### Chi tiết kỹ thuật

**Code cũ (SAI):**
```typescript
// Parse date từ Excel
const parsed = new Date(cell.w); // "4/10/2026" → local time 00:00:00+07:00
return new Date(Date.UTC(
  parsed.getFullYear(),  // 2026
  parsed.getMonth(),     // 3 (April)
  parsed.getDate()       // 10
));
// → KẾT QUẢ: 2026-04-09T17:00:00.000Z (UTC)
// → Khi lưu DB: 9/4 thay vì 10/4 ❌
```

**Vấn đề**: `new Date("4/10/2026")` tạo Date object ở local timezone, nhưng khi extract components rồi tạo UTC date lại bị lệch.

## ✅ Giải pháp

### Approach: Loại bỏ hoàn toàn Date objects, dùng string comparison

**Code mới (ĐÚNG):**
```typescript
// 1. Parse Excel date → YYYY-MM-DD string (local timezone)
parseExcelDateToString(cell: XLSX.CellObject): string | null {
  if (cell.t === 'd' && cell.v instanceof Date) {
    const d = cell.v; // Already in local time (UTC+7)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // ... handle other formats
}

// 2. So sánh bằng string thay vì Date objects
const dateStr = this.parseExcelDateToString(cell);
if (dateStr && dateStr >= fromDate && dateStr <= toDate) {
  // Process this date
}

// 3. Lưu trực tiếp string vào DB
rowsToInsert.push({
  ngay: dateStr, // "2026-04-10"
  // ...
});
```

### Lợi ích của approach này:
- ✅ Không có timezone conversion → không lệch ngày
- ✅ String comparison (`>=`, `<=`) hoạt động chính xác với format YYYY-MM-DD
- ✅ Đơn giản, dễ debug
- ✅ Nhất quán: input (Excel) và output (DB) đều là string YYYY-MM-DD

## 🧪 Test Results

```
✅ "4/10/2026" → 2026-04-10 (không còn lệch sang 9/4)
✅ "4/9/2026" → 2026-04-09
✅ Range "9/4 → 10/4" bao gồm CẢ 2 NGÀY
✅ "4/11/2026" nằm ngoài range (đúng)
```

## 📝 Files Changed

1. **backend/src/services/deliveryScheduleService.ts**
   - Đổi `parseExcelDate()` thành `parseExcelDateToString()`
   - Return `string` thay vì `Date` object
   - So sánh date bằng string thay vì Date comparison
   - Lưu DB trực tiếp bằng string (không dùng `.toISOString()`)

## 🚀 Deployment

1. Build lại backend:
   ```bash
   cd backend && npm run build
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

3. Test với file Excel thật

## 📋 Test Checklist

- [x] Parse date từ Excel format MM/DD/YYYY
- [x] Parse date từ Excel format DD/MM/YYYY
- [x] Parse date từ Excel Date object
- [x] Range comparison bao gồm ngày đầu và ngày cuối
- [x] Ngày ngoài range bị bỏ qua
- [ ] Test với file Excel thật (user cần verify)

## 🎯 Expected Behavior Sau Fix

1. Upload file Excel có ngày **10/4/2026** → DB lưu đúng **10/4/2026** ✅
2. Chọn range **9/4 → 10/4** → Lưu dữ liệu cho **CẢ 9/4 VÀ 10/4** ✅
3. Không còn lệch timezone giữa Excel, server, và database ✅

---

**Author**: Claude Opus 4.6
**Date**: 2026-04-18
**Status**: ✅ Fixed & Ready for Testing
