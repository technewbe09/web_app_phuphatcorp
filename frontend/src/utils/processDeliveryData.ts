/**
 * processDeliveryData.ts
 *
 * Browser-side utility to process delivery data from ERP Excel files.
 * Ported from scripts/process-delivery-data.cjs to TypeScript for browser use.
 *
 * Logic:
 * 1. Read XLSX file (ArrayBuffer) using xlsx library
 * 2. Skip first 4 rows (company name, address, title, blank) — row 5 = header, row 6+ = data
 * 3. Group rows by (Số tàu/xe + Ngày hóa đơn)
 * 4. Sort each group by Số hóa đơn ascending (numeric-aware)
 * 5. Sort groups by Ngày HĐ ASC then Số tàu/xe ASC
 * 6. Calculate Round(MT) per group = SUM(HĐ-Trọng lượng Net) / 1000 (3 decimal places)
 * 7. Write output Excel with 32 output columns, blank row separator between groups
 */

import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';

// ─── Column index mapping from source file ────────────────────────────────────
const COL = {
  CHANNEL: 0,
  SUB_CHANNEL: 1,
  DIEN_GIAI_CT: 2,
  DIEN_GIAI: 3,
  SLOT: 4,
  WAYBILL_NO: 5,
  SLOT_NO: 6,
  USER_TAO_HD: 7,
  USER_TAO_PXK: 8,
  PO_NUMBER: 9,
  WAREHOUSE_NO: 10,
  WAREHOUSE_NAME: 11,
  MA_PXK: 12,
  SO_CHUNG_TU: 13,
  SO_SERI: 14,
  DIA_CHI: 15,
  TEN_HANG_HOA: 16,
  MA_DVT: 17,
  SP_TRONG_LUONG: 18,
  HD_TRONG_LUONG: 19, // ← used for Round(MT)
  MA_NCC: 20,
  MA_KH: 21,
  TEN_KH: 22,
  MA_HANG: 23,
  TEN_HANG_EN: 24,
  LOAI_HANG: 25,
  MA_LH_GIAO: 26,
  SO_LUONG: 27,
  SO_TAU_XE: 28, // ← group key
  TAI_XE: 29,
  SO_CONT: 30,
  NGAY_HD: 31,   // ← group key
  SO_HD: 32,     // ← sort key
  THONG_TIN_BS: 33,
} as const;

// ─── Factory column mapping ────────────────────────────────────────────────────
const FACTORY_BY_NCC: Record<string, string> = {
  '2000000001': 'CLF',
  '2100000002': 'VFM',
  '2000000007': 'MCC',
  '2000000008': 'NDFC',
};

function getFactory(maNcc: string): string {
  return FACTORY_BY_NCC[maNcc] ?? 'CLV';
}

// ─── Output column headers ─────────────────────────────────────────────────────
const OUTPUT_HEADERS = [
  'Mã nhà cung cấp',
  'Số hóa đơn',
  'Ngày hóa đơn',
  'Số tàu',
  'Mã khách hàng',
  'Tên khách hàng',
  'Địa chỉ giao hàng',
  'Mã hàng hóa',
  'Tên hàng hóa (Vie)',
  'Tên hàng hóa (En)',
  'Mã liên hệ giao hàng',
  'Mã DVT',
  'Số lượng (DVT bán hàng)',
  'SP Trọng lượng net',
  'HĐ Trọng lượng (Net)',
  'Round(MT)',
  'CLF',
  'VFM',
  'MCC',
  'CLV',
  'NDFC',
  'Tài xế',
  'Thông tin bổ sung',
  'Slot',
  'Diễn giải',
  'Channel',
  'SubChannel',
  'SlotNo',
  'user tạo HĐ',
  'User tạo PXK',
  'PO number',
  'Warehouse No',
  'Warehouse Name',
  'Phiếu XK',
  'Chứng từ ghi sổ',
  'Số seri',
  'Loại hàng',
];

