/**
 * Script xử lý dữ liệu giao hàng từ file Excel
 *
 * Chức năng:
 * - Đọc file Excel input (sheet "Raw")
 * - Bỏ qua 3 dòng header đầu (company name, address, title)
 * - Dòng 4 (index 3) là header thực sự
 * - Nhóm dữ liệu theo: Số tàu/Số xe + Ngày hóa đơn
 * - Trong mỗi nhóm, sắp xếp theo Số hóa đơn tăng dần
 * - Mỗi khối cách nhau 1 dòng trống
 * - Tính Round(MT) = tổng HĐ-Trọng lượng(Net) / 1000, làm tròn 3 chữ số thập phân
 *
 * Output columns:
 * Mã nhà cung cấp | Số hóa đơn | Ngày hóa đơn | Số tàu | Mã khách hàng | Tên khách hàng
 * Địa chỉ giao hàng | Round(MT) | Tài xế | Thông tin bổ sung | Slot | Diễn giải
 * Channel | SubChannel | SlotNo | User tạo HĐ | User tạo PXK | PO Number
 * Warehouse No | Warehouse Name | Phiếu XK | Chứng từ ghi sổ | Số seri | Loại hàng
 *
 * Usage: node scripts/process-delivery-data.js [input.xlsx] [output.xlsx]
 * Default: data/test_upload_11-23.02.xlsx → data/output_delivery_processed.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');

// ─── Column index mapping from source file ───────────────────────────────────
const COL = {
  CHANNEL: 0,
  SUB_CHANNEL: 1,
  DIEN_GIAI_CT: 2,       // Diễn giải chi tiết (HĐ)
  DIEN_GIAI: 3,           // Diễn giải
  SLOT: 4,
  WAYBILL_NO: 5,
  SLOT_NO: 6,
  USER_TAO_HD: 7,         // User tạo Hóa đơn
  USER_TAO_PXK: 8,        // User tạo PXK
  PO_NUMBER: 9,
  WAREHOUSE_NO: 10,
  WAREHOUSE_NAME: 11,
  MA_PXK: 12,             // Mã PXK (Phiếu XK)
  SO_CHUNG_TU: 13,        // Số chứng từ ghi sổ
  SO_SERI: 14,            // Số Seri
  DIA_CHI: 15,            // Địa chỉ giao hàng (vn)
  TEN_HANG_HOA: 16,       // Tên hàng hóa
  MA_DVT: 17,             // Mã ĐVT (Bán hàng)
  SP_TRONG_LUONG: 18,     // SP - Trọng lượng Net
  HD_TRONG_LUONG: 19,     // HĐ - Trọng lượng (Net) → dùng tính Round(MT)
  MA_NCC: 20,             // Mã nhà cung cấp
  MA_KH: 21,              // Mã khách hàng
  TEN_KH: 22,             // Tên khách hàng
  MA_HANG: 23,            // Mã hàng hóa
  TEN_HANG_EN: 24,        // Tên hàng hóa (En)
  LOAI_HANG: 25,          // Loại hàng
  MA_LH_GIAO: 26,         // Mã liên hệ giao hàng
  SO_LUONG: 27,           // Số lượng (DVT bán hàng)
  SO_TAU_XE: 28,          // Số tàu/ Số xe ← group key
  TAI_XE: 29,             // Tài xế
  SO_CONT: 30,            // Số Cont
  NGAY_HD: 31,            // Ngày hóa đơn ← group key
  SO_HD: 32,              // Số hóa đơn ← sort key
  THONG_TIN_BS: 33,       // Thông tin bổ sung 08
};

// ─── Output column definitions ────────────────────────────────────────────────
const OUTPUT_HEADERS = [
  'Mã nhà cung cấp',
  'Số hóa đơn',
  'Ngày hóa đơn',
  'Số tàu',
  'Mã khách hàng',
  'Tên khách hàng',
  'Địa chỉ giao hàng',
  'Round(MT)',
  'Tài xế',
  'Thông tin bổ sung',
  'Slot',
  'Diễn giải',
  'Channel',
  'SubChannel',
  'SlotNo',
  'User tạo HĐ',
  'User tạo PXK',
  'PO Number',
  'Warehouse No',
  'Warehouse Name',
  'Phiếu XK',
  'Chứng từ ghi sổ',
  'Số seri',
  'Loại hàng',
];

/**
 * Convert Excel serial date number to DD/MM/YYYY string
 */
