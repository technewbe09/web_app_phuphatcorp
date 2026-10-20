import ExcelJS from 'exceljs';
import { bangKeThoPricingLookup, resolveClvBook } from './pricingLookup';

export interface ClvStats {
  tan_rows: number;
  chuyen_rows: number;
  tan_invoices: number;
  chuyen_invoices: number;
  cover_tan_invoices: number;
  cover_tn_invoices: number;
  cover_chuyen_invoices: number;
  cover_uni_invoices: number;
}

export interface ProcessClvResult {
  buffer: Buffer;
  stats: ClvStats;
}

const PARTIAL_MATCH_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFEB9C' },
};

const KEEP_SHEETS = new Set(['sheet', 'sheet1', 'processed', 'clv']);
const OUTPUT_SHEETS = [
  'clv tấn',
  'clv tấn (2)',
  'tn-aav-pa',
  'clv chuyến+uni-clv',
  'clv chuyến',
  'uni-clv',
] as const;

const TON_FMT = '#,##0.000';
const MONEY_FMT = '#,##0';

interface ClvLine {
  supplierCode: string;
  invoiceNo: string;
  invoiceDate: Date | null;
  invoiceDateIso: string;
  truckNo: string;
  customerCode: string;
  contactCode: string;
  customerName: string;
  address: string;
  khungGia: string;
  dvt: string;
  itemCode: string;
  itemNameVie: string;
  itemNameEn: string;
  dvtCode: string;
  qty: number | null;
  spNetWeight: number | null;
  hdNetWeight: number | null;
  clf: number | null;
  vfm: number | null;
  mcc: number | null;
  clv: number | null;
  ndfc: number | null;
  gao: number | null;
  slot: string;
  dealer: string;
  actualDest: string;
  feeDest: string;
  transportRate: number | null;
  feeBocXep: number | null;
  feeChuyenTai: number | null;
  isPartialMatch: boolean;
  matchedAddress: string;
  isLe25: boolean;
  khuVuc: string;
}

function findSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  const target = name.trim().toLowerCase();
  return workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === target);
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function cellRaw(row: ExcelJS.Row, col: number | undefined): unknown {
  if (!col) return null;
  const cell = row.getCell(col);
  if (cell.value && typeof cell.value === 'object' && 'result' in (cell.value as object)) {
    return (cell.value as { result: unknown }).result;
  }
  return cell.value;
}

function cellStr(row: ExcelJS.Row, cols: Map<string, number>, header: string): string {
  const val = cellRaw(row, cols.get(headerKey(header)));
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function cellNum(row: ExcelJS.Row, cols: Map<string, number>, header: string): number | null {
  const val = cellRaw(row, cols.get(headerKey(header)));
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : null;
}

function localIsoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function excelSerialToLocalDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utc = new Date(utcDays * 86400 * 1000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12);
}

function parseInvoiceDate(val: unknown): { date: Date | null; iso: string } {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const date = new Date(val.getFullYear(), val.getMonth(), val.getDate(), 12);
    return { date, iso: localIsoFromDate(date) };
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    const date = excelSerialToLocalDate(val);
    return { date, iso: localIsoFromDate(date) };
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
      return { date, iso: localIsoFromDate(date) };
    }
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3 && parts[2].length === 4) {
      const date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12);
      if (!Number.isNaN(date.getTime())) return { date, iso: localIsoFromDate(date) };
    }
  }
  return { date: null, iso: '' };
}

function isLe25Khung(khung: string): boolean {
  const k = khung.trim().toLowerCase().replace(/\s+/g, '');
  return k === '≤2.5tấn' || k === '<=2.5tấn' || k === '<=2,5tấn';
}

function normSlot(slot: string): string {
  return slot.trim().toUpperCase().replace(/\s+/g, ' ');
}

function detectHeader(ws: ExcelJS.Worksheet): { headerRowIdx: number; cols: Map<string, number> } {
  let headerRowIdx = 2;
  const cols = new Map<string, number>();
  const last = Math.min(ws.rowCount || 3, 5);
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    let found = 0;
    row.eachCell((cell) => {
      if (String(cell.value || '').trim()) found++;
    });
    if (found > 8) {
      headerRowIdx = r;
      row.eachCell((cell, colNumber) => {
        const txt = String(cell.value || '').trim();
        if (txt) cols.set(headerKey(txt), colNumber);
      });
      break;
    }
  }
  return { headerRowIdx, cols };
}