// ─── Column widths for output Excel ───────────────────────────────────────────
const COL_WIDTHS = [
  { wch: 15 },  // Mã nhà cung cấp
  { wch: 12 },  // Số hóa đơn
  { wch: 12 },  // Ngày hóa đơn
  { wch: 18 },  // Số tàu
  { wch: 15 },  // Mã khách hàng
  { wch: 35 },  // Tên khách hàng
  { wch: 50 },  // Địa chỉ giao hàng
  { wch: 15 },  // Mã hàng hóa
  { wch: 35 },  // Tên hàng hóa (Vie)
  { wch: 35 },  // Tên hàng hóa (En)
  { wch: 20 },  // Mã liên hệ giao hàng
  { wch: 10 },  // Mã DVT
  { wch: 22 },  // Số lượng (DVT bán hàng)
  { wch: 18 },  // SP Trọng lượng net
  { wch: 20 },  // HĐ Trọng lượng (Net)
  { wch: 10 },  // Round(MT)
  { wch: 10 },  // CLF
  { wch: 10 },  // VFM
  { wch: 10 },  // MCC
  { wch: 10 },  // CLV
  { wch: 10 },  // NDFC
  { wch: 20 },  // Tài xế
  { wch: 20 },  // Thông tin bổ sung
  { wch: 15 },  // Slot
  { wch: 35 },  // Diễn giải
  { wch: 12 },  // Channel
  { wch: 12 },  // SubChannel
  { wch: 10 },  // SlotNo
  { wch: 12 },  // user tạo HĐ
  { wch: 12 },  // User tạo PXK
  { wch: 20 },  // PO number
  { wch: 12 },  // Warehouse No
  { wch: 25 },  // Warehouse Name
  { wch: 18 },  // Phiếu XK
  { wch: 18 },  // Chứng từ ghi sổ
  { wch: 12 },  // Số seri
  { wch: 12 },  // Loại hàng
];

// ─── Types ────────────────────────────────────────────────────────────────────
type RawRow = (string | number | boolean | null | undefined)[];

interface GroupData {
  vehicle: string;
  date: string | number;
  rows: RawRow[];
}

export interface ProcessResult {
  processedRows: number;
  groupCount: number;
  dateRange: { from: string; to: string };
  warnings: string[];
  outputBlob: Blob;
  outputFilename: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert Excel serial date number to DD/MM/YYYY string.
 * If already a string, return as-is.
 */
function excelDateToString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const d = String(parsed.d).padStart(2, '0');
        const m = String(parsed.m).padStart(2, '0');
        return `${d}/${m}/${parsed.y}`;
      }
    } catch {
      // fallback
    }
    return String(value);
  }
  // Already a string — return as-is
  return String(value);
}

/**
 * Get a cell value safely from a row array.
 */
function cell(row: RawRow, index: number): string {
  const val = row[index];
  if (val === null || val === undefined) return '';
  return String(val);
}

/**
 * Map a source row to an output row array.
 * factoryVals: { CLF, VFM, MCC, CLV, NDFC } — value for the row's factory col,
 *   '' for inactive factory cols.
 */
