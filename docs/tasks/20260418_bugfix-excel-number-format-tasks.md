# Bug Fix Task List: Excel Number Format - Thousand Separator
**Ngày:** 2026-04-18
**Bug:** Output Excel mất thousand separator format cho cột số (Số lượng, SP Trọng lượng, HĐ Trọng lượng)
**Root cause:** exceljs write cells không set `numFmt` property → numbers hiển thị thuần (10000 thay vì 10.000)

---

## 🎨 FRONTEND TASKS

| ID    | Task | File cần sửa | Mô tả chi tiết | Effort |
|-------|------|--------------|----------------|--------|
| BFE-01 | Apply number format cho data cells | `frontend/src/utils/processDeliveryData.ts` | Trong `writeSheetRows()` function (line ~800-812), sau khi `ws.addRow(row)`, loop qua các cells có index number và set `cell.numFmt` property | M |
| BFE-02 | Define number format constants | `frontend/src/utils/processDeliveryData.ts` | Tạo constants cho number format patterns:<br>- `NUM_FMT_THOUSAND = '#,##0'` (cho Số lượng - integer)<br>- `NUM_FMT_DECIMAL = '#,##0.000'` (cho SP/HĐ Trọng lượng, Round(MT) - 3 decimals) | S |
| BFE-03 | Map column indices to format types | `frontend/src/utils/processDeliveryData.ts` | Tạo helper hoặc inline logic để xác định column nào dùng format gì:<br><br>**Sheet Processed (39 cols):**<br>- Col 12: Số lượng → `NUM_FMT_THOUSAND`<br>- Col 13: SP Trọng lượng → `NUM_FMT_DECIMAL`<br>- Col 14: HĐ Trọng lượng → `NUM_FMT_DECIMAL`<br>- Col 15: Round(MT) → `NUM_FMT_DECIMAL`<br>- Col 16-20: CLF/VFM/MCC/CLV/NDFC → `NUM_FMT_DECIMAL`<br>- Col 21-22: Col1/Col2 → `NUM_FMT_DECIMAL`<br><br>**Factory sheets (41 cols):**<br>- Col 12: Số lượng → `NUM_FMT_THOUSAND`<br>- Col 13: SP Trọng lượng → `NUM_FMT_DECIMAL`<br>- Col 14: HĐ Trọng lượng → `NUM_FMT_DECIMAL`<br>- Col 15: Round(MT) → `NUM_FMT_DECIMAL`<br>- Col 16: Tấn/Chuyến → `NUM_FMT_DECIMAL`<br>- Col 17: Tấn/Hóa đơn → `NUM_FMT_DECIMAL`<br>- Col 18-22: CLF/VFM/MCC/CLV/NDFC → `NUM_FMT_DECIMAL`<br>- Col 23-24: Col1/Col2 → `NUM_FMT_DECIMAL` | M |

## 📊 Thứ tự thực hiện

1. **BFE-02** → Define constants trước
2. **BFE-03** → Map column indices to format
3. **BFE-01** → Apply format trong writeSheetRows()

## 💻 Implementation Detail

### BFE-02: Constants
```typescript
// Add near top of file, after imports
const NUM_FMT_THOUSAND = '#,##0';         // Integer với thousand separator
const NUM_FMT_DECIMAL = '#,##0.000';      // Decimal 3 chữ số với thousand separator
```

### BFE-03: Column format mapping
```typescript
// Processed sheet (39 cols)
const PROCESSED_NUMBER_COLS = {
  12: NUM_FMT_THOUSAND,  // Số lượng
  13: NUM_FMT_DECIMAL,   // SP Trọng lượng
  14: NUM_FMT_DECIMAL,   // HĐ Trọng lượng
  15: NUM_FMT_DECIMAL,   // Round(MT)
  16: NUM_FMT_DECIMAL,   // CLF
  17: NUM_FMT_DECIMAL,   // VFM
  18: NUM_FMT_DECIMAL,   // MCC
  19: NUM_FMT_DECIMAL,   // CLV
  20: NUM_FMT_DECIMAL,   // NDFC
  21: NUM_FMT_DECIMAL,   // Col1
  22: NUM_FMT_DECIMAL,   // Col2
};

// Factory sheets (41 cols)
const FACTORY_NUMBER_COLS = {
  12: NUM_FMT_THOUSAND,  // Số lượng
  13: NUM_FMT_DECIMAL,   // SP Trọng lượng
  14: NUM_FMT_DECIMAL,   // HĐ Trọng lượng
  15: NUM_FMT_DECIMAL,   // Round(MT)
  16: NUM_FMT_DECIMAL,   // Tấn/Chuyến
  17: NUM_FMT_DECIMAL,   // Tấn/Hóa đơn
  18: NUM_FMT_DECIMAL,   // CLF
  19: NUM_FMT_DECIMAL,   // VFM
  20: NUM_FMT_DECIMAL,   // MCC
  21: NUM_FMT_DECIMAL,   // CLV
  22: NUM_FMT_DECIMAL,   // NDFC
  23: NUM_FMT_DECIMAL,   // Col1
  24: NUM_FMT_DECIMAL,   // Col2
};
```