function readClvLines(ws: ExcelJS.Worksheet): ClvLine[] {
  const { headerRowIdx, cols } = detectHeader(ws);
  const lines: ClvLine[] = [];
  const last = ws.rowCount;
  for (let r = headerRowIdx + 1; r <= last; r++) {
    const row = ws.getRow(r);
    const supplierCode = cellStr(row, cols, 'Mã nhà cung cấp');
    if (supplierCode.toUpperCase() !== 'CLV') continue;
    const invoiceNo = cellStr(row, cols, 'Số hóa đơn');
    const truckNo = cellStr(row, cols, 'Số tàu');
    if (!invoiceNo && !truckNo) continue;
    const parsed = parseInvoiceDate(cellRaw(row, cols.get(headerKey('Ngày hóa đơn'))));
    const khungGia = cellStr(row, cols, 'Khung giá');
    const le25 = isLe25Khung(khungGia);
    lines.push({
      supplierCode,
      invoiceNo,
      invoiceDate: parsed.date,
      invoiceDateIso: parsed.iso,
      truckNo,
      customerCode: cellStr(row, cols, 'Mã khách hàng'),
      contactCode: cellStr(row, cols, 'Mã liên hệ giao hàng'),
      customerName: cellStr(row, cols, 'Tên khách hàng'),
      address: cellStr(row, cols, 'Địa chỉ giao hàng'),
      khungGia,
      dvt: cellStr(row, cols, 'Đơn vị tính'),
      itemCode: cellStr(row, cols, 'Mã hàng hóa'),
      itemNameVie: cellStr(row, cols, 'Tên hàng hóa (Vie)'),
      itemNameEn: cellStr(row, cols, 'Tên hàng hóa (En)'),
      dvtCode: cellStr(row, cols, 'Mã DVT'),
      qty: cellNum(row, cols, 'Số lượng (DVT bán hàng)'),
      spNetWeight: cellNum(row, cols, 'SP Trọng lượng net'),
      hdNetWeight: cellNum(row, cols, 'HĐ Trọng lượng (Net)'),
      clf: cellNum(row, cols, 'CLF'),
      vfm: cellNum(row, cols, 'VFM'),
      mcc: cellNum(row, cols, 'MCC'),
      clv: cellNum(row, cols, 'CLV'),
      ndfc: cellNum(row, cols, 'NDFC'),
      gao: cellNum(row, cols, 'GẠO') ?? cellNum(row, cols, 'GAO'),
      slot: cellStr(row, cols, 'Slot'),
      dealer: '',
      actualDest: '',
      feeDest: '',
      transportRate: null,
      feeBocXep: null,
      feeChuyenTai: null,
      isPartialMatch: false,
      matchedAddress: '',
      isLe25: le25,
      khuVuc: le25 ? 'ST' : 'TỈNH',
    });
  }
  return lines;
}

async function enrichLines(lines: ClvLine[]): Promise<void> {
  await bangKeThoPricingLookup.initCache();
  const book = resolveClvBook();
  const custCache = new Map<string, Awaited<ReturnType<typeof bangKeThoPricingLookup.lookupCustomer>>>();
  for (const line of lines) {
    const key = `${line.customerName}___${line.address}`;
    if (!custCache.has(key)) {
      custCache.set(
        key,
        await bangKeThoPricingLookup.lookupCustomer({
          tenKhachHang: line.customerName,
          diaChiGiaoHang: line.address,
          supplierCode: 'CLV',
          slot: line.slot,
        }),
      );
    }
    const cust = custCache.get(key);
    if (cust) {
      line.dealer = cust.diem_tra_hang;
      line.actualDest = cust.tuyen_phuong;
      line.feeDest = cust.diem_giao_hang_tinh_phi;
      line.isPartialMatch = cust.is_partial_match;
      line.matchedAddress = cust.matched_address;
    }
    if (line.feeDest && line.invoiceDateIso) {
      line.transportRate = await bangKeThoPricingLookup.lookupTransportRate({
        diemTinhPhi: line.feeDest,
        khungGia: line.khungGia,
        invoiceDateIso: line.invoiceDateIso,
        supplierCode: 'CLV',
        slot: line.slot,
        targetBook: book,
      });
    }
    const fees = await bangKeThoPricingLookup.lookupSurcharges({
      tenKhachHang: line.customerName,
      customerId: cust?.customer_id ?? null,
      khuVuc: line.khuVuc,
      khungGia: line.khungGia,
      invoiceDateIso: line.invoiceDateIso || '1970-01-01',
    });
    line.feeBocXep = fees.phi_boc_xep;
    line.feeChuyenTai = fees.phi_chuyen_tai;
  }
}

