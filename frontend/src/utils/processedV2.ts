import ExcelJS from 'exceljs';

export const PROCESSED_SHEET_NAME = 'Processed';
export const PROCESSED_V2_SHEET_NAME = 'Processed v2';

export const NUM_FMT_QTY = '#,##0';
export const NUM_FMT_WEIGHT = '#,##0.000';

/**
 * Normalizes string or any cell value to a number.
 * Handles commas, dots, spaces, etc.
 * Returns null if the value is empty, null, undefined, or not a valid number.
 */
export function parseCellToNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  if (typeof val === 'object' && val !== null) {
    if ('result' in val) {
      return parseCellToNumber((val as any).result);
    }
    if ('sharedFormula' in val || 'formula' in val) {
      return null;
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return null;

    // Remove whitespace
    let cleaned = trimmed.replace(/\s+/g, '');

    // Handle thousand separators & decimal points
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
        // e.g. "1.234,56" -> remove dots, replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // e.g. "1,234.56" -> remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only comma:
      if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
        // e.g. "1,234" or "1,234,567"
        cleaned = cleaned.replace(/,/g, '');
      } else if (/^\d+,\d{1,2}$/.test(cleaned)) {
        // Decimal comma e.g. "12,5"
        cleaned = cleaned.replace(',', '.');
      } else {
        // Standard comma removal
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Extracts raw primitive value from an ExcelJS cell value.
 * If the cell contains a formula or shared formula object, extracts the pre-calculated `result`
 * (or null if no result exists), avoiding orphan sharedFormula clones when columns/rows are moved.
 */
export function extractCellValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if ('result' in val) {
      return val.result !== undefined ? val.result : null;
    }
    if ('sharedFormula' in val || 'formula' in val) {
      return null;
    }
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('');
    }
    if ('text' in val) {
      return val.text;
    }
  }
  return val;
}

export interface ProcessedV2ColIndices {
  colO: number; // Số lượng (DVT bán hàng)
  colP: number; // SP Trọng lượng net
  colQ: number; // HĐ Trọng lượng (Net)
  headerRowIdx: number;
}

/**
 * Finds column indices for Quantity (O), SP Net Weight (P), and HD Net Weight (Q)
 * by inspecting header rows 1-3. Fallbacks to columns 15, 16, 17.
 */
export function detectProcessedV2Columns(sheet: ExcelJS.Worksheet): ProcessedV2ColIndices {
  let headerRowIdx = 1;
  let colO = 15; // Col O
  let colP = 16; // Col P
  let colQ = 17; // Col Q

  for (let r = 1; r <= 3; r++) {
    const row = sheet.getRow(r);
    let foundCount = 0;
    row.eachCell((cell, colNumber) => {
      const txt = String(cell.value || '').trim().toLowerCase();
      if (txt) foundCount++;
      if (txt.includes('số lượng') || txt.includes('so luong') || txt.includes('dvt bán hàng')) {
        colO = colNumber;
      } else if (txt.includes('sp trọng lượng') || txt.includes('sp trong luong')) {
        colP = colNumber;
      } else if (txt.includes('hđ trọng lượng') || txt.includes('hd trọng lượng') || txt.includes('hd trong luong')) {
        colQ = colNumber;
      }
    });
    if (foundCount > 10) {
      headerRowIdx = r;
      break;
    }
  }

  return { colO, colP, colQ, headerRowIdx };
}

export interface SourceColMapping {
  headerRowIdx: number;
  colMaNcc: number;
  colSoHd: number;
  colNgayHd: number;
  colSoTau: number;
  colKhungGia: number;
  colO: number;
  colP: number;
  colQ: number;
  col5Nha: number;
  colClf: number;
  colVfm: number;
  colMcc: number;
  colClv: number;
  colNdfc: number;
  colGao: number | null;
  colTaiXe: number;
}