function mapRowToOutput(row: RawRow, factoryVals: Record<string, string | number>): (string | number)[] {
  const roundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 100) / 100;
  return [
    cell(row, COL.MA_NCC),
    cell(row, COL.SO_HD),
    excelDateToString(row[COL.NGAY_HD] as string | number | null | undefined),
    cell(row, COL.SO_TAU_XE).slice(-9),
    cell(row, COL.MA_KH),
    cell(row, COL.TEN_KH),
    cell(row, COL.DIA_CHI),
    cell(row, COL.MA_HANG),
    cell(row, COL.TEN_HANG_HOA),
    cell(row, COL.TEN_HANG_EN),
    cell(row, COL.MA_LH_GIAO),
    cell(row, COL.MA_DVT),
    cell(row, COL.SO_LUONG),
    cell(row, COL.SP_TRONG_LUONG),
    cell(row, COL.HD_TRONG_LUONG),
    roundMT,
    factoryVals['CLF'],
    factoryVals['VFM'],
    factoryVals['MCC'],
    factoryVals['CLV'],
    factoryVals['NDFC'],
    cell(row, COL.TAI_XE),
    cell(row, COL.THONG_TIN_BS),
    cell(row, COL.SLOT),
    cell(row, COL.DIEN_GIAI),
    cell(row, COL.CHANNEL),
    cell(row, COL.SUB_CHANNEL),
    cell(row, COL.SLOT_NO),
    cell(row, COL.USER_TAO_HD),
    cell(row, COL.USER_TAO_PXK),
    cell(row, COL.PO_NUMBER),
    cell(row, COL.WAREHOUSE_NO),
    cell(row, COL.WAREHOUSE_NAME),
    cell(row, COL.MA_PXK),
    cell(row, COL.SO_CHUNG_TU),
    cell(row, COL.SO_SERI),
    cell(row, COL.LOAI_HANG),
  ];
}

// ─── Main processing function ─────────────────────────────────────────────────

/**
 * Read a File object as ArrayBuffer via FileReader.
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Main entry point: process a delivery data XLSX file.
 * Returns a ProcessResult with the output Blob ready for download.
 */