function excelDateToString(serial) {
  if (!serial || typeof serial !== 'number') return serial || '';
  const date = XLSX.SSF.parse_date_code(serial);
  if (!date) return serial;
  const d = String(date.d).padStart(2, '0');
  const m = String(date.m).padStart(2, '0');
  const y = date.y;
  return `${d}/${m}/${y}`;
}

/**
 * Map a source row to output row columns (without Round(MT) - that's calculated per-group)
 */
function mapRowToOutput(row, roundMT) {
  return [
    row[COL.MA_NCC]       ?? '',   // Mã nhà cung cấp
    row[COL.SO_HD]        ?? '',   // Số hóa đơn
    excelDateToString(row[COL.NGAY_HD]),  // Ngày hóa đơn
    row[COL.SO_TAU_XE]    ?? '',   // Số tàu
    row[COL.MA_KH]        ?? '',   // Mã khách hàng
    row[COL.TEN_KH]       ?? '',   // Tên khách hàng
    row[COL.DIA_CHI]      ?? '',   // Địa chỉ giao hàng
    roundMT,                        // Round(MT) - tính cho cả nhóm
    row[COL.TAI_XE]       ?? '',   // Tài xế
    row[COL.THONG_TIN_BS] ?? '',   // Thông tin bổ sung
    row[COL.SLOT]         ?? '',   // Slot
    row[COL.DIEN_GIAI]    ?? '',   // Diễn giải
    row[COL.CHANNEL]      ?? '',   // Channel
    row[COL.SUB_CHANNEL]  ?? '',   // SubChannel
    row[COL.SLOT_NO]      ?? '',   // SlotNo
    row[COL.USER_TAO_HD]  ?? '',   // User tạo HĐ
    row[COL.USER_TAO_PXK] ?? '',   // User tạo PXK
    row[COL.PO_NUMBER]    ?? '',   // PO Number
    row[COL.WAREHOUSE_NO] ?? '',   // Warehouse No
    row[COL.WAREHOUSE_NAME]?? '',  // Warehouse Name
    row[COL.MA_PXK]       ?? '',   // Phiếu XK
    row[COL.SO_CHUNG_TU]  ?? '',   // Chứng từ ghi sổ
    row[COL.SO_SERI]      ?? '',   // Số seri
    row[COL.LOAI_HANG]    ?? '',   // Loại hàng
  ];
}

/**
 * Main processing function
 */
