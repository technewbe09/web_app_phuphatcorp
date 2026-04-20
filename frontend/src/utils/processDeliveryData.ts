/**
 * processDeliveryData.ts
 *
 * Browser-side utility to process delivery data from ERP Excel files.
 * Ported from scripts/process-delivery-data.cjs to TypeScript for browser use.
 *
 * Logic:
 * 1. Read XLSX file (ArrayBuffer) using xlsx library
 * 2. Skip first 4 rows (company name, address, title, blank) — row 5 = header, row 6+ = data
 * 3. Group rows by (Số tàu/xe + Ngày hóa đơn + Tên khách hàng)
 *    - Nếu SUM(HĐ Trọng lượng)/1000 < 13: giữ nguyên group key
 *    - Nếu SUM(HĐ Trọng lượng)/1000 >= 13 và Thông tin bổ sung có từ 2 giá trị trở lên:
 *      thêm Thông tin bổ sung vào group key
 * 4. Sort each group by Số hóa đơn ascending (numeric-aware)
 * 5. Sort groups by Ngày HĐ ASC then Số tàu/xe ASC
 * 6. Calculate Round(MT) per group = SUM(HĐ-Trọng lượng Net) / 1000 (3 decimal places)
 * 7. Write output Excel with output columns, blank row separator between groups
 */

import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';

// ─── Excel number format patterns ─────────────────────────────────────────────
const NUM_FMT_THOUSAND = '#,##0';         // Integer với thousand separator
const NUM_FMT_DECIMAL = '#,##0.000';      // Decimal 3 chữ số với thousand separator