export async function processDeliveryData(file: File): Promise<ProcessResult> {
  const warnings: string[] = [];

  // Read file
  const buffer = await readFileAsArrayBuffer(file);

  // Parse workbook
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Convert to array of arrays
  const rawData = XLSX.utils.sheet_to_json<RawRow>(ws, { header: 1 });

  if (rawData.length < 5) {
    throw new Error('File không đủ dữ liệu. Cần ít nhất 5 dòng (4 dòng header + 1 dòng data).');
  }

  // Skip first 4 rows (metadata), row index 4 is header row, data starts at index 5
  const dataRows = rawData.slice(5).filter((row) => {
    return row && row.length > 0 && row.some((c) => c !== null && c !== undefined && c !== '');
  });

  if (dataRows.length === 0) {
    throw new Error('File không chứa dữ liệu. Vui lòng kiểm tra lại file Excel.');
  }

  // ── Step 1: Group by (Số tàu/xe + Ngày hóa đơn) ──────────────────────────
  const groupMap = new Map<string, GroupData>();

  dataRows.forEach((row) => {
    const vehicle = cell(row, COL.SO_TAU_XE);
    const date = row[COL.NGAY_HD] ?? '';
    const key = `${vehicle}|||${date}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, { vehicle, date: date as string | number, rows: [] });
    }
    groupMap.get(key)!.rows.push(row);
  });

  // ── Step 2: Sort each group by Số hóa đơn ascending ──────────────────────
  for (const group of groupMap.values()) {
    group.rows.sort((a, b) => {
      const invoiceA = cell(a, COL.SO_HD);
      const invoiceB = cell(b, COL.SO_HD);
      return invoiceA.localeCompare(invoiceB, undefined, { numeric: true });
    });
  }

  // ── Step 3: Sort groups by (Ngày HĐ ASC, Số tàu/xe ASC) ─────────────────
  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    const dateA = typeof a.date === 'number' ? a.date : 0;
    const dateB = typeof b.date === 'number' ? b.date : 0;

    if (dateA !== dateB) {
      // Both are numbers → sort numerically
      if (typeof a.date === 'number' && typeof b.date === 'number') {
        return a.date - b.date;
      }
      // Fall back to string comparison
      return String(a.date).localeCompare(String(b.date));
    }
    // Same date → sort by vehicle number
    return a.vehicle.localeCompare(b.vehicle);
  });

  // ── Step 4: Build output rows ─────────────────────────────────────────────
  const outputRows: (string | number)[][] = [OUTPUT_HEADERS];
  const separatorRowIndices = new Set<number>();

  // Collect all dates for dateRange
  const allDates: string[] = [];

  sortedGroups.forEach((group, groupIndex) => {
    // Collect date string for range
    const dateStr = excelDateToString(group.date as string | number | null | undefined);
    if (dateStr) allDates.push(dateStr);

    // Warn if group has missing vehicle number
    if (!group.vehicle) {
      warnings.push(`Nhóm ${groupIndex + 1}: Thiếu số tàu/xe (ngày ${dateStr})`);
    }

    // Pre-calculate SUM(Round(MT)) and factory per invoice within this group
    const invoiceSum = new Map<string, { factory: string; sum: number }>();
    group.rows.forEach((row) => {
      const invoiceNo = cell(row, COL.SO_HD);
      const maNcc = cell(row, COL.MA_NCC);
      const roundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 100) / 100;
      if (!invoiceSum.has(invoiceNo)) {
        invoiceSum.set(invoiceNo, { factory: getFactory(maNcc), sum: 0 });
      }
      const entry = invoiceSum.get(invoiceNo)!;
      entry.sum = Math.round((entry.sum + roundMT) * 100) / 100;
    });

    // Track first-row of each invoice
    const invoiceSeen = new Set<string>();

    // Accumulate group totals for separator row
    let groupRoundMTSum = 0;
    const groupFactorySums: Record<string, number> = { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 };

    // Add rows
    group.rows.forEach((row) => {
      const invoiceNo = cell(row, COL.SO_HD);
      const { factory, sum } = invoiceSum.get(invoiceNo)!;
      const isFirst = !invoiceSeen.has(invoiceNo);
      if (isFirst) invoiceSeen.add(invoiceNo);

      // Build factory column values
      const factoryVals: Record<string, string | number> = {
        CLF: '', VFM: '', MCC: '', CLV: '', NDFC: '',
      };
      factoryVals[factory] = isFirst ? sum : 0;

      // Accumulate group totals
      const rowRoundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 100) / 100;
      groupRoundMTSum = Math.round((groupRoundMTSum + rowRoundMT) * 100) / 100;
      if (isFirst) {
        groupFactorySums[factory] = Math.round((groupFactorySums[factory] + sum) * 100) / 100;
      }

      outputRows.push(mapRowToOutput(row, factoryVals));
    });

    // Add separator row after each group (except the last) with group totals
    if (groupIndex < sortedGroups.length - 1) {
      const separatorRow: (string | number)[] = new Array(OUTPUT_HEADERS.length).fill('');
      separatorRow[15] = groupRoundMTSum;
      separatorRow[16] = groupFactorySums['CLF'] || '';
      separatorRow[17] = groupFactorySums['VFM'] || '';
      separatorRow[18] = groupFactorySums['MCC'] || '';
      separatorRow[19] = groupFactorySums['CLV'] || '';
      separatorRow[20] = groupFactorySums['NDFC'] || '';
      separatorRowIndices.add(outputRows.length);
      outputRows.push(separatorRow);
    }
  });

  // ── Step 5: Build output workbook ─────────────────────────────────────────
  const outWb = new Workbook();
  const outWs = outWb.addWorksheet('Processed');

  outWs.columns = COL_WIDTHS.map((w) => ({ width: w.wch }));

  outputRows.forEach((row, rowIndex) => {
    const excelRow = outWs.addRow(row);
    if (rowIndex === 0) {
      // Yellow background + bold for header row
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.font = { bold: true };
      });
    } else if (separatorRowIndices.has(rowIndex)) {
      // Gray D9D9D9 background for separator rows
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      });
    }
  });

  // Write as array buffer
  const outBuffer = await outWb.xlsx.writeBuffer();
  const outputBlob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Build output filename with timestamp
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const outputFilename = `delivery_processed_${ts}.xlsx`;

  // Date range
  const dateRange =
    allDates.length > 0
      ? { from: allDates[0], to: allDates[allDates.length - 1] }
      : { from: '—', to: '—' };

  return {
    processedRows: dataRows.length,
    groupCount: sortedGroups.length,
    dateRange,
    warnings,
    outputBlob,
    outputFilename,
  };
}