export function detectAllSourceColumns(sheet: ExcelJS.Worksheet): SourceColMapping {
  let headerRowIdx = 1;
  let colMaNcc = 1;
  let colSoHd = 2;
  let colNgayHd = 3;
  let colSoTau = 4;
  let colKhungGia = 8;
  let colO = 15;
  let colP = 16;
  let colQ = 17;
  let col5Nha = 24; // Cột X cũ
  let colClf = 19;
  let colVfm = 20;
  let colMcc = 21;
  let colClv = 22;
  let colNdfc = 23;
  let colGao: number | null = null;
  let colTaiXe = 26;

  for (let r = 1; r <= 3; r++) {
    const row = sheet.getRow(r);
    let foundCount = 0;
    row.eachCell((cell, colNumber) => {
      const txt = String(cell.value || '').trim().toLowerCase();
      if (txt) foundCount++;
      if (txt.includes('mã nhà cung cấp') || txt.includes('ma nha cung cap') || txt.includes('mã ncc') || txt.includes('ma ncc')) {
        colMaNcc = colNumber;
      } else if (txt.includes('số hóa đơn') || txt.includes('so hoa don') || txt.includes('số hđ') || txt.includes('so hd')) {
        colSoHd = colNumber;
      } else if (txt.includes('ngày hóa đơn') || txt.includes('ngay hoa don') || txt.includes('ngày hđ') || txt.includes('ngay hd')) {
        colNgayHd = colNumber;
      } else if (txt.includes('số tàu') || txt.includes('so tau') || txt.includes('số xe') || txt.includes('so xe')) {
        colSoTau = colNumber;
      } else if (txt.includes('khung giá') || txt.includes('khung gia')) {
        colKhungGia = colNumber;
      } else if (txt.includes('số lượng') || txt.includes('so luong') || txt.includes('dvt bán hàng')) {
        colO = colNumber;
      } else if (txt.includes('sp trọng lượng') || txt.includes('sp trong luong')) {
        colP = colNumber;
      } else if (txt.includes('hđ trọng lượng') || txt.includes('hd trọng lượng') || txt.includes('hd trong luong')) {
        colQ = colNumber;
      } else if (txt.includes('clf')) {
        colClf = colNumber;
      } else if (txt.includes('vfm')) {
        colVfm = colNumber;
      } else if (txt.includes('mcc')) {
        colMcc = colNumber;
      } else if (txt.includes('clv')) {
        colClv = colNumber;
      } else if (txt.includes('ndfc')) {
        colNdfc = colNumber;
      } else if (txt.includes('gạo') || txt.includes('gao')) {
        colGao = colNumber;
      } else if (txt.includes('tài xế') || txt.includes('tai xe')) {
        colTaiXe = colNumber;
      } else if (txt.includes('5 nhà') || txt.includes('5 nha')) {
        col5Nha = colNumber;
      }
    });
    if (foundCount > 10) {
      headerRowIdx = r;
      break;
    }
  }

  return {
    headerRowIdx,
    colMaNcc,
    colSoHd,
    colNgayHd,
    colSoTau,
    colKhungGia,
    colO,
    colP,
    colQ,
    col5Nha,
    colClf,
    colVfm,
    colMcc,
    colClv,
    colNdfc,
    colGao,
    colTaiXe,
  };
}

/**
 * Determines Khung giá based on trip weight (from 5 nhà total) and pallet flag.
 * Brackets:
 * - <= 2.5: '≤2.5 tấn'
 * - 2.5 < weight <= 8: '>2.5-8 tấn' (label only; the sheet keeps the source khung)
 * - 8 < weight <= 16: '>8-16 tấn'
 * - 16 < weight <= 23: '>16-23 tấn'
 * - > 23: '>23 tấn'
 * If isPallet: the word 'Pallet' only.
 */
export function determineKhungGia(weight: number, isPallet: boolean): string {
  if (isPallet) return 'Pallet';

  if (weight <= 2.5) return '≤2.5 tấn';
  if (weight <= 8) return '>2.5-8 tấn';
  if (weight <= 16) return '>8-16 tấn';
  if (weight <= 23) return '>16-23 tấn';
  return '>23 tấn';
}

const KHUNG_CHANGED_FILL = 'FFFFE599';
const SPLIT_CHECK_FILL = 'FFF8CBAD';
const SPLIT_CHECK_NOTE = 'Cần kiểm tra tách chuyến';

interface TripBlock {
  rows: number[];
  weight: number;
  isPallet: boolean;
  originalKhung: string;
  vehicleKey: string;
  invoices: string[];
}