function paintPartial(row: ExcelJS.Row, cols: number[], addressCol: number, line: ClvLine): void {
  if (!line.isPartialMatch) return;
  for (const col of cols) {
    row.getCell(col).fill = PARTIAL_MATCH_FILL;
  }
  const addr = row.getCell(addressCol);
  addr.fill = PARTIAL_MATCH_FILL;
  if (line.matchedAddress) addr.note = line.matchedAddress;
}

function writeNum(cell: ExcelJS.Cell, value: number | null, fmt: string): void {
  if (value === null) return;
  cell.value = value;
  cell.numFmt = fmt;
}

function writeLineSheet(workbook: ExcelJS.Workbook, name: string, lines: ClvLine[], le25: boolean): void {
  const ws = workbook.addWorksheet(name);
  const headers = [
    'Mã nhà cung cấp', '', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng', 'Mã liên hệ giao hàng',
    '', '', '', '',
    'Tên khách hàng', 'Địa chỉ giao hàng', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
    'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã DVT', 'Số lượng (DVT bán hàng)',
    'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)', 'Tấn/ Hóa đơn', 'Tấn/ Chuyến',
    'TỔNG TRỌNG LƯỢNG CHUYẾN', 'ĐƠN GIÁ\n(Đồng)', 'ĐƠN GIÁ VẬN CHUYỂN\n(Đồng)',
    'PHÍ BỐC XẾP\n(Đồng)', 'PHÍ CHUYỂN TẢI\n(Đồng)', 'Thành tiền\ncheck\n (Đồng)',
    'THÀNH TIỀN SAU HÓA ĐƠN\n(Đồng)', 'THÀNH TIỀN HÓA ĐƠN', 'CHÊNH LỆCH\n(Đồng)',
    'SITE', 'Khu vực', 'Số dòng trên HĐ', 'Điều chỉnh Hóa đơn', '5 nhà',
    'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', 'GẠO',
  ];
  ws.getRow(2).values = headers;
  let tripStart = 0;
  let tripKey = '';
  lines.forEach((line, index) => {
    const r = index + 3;
    const key = `${line.truckNo}__${line.invoiceDateIso}`;
    const firstOfTrip = key !== tripKey;
    if (firstOfTrip) {
      tripKey = key;
      tripStart = r;
    }
    const row = ws.getRow(r);
    row.getCell(1).value = 'CLV';
    row.getCell(3).value = line.invoiceNo;
    if (line.invoiceDate) row.getCell(4).value = line.invoiceDate;
    row.getCell(5).value = line.truckNo;
    row.getCell(6).value = line.customerCode;
    row.getCell(7).value = line.contactCode;
    row.getCell(8).value = line.dealer;
    row.getCell(9).value = line.actualDest;
    row.getCell(10).value = line.feeDest;
    row.getCell(11).value = { formula: `I${r}&", ("&N${r}&"), xe "&E${r}` };
    row.getCell(12).value = line.customerName;
    row.getCell(13).value = line.address;
    row.getCell(14).value = line.khungGia;
    row.getCell(15).value = line.dvt;
    row.getCell(16).value = line.itemCode;
    row.getCell(17).value = line.itemNameVie;
    row.getCell(18).value = line.itemNameEn;
    row.getCell(19).value = line.dvtCode;
    writeNum(row.getCell(20), line.qty, MONEY_FMT);
    writeNum(row.getCell(21), line.spNetWeight, TON_FMT);
    writeNum(row.getCell(22), line.hdNetWeight, TON_FMT);
    row.getCell(23).value = { formula: `ROUND(V${r}/1000,3)` };
    row.getCell(23).numFmt = TON_FMT;
    row.getCell(24).value = { formula: `IF($C${r}=$C${r - 1},0,SUMIF($C:$C,$C${r},$W:$W))` };
    row.getCell(24).numFmt = TON_FMT;
    row.getCell(25).value = {
      formula: `IF(AND(E${r}=E${r - 1},D${r}=D${r - 1}),0,SUMIFS($W:$W,$D:$D,$D${r},$E:$E,$E${r}))`,
    };
    row.getCell(25).numFmt = TON_FMT;
    row.getCell(26).value = { formula: firstOfTrip ? `AM${r}` : `Z${tripStart}` };
    row.getCell(26).numFmt = TON_FMT;
    row.getCell(27).value = { formula: le25 ? `SUM(AB${r}:AD${r})` : `AB${r}` };
    row.getCell(27).numFmt = MONEY_FMT;
    writeNum(row.getCell(28), line.transportRate, MONEY_FMT);
    writeNum(row.getCell(29), line.feeBocXep, MONEY_FMT);
    writeNum(row.getCell(30), line.feeChuyenTai, MONEY_FMT);
    row.getCell(31).value = {
      formula: le25
        ? `ROUND(SUM($AB${r}:$AD${r})/$Z${r}*$Y${r},0)`
        : `ROUND($Y${r}*SUM($AB${r}:$AD${r}),0)`,
    };
    row.getCell(31).numFmt = MONEY_FMT;
    row.getCell(32).value = {
      formula: le25 ? `ROUND($AA${r}/$Z${r}*$Y${r},0)` : `ROUND($Y${r}*$AB${r},0)`,
    };
    row.getCell(32).numFmt = MONEY_FMT;
    row.getCell(34).value = { formula: `ROUND($AF${r}-$AG${r},0)` };
    row.getCell(34).numFmt = MONEY_FMT;
    row.getCell(35).value = 'CLV';
    row.getCell(36).value = line.khuVuc;
    if (firstOfTrip) {
      row.getCell(39).value = { formula: `SUM(AN${r}:AS${r})` };
      row.getCell(39).numFmt = TON_FMT;
    }
    writeNum(row.getCell(40), line.clf, TON_FMT);
    writeNum(row.getCell(41), line.vfm, TON_FMT);
    writeNum(row.getCell(42), line.mcc, TON_FMT);
    writeNum(row.getCell(43), line.clv, TON_FMT);
    writeNum(row.getCell(44), line.ndfc, TON_FMT);
    writeNum(row.getCell(45), line.gao, TON_FMT);
    paintPartial(row, [8, 9, 10], 13, line);
  });
}