### BFE-01: Apply format in writeSheetRows()
```typescript
function writeSheetRows(
  ws: ReturnType<typeof outWb.addWorksheet>,
  rows: (string | number)[][],
  sepIndices: Set<number>,
  colWidths: { wch: number }[] = COL_WIDTHS,
  isFactorySheet: boolean = false  // NEW param
) {
  ws.columns = colWidths.map((w) => ({ width: w.wch }));

  const numberColsMap = isFactorySheet ? FACTORY_NUMBER_COLS : PROCESSED_NUMBER_COLS;

  rows.forEach((row, rowIndex) => {
    const excelRow = ws.addRow(row);

    // Apply styling (existing code)
    if (rowIndex === 0) {
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.font = { bold: true };
      });
    } else if (sepIndices.has(rowIndex)) {
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      });
    }

    // NEW: Apply number format
    excelRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const colIndex = colNumber - 1; // exceljs uses 1-based index
      const numFmt = numberColsMap[colIndex];
      if (numFmt && typeof cell.value === 'number') {
        cell.numFmt = numFmt;
      }
    });
  });
}
```

### Update function calls
```typescript
// Line ~816
const outWs = outWb.addWorksheet('Processed');
writeSheetRows(outWs, outputRows, separatorRowIndices, COL_WIDTHS, false);  // isFactorySheet=false

// Line ~819-821
FACTORY_NAMES.forEach((factory) => {
  const factoryWs = outWb.addWorksheet(factory);
  writeSheetRows(factoryWs, factorySheetRows[factory], factorySeparatorRowIndices[factory], COL_WIDTHS_FACTORY, true);  // isFactorySheet=true
});
```

## ⚠️ Lưu ý kỹ thuật

1. **Column index mapping:** Processed sheet có 39 cols, Factory sheets có 41 cols → cần 2 maps riêng biệt
2. **ExcelJS cell indexing:** `eachCell()` callback nhận `colNumber` 1-based → cần `-1` để match với array index 0-based
3. **Type check:** Chỉ apply `numFmt` khi `typeof cell.value === 'number'` để tránh lỗi với text/date cells
4. **Empty cells:** Dùng `eachCell({ includeEmpty: false })` khi apply format → bỏ qua cells rỗng
5. **Backward compatibility:** Không thay đổi cách parse file input → chỉ thay đổi output formatting
6. **Separator rows:** Separator rows cũng có number cells (col 15, 16-20, 21-22) → cũng cần format
7. **Header row:** Header row (rowIndex === 0) không có number values → skip tự động bởi type check

## 🧪 Test cases cần verify

1. **Input có Số lượng = 10000** → Output hiển thị `10.000`
2. **Input có SP Trọng lượng = 1234.567** → Output hiển thị `1.234.567`
3. **Separator rows có tổng Round(MT) = 25.123** → hiển thị `25.123`
4. **Factory sheets col Tấn/Chuyến = 13.45** → hiển thị `13.450` (3 decimals)
5. **Header row không bị ảnh hưởng** → vẫn bold + yellow background
6. **Text columns không bị ảnh hưởng** → Tên KH, Địa chỉ vẫn hiển thị bình thường

## Coding Standards
Đọc `.claude/knowhow/coding_convention.md` trước khi viết code.

---

**Estimated total effort:** M (Medium - khoảng 1-2 giờ)
**Priority:** Medium (không block nghiệp vụ, chỉ ảnh hưởng UX khi đọc output)