interface BlockCols {
  col5Nha: number;
  colKhungGia: number;
  colSoTau: number;
  colSoHd: number;
}

function normalizeVehicleKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function isLightSplitKhung(khung: string): boolean {
  return khung.trim() === '≤2.5 tấn';
}

function isLargeVehicleTrip(block: TripBlock): boolean {
  return block.isPallet || block.weight > 8;
}

function isTripSeparator(
  maNcc: string,
  soHd: string,
  soTau: string,
  roundMt: number | null,
  fiveNha: number | null,
): boolean {
  if (maNcc || soHd || soTau) return false;
  return roundMt !== null || fiveNha !== null;
}

function sheetCellText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${value.getFullYear()}`;
  }
  return String(value ?? '').trim();
}

function resolveBlockWeight(
  sheet: ExcelJS.Worksheet,
  rows: number[],
  sepWeight: number | null,
  col5Nha: number,
): number {
  let finalWeight = sepWeight;
  if (finalWeight === null || finalWeight === 0) {
    const firstRow5Nha = parseCellToNumber(sheet.getRow(rows[0]).getCell(col5Nha).value);
    if (firstRow5Nha !== null && firstRow5Nha > 0) {
      finalWeight = firstRow5Nha;
    } else {
      let sumW = 0;
      for (const rIdx of rows) {
        const row = sheet.getRow(rIdx);
        const weight = parseCellToNumber(row.getCell(col5Nha).value) || parseCellToNumber(row.getCell(18).value) || 0;
        sumW += weight;
      }
      finalWeight = Math.round(sumW * 1000) / 1000;
    }
  }
  return finalWeight ?? 0;
}

function describeTripBlock(
  sheet: ExcelJS.Worksheet,
  rows: number[],
  sepWeight: number | null,
  cols: BlockCols,
): TripBlock {
  let isPallet = false;
  const invoices: string[] = [];
  const seenInvoices = new Set<string>();
  let vehicle = '';

  for (const rIdx of rows) {
    const row = sheet.getRow(rIdx);
    const soTau = sheetCellText(row.getCell(cols.colSoTau).value);
    const khung = sheetCellText(row.getCell(cols.colKhungGia).value);
    if (/pph-p|-p/i.test(soTau) || /pallet/i.test(khung)) {
      isPallet = true;
    }
    if (!vehicle && soTau) vehicle = soTau;
    const invoice = sheetCellText(row.getCell(cols.colSoHd).value);
    if (invoice && !seenInvoices.has(invoice)) {
      seenInvoices.add(invoice);
      invoices.push(invoice);
    }
  }

  return {
    rows,
    weight: resolveBlockWeight(sheet, rows, sepWeight, cols.col5Nha),
    isPallet,
    originalKhung: sheetCellText(sheet.getRow(rows[0]).getCell(cols.colKhungGia).value),
    vehicleKey: normalizeVehicleKey(vehicle),
    invoices,
  };
}

function keepsSourceKhung(block: TripBlock, warned: boolean): boolean {
  if (warned) return true;
  return !block.isPallet && block.weight > 2.5 && block.weight <= 8;
}

function hasOtherLargeTrip(blocks: TripBlock[], index: number): boolean {
  const vehicleKey = blocks[index].vehicleKey;
  if (!vehicleKey) return false;
  return blocks.some((other, otherIndex) =>
    otherIndex !== index && other.vehicleKey === vehicleKey && isLargeVehicleTrip(other),
  );
}

function applyKhungGia(
  sheet: ExcelJS.Worksheet,
  block: TripBlock,
  colKhungGia: number,
  notes: { row: number; text: string }[],
): void {
  const calculated = determineKhungGia(block.weight, block.isPallet);
  for (const rIdx of block.rows) {
    const cell = sheet.getRow(rIdx).getCell(colKhungGia);
    const originalKg = sheetCellText(cell.value);
    if (originalKg !== calculated) {
      cell.value = calculated;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: KHUNG_CHANGED_FILL },
      };
      notes.push({ row: rIdx, text: originalKg });
    }
  }
}

function markSplitCheck(
  sheet: ExcelJS.Worksheet,
  block: TripBlock,
  note: string,
  colKhungGia: number,
  notes: { row: number; text: string }[],
): void {
  for (const rIdx of block.rows) {
    const cell = sheet.getRow(rIdx).getCell(colKhungGia);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: SPLIT_CHECK_FILL },
    };
    notes.push({ row: rIdx, text: note });
  }
}

function bumpCellRow(ref: string): string {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!match) return ref;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function followHeaderFreeze(sheet: ExcelJS.Worksheet): void {
  const views = sheet.views;
  if (!Array.isArray(views) || views.length === 0) return;
  sheet.views = views.map((view) => {
    if (view.state !== 'frozen' && view.state !== 'split') return view;
    const next = { ...view };
    if (typeof next.ySplit === 'number' && next.ySplit > 0) {
      next.ySplit += 1;
    }
    if (typeof next.topLeftCell === 'string') {
      next.topLeftCell = bumpCellRow(next.topLeftCell);
    }
    if (typeof next.activeCell === 'string' && next.activeCell) {
      next.activeCell = bumpCellRow(next.activeCell);
    }
    return next;
  });
}

function insertSplitCheckBanner(sheet: ExcelJS.Worksheet, invoices: string[]): void {
  const text = invoices.length > 0
    ? `Cần kiểm tra tách chuyến: ${invoices.join(', ')}`
    : 'Cần kiểm tra tách chuyến: không có';
  sheet.insertRow(1, [text]);
  const cell = sheet.getRow(1).getCell(1);
  cell.value = text;
  cell.font = { bold: true };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: SPLIT_CHECK_FILL },
  };
  followHeaderFreeze(sheet);
}

function copySourceCell(
  dstCell: ExcelJS.Cell,
  srcCell: ExcelJS.Cell,
  cloneStyle: (style: ExcelJS.Cell['style']) => ExcelJS.Cell['style'],
): void {
  dstCell.value = extractCellValue(srcCell.value);
  if (srcCell.style) dstCell.style = cloneStyle(srcCell.style);
  if (srcCell.numFmt) dstCell.numFmt = srcCell.numFmt;
  if (srcCell.note) dstCell.note = srcCell.note;
}

/** O, P, Q, Round(MT): text số thành number. Ô không phải số giữ nguyên chữ. */
function applyMeasuredNumber(dstCell: ExcelJS.Cell, srcVal: unknown, numFmt: string): void {
  const numVal = parseCellToNumber(srcVal);
  if (numVal !== null) {
    dstCell.value = numVal;
    dstCell.numFmt = numFmt;
    return;
  }
  dstCell.value = srcVal !== null && srcVal !== undefined ? (srcVal as ExcelJS.CellValue) : '';
}

/** CLF, VFM, MCC, CLV, NDFC: ép number, ô không phải số thành ô trống. */
function applySupplierWeight(dstCell: ExcelJS.Cell, srcVal: unknown): void {
  const numVal = parseCellToNumber(srcVal);
  if (numVal !== null) {
    dstCell.value = numVal;
    dstCell.numFmt = NUM_FMT_WEIGHT;
    return;
  }
  dstCell.value = '';
  dstCell.numFmt = NUM_FMT_WEIGHT;
}

/**
 * 5 nhà và Gạo: số sẵn có giữ giá trị và format.
 * Chữ đọc được thành số thì ghi number với format tải trọng.
 * Chữ khác giữ nguyên.
 */
function applySourceWeightColumn(dstCell: ExcelJS.Cell, srcVal: unknown): void {
  if (typeof srcVal === 'number' && !Number.isNaN(srcVal)) {
    dstCell.value = srcVal;
    return;
  }
  if (typeof srcVal === 'string') {
    const numVal = parseCellToNumber(srcVal);
    if (numVal !== null) {
      dstCell.value = numVal;
      dstCell.numFmt = NUM_FMT_WEIGHT;
      return;
    }
  }
  dstCell.value = srcVal !== null && srcVal !== undefined ? (srcVal as ExcelJS.CellValue) : '';
}

/**
 * Duplicates the 'Processed' sheet into 'Processed v2'.
 * Column order, headers, and the 5 nhà / Gạo values stay on the same cells as Processed.
 * Trip weight for Khung giá is the 5 nhà figure already on the separator row.
 */
export function generateProcessedV2Sheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const sourceSheet =
    workbook.worksheets.find(
      (ws) => ws.name.trim().toLowerCase() === PROCESSED_SHEET_NAME.toLowerCase()
    ) || workbook.getWorksheet(PROCESSED_SHEET_NAME);

  if (!sourceSheet) {
    throw new Error('MISSING_PROCESSED_SHEET');
  }

  // If Processed v2 already exists, remove it
  const existingV2 = workbook.getWorksheet(PROCESSED_V2_SHEET_NAME);
  if (existingV2) {
    workbook.removeWorksheet(existingV2.id);
  }

  const v2Ws = workbook.addWorksheet(PROCESSED_V2_SHEET_NAME);

  const srcMapping = detectAllSourceColumns(sourceSheet);
  const headerRowIdx = srcMapping.headerRowIdx;
  const supplierCols = new Set([
    srcMapping.colClf,
    srcMapping.colVfm,
    srcMapping.colMcc,
    srcMapping.colClv,
    srcMapping.colNdfc,
  ]);
  supplierCols.delete(srcMapping.col5Nha);
  if (srcMapping.colGao !== null) supplierCols.delete(srcMapping.colGao);

  let maxSrcCols = sourceSheet.columnCount || 0;
  sourceSheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      if (colNumber > maxSrcCols) maxSrcCols = colNumber;
    });
  });

  for (let c = 1; c <= maxSrcCols; c++) {
    const srcCol = sourceSheet.getColumn(c);
    if (srcCol && srcCol.width) {
      v2Ws.getColumn(c).width = srcCol.width;
    }
  }

  // Copy views if available
  if (sourceSheet.views) {
    try {
      v2Ws.views = JSON.parse(JSON.stringify(sourceSheet.views));
    } catch {
      // ignore
    }
  }

  // Helper for deep copying cell style
  const cloneStyle = (style: any) => {
    if (!style) return {};
    try {
      return JSON.parse(JSON.stringify(style));
    } catch {
      return { ...style };
    }
  };

  // Copy and transform rows
  for (let r = 1; r <= sourceSheet.rowCount; r++) {
    const srcRow = sourceSheet.getRow(r);
    const dstRow = v2Ws.getRow(r);
    if (srcRow.height) {
      dstRow.height = srcRow.height;
    }

    srcRow.eachCell({ includeEmpty: false }, (cell, c) => {
      copySourceCell(dstRow.getCell(c), cell, cloneStyle);
    });

    if (r <= headerRowIdx) continue;

    const coerceColumn = (col: number, apply: (dstCell: ExcelJS.Cell, srcVal: unknown) => void) => {
      const srcCell = srcRow.getCell(col);
      apply(dstRow.getCell(col), extractCellValue(srcCell.value));
    };

    coerceColumn(srcMapping.colO, (dstCell, srcVal) => applyMeasuredNumber(dstCell, srcVal, NUM_FMT_QTY));
    coerceColumn(srcMapping.colP, (dstCell, srcVal) => applyMeasuredNumber(dstCell, srcVal, NUM_FMT_WEIGHT));
    coerceColumn(srcMapping.colQ, (dstCell, srcVal) => applyMeasuredNumber(dstCell, srcVal, NUM_FMT_WEIGHT));
    coerceColumn(18, (dstCell, srcVal) => applyMeasuredNumber(dstCell, srcVal, NUM_FMT_WEIGHT));

    for (const col of supplierCols) {
      coerceColumn(col, applySupplierWeight);
    }
    coerceColumn(srcMapping.col5Nha, applySourceWeightColumn);
    if (srcMapping.colGao !== null) {
      coerceColumn(srcMapping.colGao, applySourceWeightColumn);
    }
  }

  // Update Khung giá from the 5 nhà number copied off Processed.
  // A missing header still reads column 24. Weight in (2.5, 8] keeps the source khung.
  // A plate is large when another trip in this file is over 8 tons or Pallet.
  // A block whose source khung is exactly '≤2.5 tấn' and whose weight is at most
  // 2.5 tons is flagged when that plate is large. The flagged block keeps its khung.
  const col5NhaDst = srcMapping.col5Nha;
  const colKhungGiaDst = srcMapping.colKhungGia;
  const colSoTauDst = srcMapping.colSoTau;
  const colSoHdDst = srcMapping.colSoHd;
  const colMaNccDst = srcMapping.colMaNcc;
  const blockCols: BlockCols = {
    col5Nha: col5NhaDst,
    colKhungGia: colKhungGiaDst,
    colSoTau: colSoTauDst,
    colSoHd: colSoHdDst,
  };

  const blocks: TripBlock[] = [];
  let currentBlockRows: number[] = [];

  const pushBlock = (blockRows: number[], sepWeight5Nha: number | null) => {
    if (blockRows.length === 0) return;
    blocks.push(describeTripBlock(v2Ws, blockRows, sepWeight5Nha, blockCols));
  };

  // Check if sheet uses separator rows
  let hasSeparatorRows = false;
  for (let r = headerRowIdx + 1; r <= v2Ws.rowCount; r++) {
    const row = v2Ws.getRow(r);
    const maNccVal = String(row.getCell(colMaNccDst).value || '').trim();
    const soHdVal = String(row.getCell(colSoHdDst).value || '').trim();
    const soTauVal = String(row.getCell(colSoTauDst).value || '').trim();
    const cell5NhaNum = parseCellToNumber(row.getCell(col5NhaDst).value);
    const roundMtNum = parseCellToNumber(row.getCell(18).value);
    if (isTripSeparator(maNccVal, soHdVal, soTauVal, roundMtNum, cell5NhaNum)) {
      hasSeparatorRows = true;
      break;
    }
  }

  for (let r = headerRowIdx + 1; r <= v2Ws.rowCount; r++) {
    const row = v2Ws.getRow(r);
    const maNccVal = String(row.getCell(colMaNccDst).value || '').trim();
    const soHdVal = String(row.getCell(colSoHdDst).value || '').trim();
    const soTauVal = String(row.getCell(colSoTauDst).value || '').trim();
    const cell5NhaNum = parseCellToNumber(row.getCell(col5NhaDst).value);
    const roundMtNum = parseCellToNumber(row.getCell(18).value);

    // Check if row has any non-empty cell
    let hasAnyCell = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        hasAnyCell = true;
      }
    });
    if (!hasAnyCell) {
      continue;
    }

    // Check if separator row:
    const isSeparatorRow = isTripSeparator(maNccVal, soHdVal, soTauVal, roundMtNum, cell5NhaNum);

    if (isSeparatorRow) {
      pushBlock(currentBlockRows, cell5NhaNum);
      currentBlockRows = [];
    } else {
      // Only split by truck change if the sheet does NOT use separator rows
      if (!hasSeparatorRows && currentBlockRows.length > 0 && soTauVal) {
        const prevRow = v2Ws.getRow(currentBlockRows[currentBlockRows.length - 1]);
        const prevSoTau = String(prevRow.getCell(colSoTauDst).value || '').trim();
        if (prevSoTau && soTauVal !== prevSoTau) {
          pushBlock(currentBlockRows, null);
          currentBlockRows = [];
        }
      }
      currentBlockRows.push(r);
    }
  }

  if (currentBlockRows.length > 0) {
    pushBlock(currentBlockRows, null);
  }

  const warnedFlags = blocks.map((block, index) => {
    if (!isLightSplitKhung(block.originalKhung) || block.weight > 2.5) return false;
    return hasOtherLargeTrip(blocks, index);
  });

  const pendingNotes: { row: number; text: string }[] = [];

  blocks.forEach((block, index) => {
    if (keepsSourceKhung(block, warnedFlags[index])) return;
    applyKhungGia(v2Ws, block, colKhungGiaDst, pendingNotes);
  });

  const bannerInvoices: string[] = [];
  const seenBannerInvoices = new Set<string>();
  blocks.forEach((block, index) => {
    if (!warnedFlags[index]) return;
    markSplitCheck(v2Ws, block, SPLIT_CHECK_NOTE, colKhungGiaDst, pendingNotes);
    for (const invoice of block.invoices) {
      if (seenBannerInvoices.has(invoice)) continue;
      seenBannerInvoices.add(invoice);
      bannerInvoices.push(invoice);
    }
  });

  insertSplitCheckBanner(v2Ws, bannerInvoices);
  for (const item of pendingNotes) {
    v2Ws.getRow(item.row + 1).getCell(colKhungGiaDst).note = item.text;
  }

  return v2Ws;
}