function processDeliveryData(inputFile, outputFile) {
  console.log(`📂 Reading: ${inputFile}`);

  // Read workbook
  const wb = XLSX.readFile(inputFile);
  const sheetName = wb.SheetNames[0];
  console.log(`📋 Sheet: "${sheetName}"`);

  const ws = wb.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`📊 Total rows (including headers): ${rawData.length}`);

  // Skip first 3 rows (company name, address, title) + row 3 is actual header
  // Data starts from row index 4
  const dataRows = rawData.slice(4).filter(row => {
    // Filter out empty rows
    return row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '');
  });

  console.log(`📊 Data rows to process: ${dataRows.length}`);

  // ─── Step 1: Group by (Số tàu/xe + Ngày hóa đơn) ──────────────────────────
  const groupMap = new Map();

  dataRows.forEach(row => {
    const vehicle = row[COL.SO_TAU_XE] ?? '';
    const date = row[COL.NGAY_HD] ?? '';
    const key = `${vehicle}|||${date}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        vehicle,
        date,
        rows: [],
      });
    }
    groupMap.get(key).rows.push(row);
  });

  console.log(`🚛 Total groups (vehicle + date): ${groupMap.size}`);

  // ─── Step 2: Sort each group by Số hóa đơn (ascending) ───────────────────
  for (const [key, group] of groupMap) {
    group.rows.sort((a, b) => {
      const invoiceA = String(a[COL.SO_HD] ?? '');
      const invoiceB = String(b[COL.SO_HD] ?? '');
      return invoiceA.localeCompare(invoiceB, undefined, { numeric: true });
    });
  }

  // ─── Step 3: Sort groups by (Ngày hóa đơn ASC, Số tàu/xe ASC) ──────────
  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    // Sort by date first
    if (a.date !== b.date) {
      return (Number(a.date) || 0) - (Number(b.date) || 0);
    }
    // Then by vehicle number
    return String(a.vehicle).localeCompare(String(b.vehicle));
  });

  // ─── Step 4: Build output rows ────────────────────────────────────────────
  const outputRows = [OUTPUT_HEADERS]; // First row = headers

  sortedGroups.forEach((group, groupIndex) => {
    // Calculate Round(MT) for the entire group
    // = sum of HĐ-Trọng lượng (Net) / 1000, rounded to 3 decimal places
    const totalNetKg = group.rows.reduce((sum, row) => {
      return sum + (Number(row[COL.HD_TRONG_LUONG]) || 0);
    }, 0);
    const roundMT = Math.round(totalNetKg / 1000 * 1000) / 1000; // round to 3 decimals

    // Add each row in the group
    group.rows.forEach(row => {
      outputRows.push(mapRowToOutput(row, roundMT));
    });

    // Add blank separator row after each group (except the last)
    if (groupIndex < sortedGroups.length - 1) {
      outputRows.push(new Array(OUTPUT_HEADERS.length).fill(''));
    }
  });

  console.log(`📝 Output rows (including headers + blank separators): ${outputRows.length}`);

  // ─── Step 5: Write output Excel ───────────────────────────────────────────
  const outWb = XLSX.utils.book_new();
  const outWs = XLSX.utils.aoa_to_sheet(outputRows);

  // Set column widths for better readability
  const colWidths = [
    { wch: 15 },  // Mã nhà cung cấp
    { wch: 12 },  // Số hóa đơn
    { wch: 12 },  // Ngày hóa đơn
    { wch: 18 },  // Số tàu
    { wch: 15 },  // Mã khách hàng
    { wch: 35 },  // Tên khách hàng
    { wch: 50 },  // Địa chỉ giao hàng
    { wch: 10 },  // Round(MT)
    { wch: 20 },  // Tài xế
    { wch: 20 },  // Thông tin bổ sung
    { wch: 15 },  // Slot
    { wch: 35 },  // Diễn giải
    { wch: 12 },  // Channel
    { wch: 12 },  // SubChannel
    { wch: 10 },  // SlotNo
    { wch: 12 },  // User tạo HĐ
    { wch: 12 },  // User tạo PXK
    { wch: 20 },  // PO Number
    { wch: 12 },  // Warehouse No
    { wch: 25 },  // Warehouse Name
    { wch: 18 },  // Phiếu XK
    { wch: 18 },  // Chứng từ ghi sổ
    { wch: 12 },  // Số seri
    { wch: 12 },  // Loại hàng
  ];
  outWs['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(outWb, outWs, 'Processed');
  XLSX.writeFile(outWb, outputFile);

  console.log(`\n✅ Done! Output saved to: ${outputFile}`);
  console.log(`   Groups processed: ${sortedGroups.length}`);
  console.log(`   Total data rows:  ${dataRows.length}`);

  // Print summary of groups
  console.log('\n📋 Group Summary (first 10):');
  sortedGroups.slice(0, 10).forEach((g, i) => {
    const dateStr = excelDateToString(g.date);
    const totalNet = g.rows.reduce((s, r) => s + (Number(r[COL.HD_TRONG_LUONG]) || 0), 0);
    const roundMT = Math.round(totalNet / 1000 * 1000) / 1000;
    console.log(`  ${i + 1}. [${dateStr}] ${g.vehicle} | ${g.rows.length} rows | Round(MT): ${roundMT}`);
  });
  if (sortedGroups.length > 10) {
    console.log(`  ... and ${sortedGroups.length - 10} more groups`);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputFile = args[0] || path.join(__dirname, '../data/test_upload_11-23.02.xlsx');
const outputFile = args[1] || path.join(__dirname, '../data/output_delivery_processed.xlsx');

processDeliveryData(inputFile, outputFile);