interface InvoiceRollup {
  invoiceNo: string;
  invoiceDate: Date | null;
  invoiceDateIso: string;
  truckNo: string;
  dealer: string;
  actualDest: string;
  feeDest: string;
  customerName: string;
  address: string;
  khungGia: string;
  dvt: string;
  invoiceTons: number;
  transportRate: number | null;
  feeBocXep: number | null;
  feeChuyenTai: number | null;
  khuVuc: string;
  isPartialMatch: boolean;
  matchedAddress: string;
  clf: number | null;
  vfm: number | null;
  mcc: number | null;
  clv: number | null;
  ndfc: number | null;
  gao: number | null;
  tripTons: number;
  fiveNha: number;
}

function sumHouses(line: ClvLine): number {
  return (line.clf || 0) + (line.vfm || 0) + (line.mcc || 0) + (line.clv || 0) + (line.ndfc || 0) + (line.gao || 0);
}

function rollupInvoices(lines: ClvLine[]): InvoiceRollup[] {
  const order: string[] = [];
  const groups = new Map<string, ClvLine[]>();
  for (const line of lines) {
    const key = `${line.invoiceNo}__${line.invoiceDateIso}__${line.truckNo}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(line);
  }
  const invoices: InvoiceRollup[] = order.map((key) => {
    const group = groups.get(key)!;
    const first = group[0];
    const invoiceTons = group.reduce((sum, line) => sum + (line.hdNetWeight || 0) / 1000, 0);
    return {
      invoiceNo: first.invoiceNo,
      invoiceDate: first.invoiceDate,
      invoiceDateIso: first.invoiceDateIso,
      truckNo: first.truckNo,
      dealer: first.dealer,
      actualDest: first.actualDest,
      feeDest: first.feeDest,
      customerName: first.customerName,
      address: first.address,
      khungGia: first.khungGia,
      dvt: first.dvt,
      invoiceTons,
      transportRate: first.transportRate,
      feeBocXep: first.feeBocXep,
      feeChuyenTai: first.feeChuyenTai,
      khuVuc: first.khuVuc,
      isPartialMatch: group.some((line) => line.isPartialMatch),
      matchedAddress: group.find((line) => line.matchedAddress)?.matchedAddress || '',
      clf: first.clf,
      vfm: first.vfm,
      mcc: first.mcc,
      clv: first.clv,
      ndfc: first.ndfc,
      gao: first.gao,
      tripTons: 0,
      fiveNha: sumHouses(first),
    };
  });

  let i = 0;
  while (i < invoices.length) {
    const start = i;
    const trip = `${invoices[i].truckNo}__${invoices[i].invoiceDateIso}`;
    let tons = 0;
    while (i < invoices.length && `${invoices[i].truckNo}__${invoices[i].invoiceDateIso}` === trip) {
      const key = `${invoices[i].invoiceNo}__${invoices[i].invoiceDateIso}__${invoices[i].truckNo}`;
      tons += groups.get(key)!.reduce((sum, line) => sum + (line.hdNetWeight || 0) / 1000, 0);
      i++;
    }
    invoices[start].tripTons = tons;
    invoices[start].fiveNha = sumHouses(groups.get(
      `${invoices[start].invoiceNo}__${invoices[start].invoiceDateIso}__${invoices[start].truckNo}`,
    )![0]);
  }
  return invoices;
}

function writeCoverHeader(ws: ExcelJS.Worksheet): void {
  ws.getCell('A1').value = 'BẢNG KÊ CƯỚC PHÍ VẬN CHUYỂN HÀNG THÁNG …… KÈM THEO HÓA ĐƠN SỐ …… NGÀY ……';
  ws.getCell('A2').value = '(Theo Hợp Đồng nguyên tắc số: WILMAR CLV-PHUPHAT/2025 ngày 01 tháng 01 năm 2025)';
  ws.getCell('P2').value = 'BK số:';
  ws.getCell('P3').value = 'Ngày BK:';
  ws.getCell('A4').value = 'Đơn vị bán hàng: CÔNG TNHH DV VẬN TẢI PHÚ PHÁT';
  ws.getCell('A5').value = 'Địa chỉ: 165 Đỗ Thị Lời, Phường Nhiêu Lộc, Thành Phố Hồ Chí Minh, Việt Nam';
  ws.getCell('A6').value = 'Mã số thuế: 0 3 1 8 5 0 8 6 2 0';
  ws.getCell('A7').value = 'Số tài khoản: 36238 tại Ngân hàng TMCP Á Châu - PGD Nhieu Loc.';
  ws.getCell('A9').value = 'Đơn vị mua hàng: CÔNG TY TNHH WILMAR MARKETING CLV';
  ws.getCell('A10').value = 'Địa chỉ: Tầng 2 và Tầng 10, Tòa nhà CornerStone, Số 16 Phan Chu Trinh, Phường Cửa Nam, Thành phố Hà Nội, Việt Nam';
  ws.getCell('A11').value = 'Mã số thuế: 0 1 0 4 1 2 8 7 4 1';
  ws.getCell('A12').value = 'Số Tài Khoản: 0823-109111-401 - Ngân hàng Bangkok Đại Chúng - CN Hà Nội.';
  const headers = [
    'STT', 'HÓA ĐƠN', 'NGÀY', 'SỐ XE', 'ĐẠI LÝ', 'ĐIỂM GIAO HÀNG THỰC TẾ', 'ĐIỂM GIAO HÀNG TÍNH PHÍ',
    'Hóa đơn', 'Tên khách hàng', 'Địa chỉ giao hàng', 'KHUNG TẢI', 'ĐƠN VỊ \nTÍNH',
    'TRỌNG LƯỢNG \n(Tấn/Hóa Đơn)', 'TRỌNG LƯỢNG \n(Tấn/Chuyến)', 'TỔNG TRỌNG LƯỢNG CHUYẾN',
    'ĐƠN GIÁ\n(Đồng)', 'ĐƠN GIÁ VẬN CHUYỂN\n(Đồng)', 'PHÍ BỐC XẾP\n(Đồng)', 'Phụ phí giao hàng\n(Đồng)',
    'Thành tiền\ncheck\n (Đồng)', 'THÀNH TIỀN SAU HÓA ĐƠN\n(Đồng)', 'THÀNH TIỀN HÓA ĐƠN',
    'CHÊNH LỆCH\n(Đồng)', 'SITE', 'Khu vực', 'Số dòng trên HĐ', 'Điều chỉnh Hóa đơn', '5 nhà',
    'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', 'GẠO', 'Ghi Chú',
  ];
  headers.forEach((header, index) => {
    ws.getCell(13, index + 1).value = header;
  });
}

function writeCoverSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  lines: ClvLine[],
  le25: boolean,
  withTripTotal: boolean,
): void {
  const ws = workbook.addWorksheet(name);
  writeCoverHeader(ws);
  const invoices = rollupInvoices(lines);
  let rowIdx = 14;
  let stt = 1;
  let i = 0;
  while (i < invoices.length) {
    const start = i;
    const trip = `${invoices[i].truckNo}__${invoices[i].invoiceDateIso}`;
    const blockStart = rowIdx;
    while (i < invoices.length && `${invoices[i].truckNo}__${invoices[i].invoiceDateIso}` === trip) {
      const inv = invoices[i];
      const first = i === start;
      const r = rowIdx;
      const row = ws.getRow(r);
      row.getCell(1).value = stt;
      stt += 1;
      row.getCell(2).value = inv.invoiceNo;
      if (inv.invoiceDate) row.getCell(3).value = inv.invoiceDate;
      row.getCell(4).value = inv.truckNo;
      row.getCell(5).value = inv.dealer;
      row.getCell(6).value = inv.actualDest;
      if (first) row.getCell(7).value = inv.feeDest;
      row.getCell(8).value = { formula: `F${r}&", ("&K${r}&"), xe "&D${r}` };
      row.getCell(9).value = inv.customerName;
      row.getCell(10).value = inv.address;
      row.getCell(11).value = inv.khungGia;
      row.getCell(12).value = inv.dvt;
      row.getCell(13).value = Math.round(inv.invoiceTons * 1000) / 1000;
      row.getCell(13).numFmt = TON_FMT;
      row.getCell(24).value = 'CLV';
      row.getCell(25).value = inv.khuVuc;
      if (first) {
        row.getCell(14).value = Math.round(inv.tripTons * 1000) / 1000;
        row.getCell(14).numFmt = TON_FMT;
        row.getCell(15).value = { formula: `AB${r}` };
        row.getCell(15).numFmt = TON_FMT;
        row.getCell(16).value = { formula: le25 ? `SUM(Q${r}:S${r})` : `Q${r}` };
        row.getCell(16).numFmt = MONEY_FMT;
        writeNum(row.getCell(17), inv.transportRate, MONEY_FMT);
        writeNum(row.getCell(18), inv.feeBocXep, MONEY_FMT);
        writeNum(row.getCell(19), inv.feeChuyenTai, MONEY_FMT);
        row.getCell(20).value = {
          formula: le25
            ? `ROUND(SUM($Q${r}:$S${r})/$O${r}*$N${r},0)`
            : `ROUND($N${r}*SUM($Q${r}:$S${r}),0)`,
        };
        row.getCell(20).numFmt = MONEY_FMT;
        row.getCell(21).value = {
          formula: le25 ? `ROUND($P${r}/$O${r}*$N${r},0)` : `ROUND($N${r}*$Q${r},0)`,
        };
        row.getCell(21).numFmt = MONEY_FMT;
        row.getCell(23).value = { formula: `ROUND($U${r}-$V${r},0)` };
        row.getCell(23).numFmt = MONEY_FMT;
        row.getCell(28).value = { formula: `SUM(AC${r}:AH${r})` };
        row.getCell(28).numFmt = TON_FMT;
        writeNum(row.getCell(29), inv.clf, TON_FMT);
        writeNum(row.getCell(30), inv.vfm, TON_FMT);
        writeNum(row.getCell(31), inv.mcc, TON_FMT);
        writeNum(row.getCell(32), inv.clv, TON_FMT);
        writeNum(row.getCell(33), inv.ndfc, TON_FMT);
        writeNum(row.getCell(34), inv.gao, TON_FMT);
      }
      paintPartial(row, [5, 6, 7], 10, {
        isPartialMatch: inv.isPartialMatch,
        matchedAddress: inv.matchedAddress,
      } as ClvLine);
      rowIdx += 1;
      i += 1;
    }
    const blockEnd = rowIdx - 1;
    if (withTripTotal) {
      const total = ws.getRow(rowIdx);
      const last = blockEnd;
      const first = blockStart;
      total.getCell(3).value = 'Tổng cộng';
      total.getCell(4).value = { formula: `D${last}` };
      total.getCell(5).value = { formula: `H${last}` };
      total.getCell(13).value = { formula: `SUM(M${first}:M${last})` };
      total.getCell(13).numFmt = TON_FMT;
      total.getCell(14).value = { formula: `SUM(N${first}:N${last})` };
      total.getCell(14).numFmt = TON_FMT;
      total.getCell(16).value = { formula: `P${first}` };
      total.getCell(17).value = { formula: `Q${first}` };
      total.getCell(20).value = { formula: `SUM(T${first}:T${last})` };
      total.getCell(20).numFmt = MONEY_FMT;
      total.getCell(21).value = { formula: `SUM(U${first}:U${last})` };
      total.getCell(21).numFmt = MONEY_FMT;
      total.getCell(23).value = { formula: `SUM(W${first}:W${last})` };
      total.getCell(23).numFmt = MONEY_FMT;
      total.getCell(24).value = 'CLV';
      total.getCell(25).value = invoices[start].khuVuc;
      rowIdx += 1;
    }
  }
}

function uniqueInvoices(lines: ClvLine[]): number {
  return new Set(lines.map((line) => `${line.invoiceNo}__${line.invoiceDateIso}`)).size;
}

export async function processClvWorkbook(inputBuffer: Buffer): Promise<ProcessClvResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(inputBuffer as any);
  const source = findSheet(workbook, 'CLV');
  if (!source) throw new Error('MISSING_CLV_SHEET');

  const lines = readClvLines(source);
  await enrichLines(lines);

  const tanLines = lines.filter((line) => !line.isLe25);
  const chuyenLines = lines.filter((line) => line.isLe25);
  const coverTan = tanLines.filter((line) => normSlot(line.slot) !== '');
  const coverTn = tanLines.filter((line) => normSlot(line.slot) === '');
  const coverChuyen = chuyenLines.filter((line) => normSlot(line.slot) === 'GST01_CLV HP');
  const coverUni = chuyenLines.filter((line) => normSlot(line.slot) === 'GST01_VINH TUONG');

  const removeNames = workbook.worksheets
    .filter((ws) => !KEEP_SHEETS.has(ws.name.trim().toLowerCase()))
    .map((ws) => ws.name);
  for (const name of removeNames) {
    workbook.removeWorksheet(name);
  }
  for (const name of OUTPUT_SHEETS) {
    const existing = workbook.getWorksheet(name);
    if (existing) workbook.removeWorksheet(existing.id);
  }

  writeLineSheet(workbook, 'clv tấn', tanLines, false);
  writeCoverSheet(workbook, 'clv tấn (2)', coverTan, false, true);
  writeCoverSheet(workbook, 'tn-aav-pa', coverTn, false, true);
  writeLineSheet(workbook, 'clv chuyến+uni-clv', chuyenLines, true);
  writeCoverSheet(workbook, 'clv chuyến', coverChuyen, true, true);
  writeCoverSheet(workbook, 'uni-clv', coverUni, true, false);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    stats: {
      tan_rows: tanLines.length,
      chuyen_rows: chuyenLines.length,
      tan_invoices: uniqueInvoices(tanLines),
      chuyen_invoices: uniqueInvoices(chuyenLines),
      cover_tan_invoices: uniqueInvoices(coverTan),
      cover_tn_invoices: uniqueInvoices(coverTn),
      cover_chuyen_invoices: uniqueInvoices(coverChuyen),
      cover_uni_invoices: uniqueInvoices(coverUni),
    },
  };
}