// ─── Column index mapping from source file ────────────────────────────────────
export const COL = {
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
  '',
  '',
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

// ─── Factory sheet headers (41 cols) ──────────────────────────────────────────
// Chèn 2 cột mới ngay sau Round(MT) (col 15):
//   Col 16: Tấn/ Chuyến — tổng tấn của factory trong khối, chỉ hiển thị ở dòng đầu khối
//   Col 17: Tấn/ Hóa đơn — tổng tấn của invoice đó theo factory, chỉ hiển thị ở dòng đầu invoice
// Các cột CLF/VFM/MCC/CLV/NDFC và sau đó bị đẩy sang phải 2 vị trí (col 18-22, 23-24, 25-40)
const FACTORY_OUTPUT_HEADERS = [
  'Mã nhà cung cấp',       // 0
  'Số hóa đơn',            // 1
  'Ngày hóa đơn',          // 2
  'Số tàu',                // 3
  'Mã khách hàng',         // 4
  'Tên khách hàng',        // 5
  'Địa chỉ giao hàng',     // 6
  'Mã hàng hóa',           // 7
  'Tên hàng hóa (Vie)',    // 8
  'Tên hàng hóa (En)',     // 9
  'Mã liên hệ giao hàng',  // 10
  'Mã DVT',                // 11
  'Số lượng (DVT bán hàng)', // 12
  'SP Trọng lượng net',    // 13
  'HĐ Trọng lượng (Net)',  // 14
  'Round(MT)',              // 15
  'Tấn/ Chuyến',           // 16 ← mới
  'Tấn/ Hóa đơn',          // 17 ← mới
  'CLF',                   // 18
  'VFM',                   // 19
  'MCC',                   // 20
  'CLV',                   // 21
  'NDFC',                  // 22
  '',                      // 23
  '',                      // 24
  'Tài xế',                // 25
  'Thông tin bổ sung',     // 26
  'Slot',                  // 27
  'Diễn giải',             // 28
  'Channel',               // 29
  'SubChannel',            // 30
  'SlotNo',                // 31
  'user tạo HĐ',           // 32
  'User tạo PXK',          // 33
  'PO number',             // 34
  'Warehouse No',          // 35
  'Warehouse Name',        // 36
  'Phiếu XK',              // 37
  'Chứng từ ghi sổ',       // 38
  'Số seri',               // 39
  'Loại hàng',             // 40
];

// ─── Column widths for output Excel ───────────────────────────────────────────
// Factory col widths: 41 cols (chèn 2 cột mới ở vị trí 16-17, sau Round(MT))
const COL_WIDTHS_FACTORY: { wch: number }[] = [
  { wch: 15 },  // 0  Mã nhà cung cấp
  { wch: 12 },  // 1  Số hóa đơn
  { wch: 12 },  // 2  Ngày hóa đơn
  { wch: 18 },  // 3  Số tàu
  { wch: 15 },  // 4  Mã khách hàng
  { wch: 35 },  // 5  Tên khách hàng
  { wch: 50 },  // 6  Địa chỉ giao hàng
  { wch: 15 },  // 7  Mã hàng hóa
  { wch: 35 },  // 8  Tên hàng hóa (Vie)
  { wch: 35 },  // 9  Tên hàng hóa (En)
  { wch: 20 },  // 10 Mã liên hệ giao hàng
  { wch: 10 },  // 11 Mã DVT
  { wch: 22 },  // 12 Số lượng (DVT bán hàng)
  { wch: 18 },  // 13 SP Trọng lượng net
  { wch: 20 },  // 14 HĐ Trọng lượng (Net)
  { wch: 10 },  // 15 Round(MT)
  { wch: 14 },  // 16 Tấn/ Chuyến ← mới
  { wch: 14 },  // 17 Tấn/ Hóa đơn ← mới
  { wch: 10 },  // 18 CLF
  { wch: 10 },  // 19 VFM
  { wch: 10 },  // 20 MCC
  { wch: 10 },  // 21 CLV
  { wch: 10 },  // 22 NDFC
  { wch: 12 },  // 23 Col1 (tổng đầu khối)
  { wch: 12 },  // 24 Col2 (tổng tất cả dòng)
  { wch: 20 },  // 25 Tài xế
  { wch: 20 },  // 26 Thông tin bổ sung
  { wch: 15 },  // 27 Slot
  { wch: 35 },  // 28 Diễn giải
  { wch: 12 },  // 29 Channel
  { wch: 12 },  // 30 SubChannel
  { wch: 10 },  // 31 SlotNo
  { wch: 12 },  // 32 user tạo HĐ
  { wch: 12 },  // 33 User tạo PXK
  { wch: 20 },  // 34 PO number
  { wch: 12 },  // 35 Warehouse No
  { wch: 25 },  // 36 Warehouse Name
  { wch: 18 },  // 37 Phiếu XK
  { wch: 18 },  // 38 Chứng từ ghi sổ
  { wch: 12 },  // 39 Số seri
  { wch: 12 },  // 40 Loại hàng
];

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
  { wch: 12 },  // Col1 (tổng đầu khối)
  { wch: 12 },  // Col2 (tổng tất cả dòng)
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

// ─── Number format column mappings ────────────────────────────────────────────
// Processed sheet (39 cols)
const PROCESSED_NUMBER_COLS: Record<number, string> = {
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
const FACTORY_NUMBER_COLS: Record<number, string> = {
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

// ─── Types ────────────────────────────────────────────────────────────────────
export type RawRow = (string | number | boolean | null | undefined)[];

interface GroupData {
  vehicle: string;
  date: string | number;
  rows: RawRow[];
}

export interface ParsedFileData {
  rawRows: RawRow[];
  sourceRowNums: number[];
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
export function cell(row: RawRow, index: number): string {
  const val = row[index];
  if (val === null || val === undefined) return '';
  return String(val);
}

/**
 * Map a source row to an output row array.
 * factoryVals: { CLF, VFM, MCC, CLV, NDFC } — value for the row's factory col,
 *   '' for inactive factory cols.
 */
function mapRowToOutput(row: RawRow, factoryVals: Record<string, string | number>, isFirstInGroup: boolean, groupRoundMTTotal: number): (string | number)[] {
  const roundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 1000) / 1000;
  return [
    cell(row, COL.MA_NCC) || 'CLV',
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
    isFirstInGroup ? groupRoundMTTotal : 0,
    groupRoundMTTotal,
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

// ─── File parsing ─────────────────────────────────────────────────────────────

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
 * Parse a delivery XLSX file into raw rows + source row numbers.
 * Skips the first 4 metadata rows and the header row (row 5).
 * Filters out empty rows.
 * Use this when you need to inspect or modify rows before processing.
 */
export async function parseDeliveryFile(file: File): Promise<ParsedFileData> {
  const buffer = await readFileAsArrayBuffer(file);

  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<RawRow>(ws, { header: 1 });

  if (rawData.length < 5) {
    throw new Error('File không đủ dữ liệu. Cần ít nhất 5 dòng (4 dòng header + 1 dòng data).');
  }

  const rawRows: RawRow[] = [];
  const sourceRowNums: number[] = [];

  rawData.slice(5).forEach((row, i) => {
    if (row && row.length > 0 && row.some((c) => c !== null && c !== undefined && c !== '')) {
      rawRows.push(row);
      sourceRowNums.push(i + 6);
    }
  });

  if (rawRows.length === 0) {
    throw new Error('File không chứa dữ liệu. Vui lòng kiểm tra lại file Excel.');
  }

  return { rawRows, sourceRowNums };
}

// ─── Core processing from raw rows ───────────────────────────────────────────

/**
 * Process delivery data from pre-parsed raw rows.
 * Use this when you've already called parseDeliveryFile() and optionally
 * modified the rows (e.g. weight adjustments).
 */
export async function processDeliveryDataFromRows(
  dataRows: RawRow[],
  sourceRowNums: number[]
): Promise<ProcessResult> {
  const warnings: string[] = [];

  // ── Validate rows — generate specific warnings ────────────────────────────
  dataRows.forEach((row, idx) => {
    const soHD    = cell(row, COL.SO_HD);
    const soTauXe = cell(row, COL.SO_TAU_XE);
    const ngayHD  = excelDateToString(row[COL.NGAY_HD] as string | number | null | undefined);
    const tenKH   = cell(row, COL.TEN_KH);
    const rowRef  = `[Dòng ${sourceRowNums[idx]}]`;

    if (!soTauXe) {
      const detail = [soHD && `HĐ: ${soHD}`, ngayHD && `Ngày: ${ngayHD}`, tenKH && `KH: ${tenKH}`]
        .filter(Boolean).join(' | ');
      warnings.push(`${rowRef} Thiếu Số tàu/xe${detail ? ` — ${detail}` : ''}`);
    }
    if (!row[COL.NGAY_HD] && row[COL.NGAY_HD] !== 0) {
      const detail = [soHD && `HĐ: ${soHD}`, soTauXe && `Số tàu: ${soTauXe}`, tenKH && `KH: ${tenKH}`]
        .filter(Boolean).join(' | ');
      warnings.push(`${rowRef} Thiếu Ngày hóa đơn${detail ? ` — ${detail}` : ''}`);
    }
    if (!soHD) {
      const detail = [soTauXe && `Số tàu: ${soTauXe}`, ngayHD && `Ngày: ${ngayHD}`, tenKH && `KH: ${tenKH}`]
        .filter(Boolean).join(' | ');
      warnings.push(`${rowRef} Thiếu Số hóa đơn${detail ? ` — ${detail}` : ''}`);
    }
  });

  // ── Step 1: Group by (Số tàu/xe + Ngày hóa đơn + Tên khách hàng) ──────────
  // Bước 1a: Group sơ bộ theo (Số tàu/xe + Ngày HĐ + Tên KH)
  const preliminaryGroupMap = new Map<string, RawRow[]>();

  dataRows.forEach((row) => {
    const vehicle = cell(row, COL.SO_TAU_XE);
    const date = row[COL.NGAY_HD] ?? '';
    const customerName = cell(row, COL.TEN_KH);
    const key = `${vehicle}|||${date}|||${customerName}`;

    if (!preliminaryGroupMap.has(key)) {
      preliminaryGroupMap.set(key, []);
    }
    preliminaryGroupMap.get(key)!.push(row);
  });

  // Bước 1b: Kiểm tra SUM(HĐ Trọng lượng)/1000 >= 13 và điều chỉnh group key nếu cần
  const groupMap = new Map<string, GroupData>();

  preliminaryGroupMap.forEach((rows, prelimKey) => {
    const [vehicle, date, customerName] = prelimKey.split('|||');

    // Tính tổng HĐ Trọng lượng / 1000 của group này
    const totalHDTrongLuong = rows.reduce((sum, row) => {
      return sum + (Number(row[COL.HD_TRONG_LUONG]) || 0);
    }, 0);
    const totalMT = totalHDTrongLuong / 1000;

    // Nếu SUM(HĐ Trọng lượng)/1000 >= 13, kiểm tra "Thông tin bổ sung"
    if (totalMT >= 13) {
      // Nhóm lại theo "Thông tin bổ sung" nếu có từ 2 giá trị trở lên
      const subGroups = new Map<string, RawRow[]>();

      rows.forEach((row) => {
        const thongTinBS = cell(row, COL.THONG_TIN_BS);

        // Đếm số giá trị trong "Thông tin bổ sung" (phân tách bằng dấu phẩy hoặc xuống dòng)
        const values = thongTinBS
          .split(/[,\n\r]+/)
          .map(v => v.trim())
          .filter(v => v.length > 0);

        const hasMultipleValues = values.length >= 2;

        // Nếu có từ 2 giá trị → dùng group key mới (có Thông tin bổ sung)
        // Nếu không → dùng group key cũ (không có Thông tin bổ sung)
        const finalKey = hasMultipleValues
          ? `${vehicle}|||${date}|||${customerName}|||${thongTinBS}`
          : `${vehicle}|||${date}|||${customerName}`;

        if (!subGroups.has(finalKey)) {
          subGroups.set(finalKey, []);
        }
        subGroups.get(finalKey)!.push(row);
      });

      // Add tất cả sub-groups vào groupMap chính
      subGroups.forEach((subRows, finalKey) => {
        if (!groupMap.has(finalKey)) {
          groupMap.set(finalKey, {
            vehicle,
            date: date as string | number,
            rows: []
          });
        }
        groupMap.get(finalKey)!.rows.push(...subRows);
      });
    } else {
      // SUM(HĐ Trọng lượng)/1000 < 13 → giữ nguyên group key (Số tàu/xe + Ngày HĐ + Tên KH)
      const finalKey = prelimKey;
      if (!groupMap.has(finalKey)) {
        groupMap.set(finalKey, {
          vehicle,
          date: date as string | number,
          rows: []
        });
      }
      groupMap.get(finalKey)!.rows.push(...rows);
    }
  });

  // ── Step 2: Sort each group by Số hóa đơn ASC, then Mã NCC ASC ───────────
  for (const group of groupMap.values()) {
    group.rows.sort((a, b) => {
      const invoiceA = cell(a, COL.SO_HD);
      const invoiceB = cell(b, COL.SO_HD);
      const invoiceCompare = invoiceA.localeCompare(invoiceB, undefined, { numeric: true });
      if (invoiceCompare !== 0) return invoiceCompare;

      // Secondary sort: Mã nhà cung cấp ASC
      const nccA = cell(a, COL.MA_NCC);
      const nccB = cell(b, COL.MA_NCC);
      return nccA.localeCompare(nccB, undefined, { numeric: true });
    });
  }

  // ── Step 3: Sort groups by (Ngày HĐ ASC, Số tàu/xe ASC) ─────────────────
  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    const dateA = typeof a.date === 'number' ? a.date : 0;
    const dateB = typeof b.date === 'number' ? b.date : 0;

    if (dateA !== dateB) {
      if (typeof a.date === 'number' && typeof b.date === 'number') {
        return a.date - b.date;
      }
      return String(a.date).localeCompare(String(b.date));
    }
    return a.vehicle.localeCompare(b.vehicle);
  });

  // ── Step 4: Build output rows ─────────────────────────────────────────────
  const outputRows: (string | number)[][] = [OUTPUT_HEADERS];
  const separatorRowIndices = new Set<number>();

  // Per-factory sheet data: header + data rows + separator row tracking
  const FACTORY_NAMES = ['CLF', 'VFM', 'MCC', 'CLV', 'NDFC'] as const;
  type FactoryName = typeof FACTORY_NAMES[number];
  const factorySheetRows: Record<FactoryName, (string | number)[][]> = {
    CLF: [FACTORY_OUTPUT_HEADERS], VFM: [FACTORY_OUTPUT_HEADERS], MCC: [FACTORY_OUTPUT_HEADERS],
    CLV: [FACTORY_OUTPUT_HEADERS], NDFC: [FACTORY_OUTPUT_HEADERS],
  };
  const factorySeparatorRowIndices: Record<FactoryName, Set<number>> = {
    CLF: new Set(), VFM: new Set(), MCC: new Set(), CLV: new Set(), NDFC: new Set(),
  };

  const allDates: string[] = [];

  sortedGroups.forEach((group, groupIndex) => {
    const dateStr = excelDateToString(group.date as string | number | null | undefined);
    if (dateStr) allDates.push(dateStr);

    const invoiceFactorySums = new Map<string, number>();
    group.rows.forEach((row) => {
      const invoiceNo = cell(row, COL.SO_HD);
      const factory = getFactory(cell(row, COL.MA_NCC));
      const roundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 1000) / 1000;
      const key = `${invoiceNo}|||${factory}`;
      invoiceFactorySums.set(key, Math.round(((invoiceFactorySums.get(key) ?? 0) + roundMT) * 1000) / 1000);
    });

    const invoiceFactorySeen = new Set<string>();

    let groupRoundMTSum = 0;
    const groupFactorySums: Record<string, number> = { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 };

    const groupRoundMTTotal = group.rows.reduce((sum, row) => {
      const roundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 1000) / 1000;
      return Math.round((sum + roundMT) * 1000) / 1000;
    }, 0);

    // Track per-factory group sums and row counts for sheet con separator rows
    const factoryGroupRoundMTSums: Record<FactoryName, number> = {
      CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0,
    };
    const factoryGroupFactorySums: Record<FactoryName, Record<string, number>> = {
      CLF: { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 },
      VFM: { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 },
      MCC: { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 },
      CLV: { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 },
      NDFC: { CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0 },
    };
    // Track if each factory sheet has any data row in this group (for conditional separator)
    const factoryGroupHasRows: Record<FactoryName, boolean> = {
      CLF: false, VFM: false, MCC: false, CLV: false, NDFC: false,
    };
    // Track row index within each factory's group (to detect first row of group in factory sheet)
    const factoryGroupRowIndex: Record<FactoryName, number> = {
      CLF: 0, VFM: 0, MCC: 0, CLV: 0, NDFC: 0,
    };

    group.rows.forEach((row, groupRowIndex) => {
      const invoiceNo = cell(row, COL.SO_HD);
      const currentFactory = getFactory(cell(row, COL.MA_NCC)) as FactoryName;
      const seenKey = `${invoiceNo}|||${currentFactory}`;
      const isFirstForFactory = !invoiceFactorySeen.has(seenKey);
      if (isFirstForFactory) invoiceFactorySeen.add(seenKey);

      const factoryVals: Record<string, string | number> = {
        CLF: '', VFM: '', MCC: '', CLV: '', NDFC: '',
      };
      const factorySum = invoiceFactorySums.get(seenKey)!;
      factoryVals[currentFactory] = isFirstForFactory ? factorySum : 0;

      const rowRoundMT = Math.round((Number(row[COL.HD_TRONG_LUONG]) || 0) / 1000 * 1000) / 1000;
      groupRoundMTSum = Math.round((groupRoundMTSum + rowRoundMT) * 1000) / 1000;
      if (isFirstForFactory) {
        groupFactorySums[currentFactory] = Math.round((groupFactorySums[currentFactory] + factorySum) * 1000) / 1000;
      }

      const outputRow = mapRowToOutput(row, factoryVals, groupRowIndex === 0, groupRoundMTTotal);
      outputRows.push(outputRow);

      // ── Build factory sheet row (41 cols = 39 base + Tấn/Chuyến + Tấn/Hóa đơn) ──
      factoryGroupHasRows[currentFactory] = true;
      factoryGroupRoundMTSums[currentFactory] = Math.round(
        (factoryGroupRoundMTSums[currentFactory] + rowRoundMT) * 1000
      ) / 1000;
      if (isFirstForFactory) {
        factoryGroupFactorySums[currentFactory][currentFactory] = Math.round(
          (factoryGroupFactorySums[currentFactory][currentFactory] + factorySum) * 1000
        ) / 1000;
      }

      // We'll push to factory sheet after we have factoryGroupRoundMTSums finalised —
      // but we need a deferred approach since we know totals only after full group scan.
      // Solution: push now with placeholder, then overwrite dòng đầu khối after group loop.
      // Instead, track rows and patch after the group.rows.forEach loop.
      factoryGroupRowIndex[currentFactory] += 1;
      factorySheetRows[currentFactory].push(outputRow);
    });

    // ── Build factory sheet rows (41 cols, layout theo FACTORY_OUTPUT_HEADERS) ─
    // Thực hiện sau khi scan xong toàn bộ group để biết đủ factoryGroupRoundMTSums.
    // Factory row layout (41 cols):
    //   0-15: giống Process (Mã NCC → Round(MT))
    //   16: Tấn/ Chuyến  ← chỉ dòng đầu khối
    //   17: Tấn/ Hóa đơn ← chỉ dòng đầu invoice
    //   18-22: CLF/VFM/MCC/CLV/NDFC  ← dòng đầu khối = group sums; còn lại = invoice-level
    //   23-24: Col1/Col2 (tổng đầu khối / tổng tất cả dòng)
    //   25-40: metadata (Tài xế, Thông tin BS, ...)
    FACTORY_NAMES.forEach((factory) => {
      if (!factoryGroupHasRows[factory]) return;

      const groupRowCount = factoryGroupRowIndex[factory];
      const sheetLen = factorySheetRows[factory].length;
      const groupStartIdx = sheetLen - groupRowCount;

      const invoiceSeenForFactory = new Set<string>();

      for (let i = groupStartIdx; i < sheetLen; i++) {
        // processRow = outputRow được push trước đó (39 cols, layout Process)
        const processRow = factorySheetRows[factory][i] as (string | number)[];

        const isFirstRowOfGroup = (i === groupStartIdx);

        // Tấn/ Chuyến (col 16): chỉ dòng đầu khối
        const tanChuyen: string | number = isFirstRowOfGroup
          ? factoryGroupRoundMTSums[factory]
          : '';

        // Tấn/ Hóa đơn (col 17): dòng đầu mỗi invoice+factory
        const invoiceNo = String(processRow[1]); // col 1 = Số hóa đơn
        const invoiceKey = `${invoiceNo}|||${factory}`;
        const isFirstForInvoice = !invoiceSeenForFactory.has(invoiceKey);
        if (isFirstForInvoice) invoiceSeenForFactory.add(invoiceKey);
        const tanHoaDon: string | number = isFirstForInvoice
          ? (invoiceFactorySums.get(invoiceKey) ?? '')
          : '';

        // CLF/VFM/MCC/CLV/NDFC: dòng đầu khối = group sums; còn lại giữ nguyên từ processRow
        const clf  = isFirstRowOfGroup ? (groupFactorySums['CLF']  || '') : processRow[16];
        const vfm  = isFirstRowOfGroup ? (groupFactorySums['VFM']  || '') : processRow[17];
        const mcc  = isFirstRowOfGroup ? (groupFactorySums['MCC']  || '') : processRow[18];
        const clv  = isFirstRowOfGroup ? (groupFactorySums['CLV']  || '') : processRow[19];
        const ndfc = isFirstRowOfGroup ? (groupFactorySums['NDFC'] || '') : processRow[20];

        // Build factory row: cols 0-15 (giống Process), chèn 16-17, rồi cols 18-40
        const factoryRow: (string | number)[] = [
          // 0-15: giống Process
          processRow[0],  // Mã nhà cung cấp
          processRow[1],  // Số hóa đơn
          processRow[2],  // Ngày hóa đơn
          processRow[3],  // Số tàu
          processRow[4],  // Mã khách hàng
          processRow[5],  // Tên khách hàng
          processRow[6],  // Địa chỉ giao hàng
          processRow[7],  // Mã hàng hóa
          processRow[8],  // Tên hàng hóa (Vie)
          processRow[9],  // Tên hàng hóa (En)
          processRow[10], // Mã liên hệ giao hàng
          processRow[11], // Mã DVT
          processRow[12], // Số lượng (DVT bán hàng)
          processRow[13], // SP Trọng lượng net
          processRow[14], // HĐ Trọng lượng (Net)
          processRow[15], // Round(MT)
          // 16-17: 2 cột mới
          tanChuyen,      // Tấn/ Chuyến
          tanHoaDon,      // Tấn/ Hóa đơn
          // 18-22: CLF/VFM/MCC/CLV/NDFC (shift từ 16-20 của processRow)
          clf,
          vfm,
          mcc,
          clv,
          ndfc,
          // 23-24: Col1/Col2 (shift từ 21-22 của processRow)
          processRow[21], // Col1 (tổng đầu khối)
          processRow[22], // Col2 (tổng tất cả dòng)
          // 25-40: metadata (shift từ 23-38 của processRow)
          processRow[23], // Tài xế
          processRow[24], // Thông tin bổ sung
          processRow[25], // Slot
          processRow[26], // Diễn giải
          processRow[27], // Channel
          processRow[28], // SubChannel
          processRow[29], // SlotNo
          processRow[30], // user tạo HĐ
          processRow[31], // User tạo PXK
          processRow[32], // PO number
          processRow[33], // Warehouse No
          processRow[34], // Warehouse Name
          processRow[35], // Phiếu XK
          processRow[36], // Chứng từ ghi sổ
          processRow[37], // Số seri
          processRow[38], // Loại hàng
        ];

        factorySheetRows[factory][i] = factoryRow;
      }
    });

    if (groupIndex < sortedGroups.length - 1) {
      const separatorRow: (string | number)[] = new Array(OUTPUT_HEADERS.length).fill('');
      separatorRow[15] = groupRoundMTSum;
      separatorRow[16] = groupFactorySums['CLF'] || '';
      separatorRow[17] = groupFactorySums['VFM'] || '';
      separatorRow[18] = groupFactorySums['MCC'] || '';
      separatorRow[19] = groupFactorySums['CLV'] || '';
      separatorRow[20] = groupFactorySums['NDFC'] || '';
      separatorRow[21] = groupRoundMTSum;
      separatorRow[22] = groupRoundMTSum;
      separatorRowIndices.add(outputRows.length);
      outputRows.push(separatorRow);

      // Add separator rows to each factory sheet that had data rows in this group
      // Factory separator rows: 41 cols, indices theo FACTORY_OUTPUT_HEADERS
      // col 15: Round(MT) sum, col 16-17: empty (Tấn/Chuyến & Tấn/Hóa đơn blank on separator)
      // col 18-22: CLF/VFM/MCC/CLV/NDFC, col 23-24: Col1/Col2
      FACTORY_NAMES.forEach((factory) => {
        if (factoryGroupHasRows[factory]) {
          const fSeparatorRow: (string | number)[] = new Array(FACTORY_OUTPUT_HEADERS.length).fill('');
          const fRoundMTSum = factoryGroupRoundMTSums[factory];
          fSeparatorRow[15] = fRoundMTSum;
          // col 16-17 (Tấn/ Chuyến, Tấn/ Hóa đơn): để trống trên separator row
          fSeparatorRow[18] = groupFactorySums['CLF']  || '';
          fSeparatorRow[19] = groupFactorySums['VFM']  || '';
          fSeparatorRow[20] = groupFactorySums['MCC']  || '';
          fSeparatorRow[21] = groupFactorySums['CLV']  || '';
          fSeparatorRow[22] = groupFactorySums['NDFC'] || '';
          fSeparatorRow[23] = fRoundMTSum;
          fSeparatorRow[24] = fRoundMTSum;
          factorySeparatorRowIndices[factory].add(factorySheetRows[factory].length);
          factorySheetRows[factory].push(fSeparatorRow);
        }
      });
    }
  });

  // ── Step 5: Build output workbook ─────────────────────────────────────────
  const outWb = new Workbook();

  /** Helper: write rows into a worksheet with header + separator styling */
  function writeSheetRows(
    ws: ReturnType<typeof outWb.addWorksheet>,
    rows: (string | number)[][],
    sepIndices: Set<number>,
    colWidths: { wch: number }[] = COL_WIDTHS,
    isFactorySheet: boolean = false
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

      // Apply number format
      excelRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const colIndex = colNumber - 1; // exceljs uses 1-based index
        const numFmt = numberColsMap[colIndex];
        if (numFmt && typeof cell.value === 'number') {
          cell.numFmt = numFmt;
        }
      });
    });
  }

  const outWs = outWb.addWorksheet('Processed');
  writeSheetRows(outWs, outputRows, separatorRowIndices, COL_WIDTHS, false);

  // Add per-factory sheets (CLF, VFM, MCC, CLV, NDFC) with factory-specific col widths
  FACTORY_NAMES.forEach((factory) => {
    const factoryWs = outWb.addWorksheet(factory);
    writeSheetRows(factoryWs, factorySheetRows[factory], factorySeparatorRowIndices[factory], COL_WIDTHS_FACTORY, true);
  });

  const outBuffer = await outWb.xlsx.writeBuffer();
  const outputBlob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const outputFilename = `delivery_processed_${ts}.xlsx`;

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

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Main entry point: process a delivery data XLSX file end-to-end.
 * Returns a ProcessResult with the output Blob ready for download.
 * For pre-parsed rows (e.g. after weight adjustments), use processDeliveryDataFromRows().
 */
export async function processDeliveryData(file: File): Promise<ProcessResult> {
  const { rawRows, sourceRowNums } = await parseDeliveryFile(file);
  return processDeliveryDataFromRows(rawRows, sourceRowNums);
}
