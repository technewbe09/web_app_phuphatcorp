# Test Checklist: Excel Number Format Bug Fix
**Ngày:** 2026-04-18
**Bug:** Output Excel mất thousand separator format
**Fix:** Apply `numFmt` property cho number cells trong exceljs

---

## 🧪 Manual Test Cases

### Test Case 1: Số lượng với thousand separator
**Input:** File Excel có cột "Số lượng" = `10.000` (10000)
**Expected:** Output Excel hiển thị `10.000` (với thousand separator)
**Steps:**
1. Upload file delivery data có Số lượng = 10000
2. Xử lý file thành công
3. Download output Excel
4. Mở file Excel → Sheet "Processed" → Cột "Số lượng (DVT bán hàng)"
5. Verify hiển thị `10.000` (không phải `10000`)

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 2: SP Trọng lượng với decimal
**Input:** File Excel có "SP Trọng lượng net" = `1234.567`
**Expected:** Output hiển thị `1.234.567` (3 decimals + thousand separator)
**Steps:**
1. Upload file có SP Trọng lượng = 1234.567
2. Download output
3. Mở Sheet "Processed" → Cột "SP Trọng lượng net"
4. Verify format `1.234.567`

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 3: HĐ Trọng lượng với decimal
**Input:** File Excel có "HĐ Trọng lượng (Net)" = `5678.123`
**Expected:** Output hiển thị `5.678.123`
**Steps:**
1. Upload file có HĐ Trọng lượng = 5678.123
2. Download output
3. Mở Sheet "Processed" → Cột "HĐ Trọng lượng (Net)"
4. Verify format `5.678.123`

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 4: Round(MT) với decimal
**Input:** Calculated Round(MT) = `25.123`
**Expected:** Output hiển thị `25.123` (3 decimals)
**Steps:**
1. Upload file → trigger calculation Round(MT)
2. Download output
3. Mở Sheet "Processed" → Cột "Round(MT)"
4. Verify format `25.123`

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 5: Separator rows với tổng
**Input:** Group có tổng Round(MT) = `45.678`
**Expected:** Separator row hiển thị `45.678` với format đúng
**Steps:**
1. Upload file có nhiều groups
2. Download output
3. Mở Sheet "Processed"
4. Tìm separator row (background màu xám) giữa các groups
5. Verify col Round(MT), CLF/VFM/MCC/CLV/NDFC hiển thị đúng format

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 6: Factory sheets - Tấn/Chuyến
**Input:** Factory sheet CLF có "Tấn/Chuyến" = `13.45`
**Expected:** Output hiển thị `13.450` (3 decimals)
**Steps:**
1. Upload file có data cho factory CLF
2. Download output
3. Mở Sheet "CLF"
4. Tìm cột "Tấn/Chuyến" (col 16) ở dòng đầu khối
5. Verify format `13.450`

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 7: Factory sheets - Tấn/Hóa đơn
**Input:** Factory sheet VFM có "Tấn/Hóa đơn" = `7.2`
**Expected:** Output hiển thị `7.200` (3 decimals)
**Steps:**
1. Upload file có data cho factory VFM
2. Download output
3. Mở Sheet "VFM"
4. Tìm cột "Tấn/Hóa đơn" (col 17) ở dòng đầu invoice
5. Verify format `7.200`

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 8: Header row không bị ảnh hưởng
**Input:** Any file
**Expected:** Header row vẫn bold + yellow background, không apply number format
**Steps:**
1. Upload file bất kỳ
2. Download output
3. Mở Sheet "Processed"
4. Verify row 1 (header) vẫn có:
   - Background màu vàng
   - Font bold
   - Text hiển thị bình thường (không bị format thành number)

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 9: Text columns không bị ảnh hưởng
**Input:** File có "Tên khách hàng" = `"Công ty ABC"`
**Expected:** Text columns vẫn hiển thị bình thường
**Steps:**
1. Upload file
2. Download output
3. Mở Sheet "Processed"
4. Verify các cột text (Tên KH, Địa chỉ, Tên hàng hóa) hiển thị đúng
5. Không bị convert thành number hoặc format sai

**Status:** [ ] Pass / [ ] Fail

---

### Test Case 10: Tất cả 6 sheets đều có format
**Input:** File có data đầy đủ
**Expected:** Cả 6 sheets (Processed + CLF/VFM/MCC/CLV/NDFC) đều có number format
**Steps:**
1. Upload file có data đầy đủ
2. Download output
3. Mở từng sheet: Processed, CLF, VFM, MCC, CLV, NDFC
4. Verify tất cả đều có thousand separator cho number columns

**Status:** [ ] Pass / [ ] Fail

---

## 📊 Test Summary

- Total test cases: 10
- Passed: ___
- Failed: ___
- Blocker issues: ___

## 🐛 Issues Found

*(Ghi lại nếu có test case fail)*

| Test Case | Issue | Severity |
|-----------|-------|----------|
| TC-X | [Mô tả issue] | High/Medium/Low |

---

## ✅ Sign-off

- [ ] Tất cả test cases pass
- [ ] Không có regression (chức năng cũ vẫn hoạt động)
- [ ] Output file format đúng chuẩn Excel

**Tested by:** _______________
**Date:** _______________
