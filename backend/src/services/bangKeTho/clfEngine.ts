import ExcelJS from 'exceljs';
import { bangKeThoPricingLookup, resolveClfBook } from './pricingLookup';

export interface ClfStats {
  sthi_rows: number;
  tinh_rows: number;
  npp_rows: number;
  uni_rows: number;
  cover_sthi_invoices: number;
  cover_tinh_invoices: number;
  cover_npp_invoices: number;
  cover_uni_invoices: number;
  cover_tn_invoices: number;
}

export interface ProcessClfResult {
  buffer: Buffer;
  stats: ClfStats;
}

const SUPPLIER = '2000000001';
const REQUIRED_SHEETS = ['STHI', 'TINH', 'NPP', 'STHI (uni)'] as const;
const PARTIAL_MATCH_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFEB9C' },
};
const KEEP_SHEETS = new Set(['sheet', 'sheet1', 'processed']);
const TON_FMT = '#,##0.000';
const MONEY_FMT = '#,##0';

interface ClfLine {
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
  dealer: string;
  actualDest: string;
  feeDest: string;
  transportRate: number | null;
  feeBocXep: number | null;
  feeChuyenTai: number | null;
  feeGhepDiem: number | null;
  isPartialMatch: boolean;
  matchedAddress: string;
  isLe25: boolean;
  khuVuc: string;
  site: string;
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
  const utc = new Date(Math.floor(serial - 25569) * 86400 * 1000);
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

function isManualInvoice(invoiceNo: string): boolean {
  return !/^\d+$/.test(invoiceNo.trim());
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

function readLines(ws: ExcelJS.Worksheet, site: string, khuMode: 'ST' | 'TINH' | 'byKhung'): ClfLine[] {
  const { headerRowIdx, cols } = detectHeader(ws);
  const lines: ClfLine[] = [];
  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const supplierCode = cellStr(row, cols, 'Mã nhà cung cấp');
    if (supplierCode !== SUPPLIER) continue;
    const invoiceNo = cellStr(row, cols, 'Số hóa đơn');
    const truckNo = cellStr(row, cols, 'Số tàu');
    if (!invoiceNo && !truckNo) continue;
    const parsed = parseInvoiceDate(cellRaw(row, cols.get(headerKey('Ngày hóa đơn'))));
    const khungGia = cellStr(row, cols, 'Khung giá');
    const le25 = isLe25Khung(khungGia);
    const khuVuc = khuMode === 'byKhung' ? (le25 ? 'ST' : 'TỈNH') : khuMode === 'ST' ? 'ST' : 'TỈNH';
    lines.push({
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
      dealer: '',
      actualDest: '',
      feeDest: '',
      transportRate: null,
      feeBocXep: null,
      feeChuyenTai: null,
      feeGhepDiem: null,
      isPartialMatch: false,
      matchedAddress: '',
      isLe25: le25,
      khuVuc,
      site,
    });
  }
  return lines;
}

async function enrichLines(lines: ClfLine[]): Promise<void> {
  await bangKeThoPricingLookup.initCache();
  const book = resolveClfBook();
  const custCache = new Map<string, Awaited<ReturnType<typeof bangKeThoPricingLookup.lookupCustomer>>>();
  for (const line of lines) {
    const key = `${line.customerName}___${line.address}`;
    if (!custCache.has(key)) {
      custCache.set(
        key,
        await bangKeThoPricingLookup.lookupCustomer({
          tenKhachHang: line.customerName,
          diaChiGiaoHang: line.address,
          supplierCode: SUPPLIER,
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
        supplierCode: SUPPLIER,
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
    line.feeGhepDiem = fees.phi_ghep_diem;
  }
}

function paintPartial(row: ExcelJS.Row, cols: number[], addressCol: number, line: ClfLine): void {
  if (!line.isPartialMatch) return;
  for (const col of cols) row.getCell(col).fill = PARTIAL_MATCH_FILL;
  const addr = row.getCell(addressCol);
  addr.fill = PARTIAL_MATCH_FILL;
  if (line.matchedAddress) addr.note = line.matchedAddress;
}

function writeNum(cell: ExcelJS.Cell, value: number | null, fmt: string): void {
  if (value === null) return;
  cell.value = value;
  cell.numFmt = fmt;
}

function writeHouses(row: ExcelJS.Row, startCol: number, line: ClfLine): void {
  writeNum(row.getCell(startCol), line.clf, TON_FMT);
  writeNum(row.getCell(startCol + 1), line.vfm, TON_FMT);
  writeNum(row.getCell(startCol + 2), line.mcc, TON_FMT);
  writeNum(row.getCell(startCol + 3), line.clv, TON_FMT);
  writeNum(row.getCell(startCol + 4), line.ndfc, TON_FMT);
  writeNum(row.getCell(startCol + 5), line.gao, TON_FMT);
}

type TextStyle = 'space' | 'xe';
type MoneyStyle = 'divide' | 'multiply' | 'none';

function writeRichLine(
  workbook: ExcelJS.Workbook,
  name: string,
  lines: ClfLine[],
  textStyle: TextStyle,
  money: MoneyStyle,
  withGhep: boolean,
): void {
  const ws = workbook.addWorksheet(name);
  const headers = [
    'Mã nhà cung cấp', '', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng', 'Mã liên hệ giao hàng',
    '', '', '', '',
    'Tên khách hàng', 'Địa chỉ giao hàng', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
    'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã DVT', 'Số lượng (DVT bán hàng)',
    'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)', 'Tấn/ Hóa đơn', 'Tấn/ Chuyến',
    'TỔNG TRỌNG LƯỢNG CHUYẾN',
    money === 'divide' ? 'ĐƠN GIÁ VẬN CHUYỂN\n(Đồng)' : 'Đơn giá\n(Đồng)',
    'PHÍ BỐC XẾP\n(Đồng)',
    'Phụ phí giao hàng\n(Đồng)',
  ];
  if (withGhep) headers.push('Phí ghép điểm\n(Đồng)');
  if (money !== 'none') {
    headers.push('ĐƠN GIÁ\n(Đồng)', 'Thành tiền\ncheck\n (Đồng)', 'THÀNH TIỀN SAU HÓA ĐƠN\n(Đồng)', 'THÀNH TIỀN HÓA ĐƠN', 'CHÊNH LỆCH\n(Đồng)');
  }
  headers.push('SITE', 'Khu vực', 'Số dòng trên HĐ', 'Điều chỉnh Hóa đơn', '5 nhà', 'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', 'GẠO');
  ws.getRow(2).values = headers;

  const priceStart = 28;
  const ghepCol = withGhep ? 31 : 0;
  const unitCol = withGhep ? 32 : 31;
  const checkCol = unitCol + 1;
  const afterCol = unitCol + 2;
  const blankMoneyCol = unitCol + 3;
  const diffCol = unitCol + 4;
  const siteCol = money === 'none' ? 31 : diffCol + 1;
  const fiveCol = siteCol + 4;
  const houseCol = fiveCol + 1;

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
    row.getCell(1).value = SUPPLIER;
    row.getCell(3).value = line.invoiceNo;
    if (line.invoiceDate) row.getCell(4).value = line.invoiceDate;
    row.getCell(5).value = line.truckNo;
    row.getCell(6).value = line.customerCode;
    row.getCell(7).value = line.contactCode;
    row.getCell(8).value = line.dealer;
    row.getCell(9).value = line.actualDest;
    row.getCell(10).value = line.feeDest;
    row.getCell(11).value = {
      formula: textStyle === 'xe'
        ? `I${r}&", ("&N${r}&"), xe "&E${r}`
        : `I${r}&" "&N${r}&" ("&E${r}&")"`,
    };
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
    const fiveLetter = colLetter(fiveCol);
    row.getCell(26).value = { formula: firstOfTrip ? `${fiveLetter}${r}` : `Z${tripStart}` };
    row.getCell(26).numFmt = TON_FMT;
    writeNum(row.getCell(priceStart), line.transportRate, MONEY_FMT);
    writeNum(row.getCell(priceStart + 1), line.feeBocXep, MONEY_FMT);
    writeNum(row.getCell(priceStart + 2), line.feeChuyenTai, MONEY_FMT);
    if (withGhep) writeNum(row.getCell(ghepCol), line.feeGhepDiem, MONEY_FMT);
    if (money !== 'none') {
      const ab = colLetter(priceStart);
      const ad = colLetter(priceStart + 2);
      const unit = colLetter(unitCol);
      row.getCell(unitCol).value = money === 'divide'
        ? { formula: `SUM(${ab}${r}:${ad}${r})` }
        : { formula: `${ab}${r}` };
      row.getCell(unitCol).numFmt = MONEY_FMT;
      row.getCell(checkCol).value = {
        formula: money === 'divide'
          ? `ROUND(SUM($${ab}$${r}:$${ad}$${r})/$Z${r}*$Y${r},0)`
          : `ROUND($Y${r}*SUM($${ab}$${r}:$${ad}$${r}),0)`,
      };
      row.getCell(checkCol).numFmt = MONEY_FMT;
      row.getCell(afterCol).value = {
        formula: money === 'divide'
          ? `ROUND($${unit}$${r}/$Z${r}*$Y${r},0)`
          : `ROUND($Y${r}*$${ab}$${r},0)`,
      };
      row.getCell(afterCol).numFmt = MONEY_FMT;
      row.getCell(diffCol).value = { formula: `ROUND(${colLetter(afterCol)}${r}-${colLetter(blankMoneyCol)}${r},0)` };
      row.getCell(diffCol).numFmt = MONEY_FMT;
    }
    row.getCell(siteCol).value = line.site;
    row.getCell(siteCol + 1).value = line.khuVuc;
    if (firstOfTrip) {
      row.getCell(fiveCol).value = { formula: `SUM(${colLetter(houseCol)}${r}:${colLetter(houseCol + 5)}${r})` };
      row.getCell(fiveCol).numFmt = TON_FMT;
    }
    writeHouses(row, houseCol, line);
    paintPartial(row, [8, 9, 10], 13, line);
  });
}

function colLetter(col: number): string {
  let n = col;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function writeNppLine(workbook: ExcelJS.Workbook, lines: ClfLine[]): void {
  const ws = workbook.addWorksheet('NPP');
  ws.getRow(2).values = [
    'Mã nhà cung cấp', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng', 'Mã liên hệ giao hàng',
    'Tên khách hàng', 'Địa chỉ giao hàng', '', '', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
    'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã DVT', 'Số lượng (DVT bán hàng)',
    'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)', 'Tấn/ Hóa đơn', 'Tấn/ Chuyến', '5 nhà',
    'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', 'GẠO',
  ];
  let tripKey = '';
  lines.forEach((line, index) => {
    const r = index + 3;
    const key = `${line.truckNo}__${line.invoiceDateIso}`;
    const firstOfTrip = key !== tripKey;
    if (firstOfTrip) tripKey = key;
    const row = ws.getRow(r);
    row.getCell(1).value = SUPPLIER;
    row.getCell(2).value = line.invoiceNo;
    if (line.invoiceDate) row.getCell(3).value = line.invoiceDate;
    row.getCell(4).value = line.truckNo;
    row.getCell(5).value = line.customerCode;
    row.getCell(6).value = line.contactCode;
    row.getCell(7).value = line.customerName;
    row.getCell(8).value = line.address;
    row.getCell(9).value = line.dealer;
    row.getCell(10).value = line.actualDest;
    row.getCell(11).value = line.khungGia;
    row.getCell(12).value = line.dvt;
    writeNum(row.getCell(19), line.hdNetWeight, TON_FMT);
    row.getCell(20).value = { formula: `ROUND(S${r}/1000,3)` };
    row.getCell(20).numFmt = TON_FMT;
    row.getCell(21).value = { formula: `IF($B${r}=$B${r - 1},0,SUMIF($B:$B,$B${r},$T:$T))` };
    row.getCell(21).numFmt = TON_FMT;
    row.getCell(22).value = {
      formula: `IF(AND(D${r}=D${r - 1},C${r}=C${r - 1}),0,SUMIFS($T:$T,$C:$C,$C${r},$D:$D,$D${r}))`,
    };
    row.getCell(22).numFmt = TON_FMT;
    if (firstOfTrip) {
      row.getCell(23).value = { formula: `SUM(X${r}:AC${r})` };
      row.getCell(23).numFmt = TON_FMT;
    }
    writeHouses(row, 24, line);
    paintPartial(row, [9, 10], 8, line);
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
  tripTons: number;
  transportRate: number | null;
  feeBocXep: number | null;
  feeChuyenTai: number | null;
  feeGhepDiem: number | null;
  khuVuc: string;
  site: string;
  isPartialMatch: boolean;
  matchedAddress: string;
  clf: number | null;
  vfm: number | null;
  mcc: number | null;
  clv: number | null;
  ndfc: number | null;
  gao: number | null;
  isLe25: boolean;
}

function rollupInvoices(lines: ClfLine[]): InvoiceRollup[] {
  const order: string[] = [];
  const groups = new Map<string, ClfLine[]>();
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
      invoiceTons: group.reduce((sum, line) => sum + (line.hdNetWeight || 0) / 1000, 0),
      tripTons: 0,
      transportRate: first.transportRate,
      feeBocXep: first.feeBocXep,
      feeChuyenTai: first.feeChuyenTai,
      feeGhepDiem: first.feeGhepDiem,
      khuVuc: first.khuVuc,
      site: first.site,
      isPartialMatch: group.some((line) => line.isPartialMatch),
      matchedAddress: group.find((line) => line.matchedAddress)?.matchedAddress || '',
      clf: first.clf,
      vfm: first.vfm,
      mcc: first.mcc,
      clv: first.clv,
      ndfc: first.ndfc,
      gao: first.gao,
      isLe25: first.isLe25,
    };
  });
  let i = 0;
  while (i < invoices.length) {
    const start = i;
    const trip = `${invoices[i].truckNo}__${invoices[i].invoiceDateIso}`;
    let tons = 0;
    while (i < invoices.length && `${invoices[i].truckNo}__${invoices[i].invoiceDateIso}` === trip) {
      tons += invoices[i].invoiceTons;
      i++;
    }
    invoices[start].tripTons = tons;
  }
  return invoices;
}

function writeCover(
  workbook: ExcelJS.Workbook,
  name: string,
  lines: ClfLine[],
  contract: 'calofic' | 'clv',
  withAdjustment: boolean,
  money: 'divide' | 'multiply',
): void {
  const ws = workbook.addWorksheet(name);
  ws.getCell('A1').value = contract === 'clv'
    ? 'BẢNG KÊ CƯỚC PHÍ VẬN CHUYỂN HÀNG THÁNG …… KÈM THEO HÓA ĐƠN SỐ …… NGÀY ……'
    : 'BẢNG KÊ CƯỚC VẬN CHUYỂN HÀNG THÁNG …… KÈM THEO HÓA ĐƠN SỐ …… NGÀY ……';
  let row = 2;
  if (withAdjustment) {
    ws.getCell('A2').value = 'VÀ HÓA ĐƠN ĐIỀU CHỈNH SỐ';
    row = 3;
  }
  ws.getCell(row, 1).value = contract === 'clv'
    ? '(Theo Hợp Đồng nguyên tắc số: WILMAR CLV- PHUPHAT/2025 ngày 01 tháng 01 năm 2025)'
    : '(Theo Hợp Đồng nguyên tắc số CALOFIC-PPH/2025 ngày 01 tháng 01 năm 2025)';
  ws.getCell(row, 16).value = 'BK số:';
  ws.getCell(row + 1, 16).value = 'Ngày BK:';
  const sellerRow = row + 2;
  ws.getCell(sellerRow, 1).value = 'Đơn vị bán hàng: CÔNG TNHH DV VẬN TẢI PHÚ PHÁT';
  ws.getCell(sellerRow + 1, 1).value = 'Địa chỉ: 165 Đỗ Thị Lời, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, Việt Nam';
  ws.getCell(sellerRow + 2, 1).value = 'Mã số thuế: 0 3 1 8 5 0 8 6 2 0';
  ws.getCell(sellerRow + 3, 1).value = 'Số tài khoản: 36238 tại Ngân hàng TMCP Á Châu - PGD Nhieu Loc.';
  const buyerRow = sellerRow + 5;
  if (contract === 'clv') {
    ws.getCell(buyerRow, 1).value = 'Đơn vị mua hàng: CÔNG TY TNHH WILMAR MARKETING CLV';
    ws.getCell(buyerRow + 1, 1).value = 'Địa chỉ: Tầng 2 và Tầng 10, Tòa nhà CornerStone, Số 16 Phan Chu Trinh, Phường Cửa Nam, Thành phố Hà Nội, Việt Nam';
    ws.getCell(buyerRow + 2, 1).value = 'Mã số thuế: 0 1 0 4 1 2 8 7 4 1';
    ws.getCell(buyerRow + 3, 1).value = 'Số Tài Khoản: 0823-109111-401 - Ngân hàng Bangkok Đại Chúng - CN Hà Nội.';
    ws.getCell(buyerRow + 4, 1).value = 'A - VẬN CHUYỂN HÀNG CLV (Kho Calofic, KCN Hiệp Phước)';
  } else {
    ws.getCell(buyerRow, 1).value = 'Đơn vị mua hàng: CHI NHÁNH CÔNG TY TNHH CALOFIC TẠI HIỆP PHƯỚC, TPHCM';
    ws.getCell(buyerRow + 1, 1).value = 'Địa chỉ: Lô C21 và Lô C18-C24, Khu công nghiệp Hiệp Phước, Xã Hiệp Phước, Thành phố Hồ Chí Minh, Việt Nam';
    ws.getCell(buyerRow + 2, 1).value = 'Mã số thuế: 5 7 0 0 1 0 1 3 6 2 0 0 8';
    ws.getCell(buyerRow + 3, 1).value = 'Số Tài Khoản: 0308 00 00 03178 Ngân hàng VID Public TP.Hồ Chí Minh.';
    ws.getCell(buyerRow + 4, 1).value = 'A - Cước vận chuyển từ Kho Calofic- Hiệp Phước đến:';
  }
  const headerRow = buyerRow + 5;
  const headers = [
    'STT', 'HÓA ĐƠN', 'NGÀY', 'SỐ XE', 'ĐẠI LÝ', 'ĐIỂM GIAO HÀNG THỰC TẾ', 'ĐIỂM GIAO HÀNG TÍNH PHÍ',
    'Hóa đơn', 'Tên khách hàng', 'Địa chỉ giao hàng', 'KHUNG TẢI', 'ĐƠN VỊ TÍNH',
    'TRỌNG LƯỢNG (Tấn/Hóa Đơn)', 'TRỌNG LƯỢNG (Tấn/Chuyến)', 'TỔNG TRỌNG LƯỢNG CHUYẾN',
    'ĐƠN GIÁ VẬN CHUYỂN (Đồng)', 'PHÍ BỐC XẾP (Đồng)', 'Phụ phí giao hàng (Đồng)',
    'ĐƠN GIÁ (Đồng)', 'Thành tiền check (Đồng)', 'THÀNH TIỀN SAU HÓA ĐƠN (Đồng)', 'THÀNH TIỀN HÓA ĐƠN',
    'CHÊNH LỆCH (Đồng)', 'SITE', 'Khu vực',
  ];
  headers.forEach((header, index) => {
    ws.getCell(headerRow, index + 1).value = header;
  });

  const invoices = rollupInvoices(lines);
  let rowIdx = headerRow + 1;
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
      const excelRow = ws.getRow(r);
      const useDivide = money === 'divide';
      excelRow.getCell(1).value = stt;
      stt += 1;
      excelRow.getCell(2).value = inv.invoiceNo;
      if (inv.invoiceDate) excelRow.getCell(3).value = inv.invoiceDate;
      excelRow.getCell(4).value = inv.truckNo;
      excelRow.getCell(5).value = inv.dealer;
      excelRow.getCell(6).value = inv.actualDest;
      if (first) excelRow.getCell(7).value = inv.feeDest;
      excelRow.getCell(8).value = {
        formula: contract === 'clv'
          ? `F${r}&", ("&K${r}&"), xe "&D${r}`
          : `F${r}&" "&K${r}&" ("&D${r}&")"`,
      };
      excelRow.getCell(9).value = inv.customerName;
      excelRow.getCell(10).value = inv.address;
      excelRow.getCell(11).value = inv.khungGia;
      excelRow.getCell(12).value = inv.dvt;
      excelRow.getCell(13).value = Math.round(inv.invoiceTons * 1000) / 1000;
      excelRow.getCell(13).numFmt = TON_FMT;
      excelRow.getCell(24).value = inv.site;
      excelRow.getCell(25).value = inv.khuVuc;
      if (first) {
        excelRow.getCell(14).value = Math.round(inv.tripTons * 1000) / 1000;
        excelRow.getCell(14).numFmt = TON_FMT;
        excelRow.getCell(15).value = Math.round(inv.tripTons * 1000) / 1000;
        excelRow.getCell(15).numFmt = TON_FMT;
        writeNum(excelRow.getCell(16), inv.transportRate, MONEY_FMT);
        writeNum(excelRow.getCell(17), inv.feeBocXep, MONEY_FMT);
        writeNum(excelRow.getCell(18), inv.feeChuyenTai, MONEY_FMT);
        excelRow.getCell(19).value = { formula: useDivide ? `SUM(P${r}:R${r})` : `P${r}` };
        excelRow.getCell(19).numFmt = MONEY_FMT;
        excelRow.getCell(20).value = {
          formula: useDivide
            ? `ROUND(SUM($P${r}:$R${r})/$O${r}*$N${r},0)`
            : `ROUND($N${r}*SUM($P${r}:$R${r}),0)`,
        };
        excelRow.getCell(20).numFmt = MONEY_FMT;
        excelRow.getCell(21).value = {
          formula: useDivide ? `ROUND($S${r}/$O${r}*$N${r},0)` : `ROUND($N${r}*$P${r},0)`,
        };
        excelRow.getCell(21).numFmt = MONEY_FMT;
        excelRow.getCell(23).value = { formula: `ROUND($U${r}-$V${r},0)` };
        excelRow.getCell(23).numFmt = MONEY_FMT;
      }
      paintPartial(excelRow, [5, 6, 7], 10, {
        isPartialMatch: inv.isPartialMatch,
        matchedAddress: inv.matchedAddress,
      } as ClfLine);
      rowIdx += 1;
      i += 1;
    }
    const total = ws.getRow(rowIdx);
    total.getCell(3).value = 'Tổng cộng';
    total.getCell(4).value = { formula: `D${rowIdx - 1}` };
    total.getCell(13).value = { formula: `SUM(M${blockStart}:M${rowIdx - 1})` };
    total.getCell(13).numFmt = TON_FMT;
    total.getCell(20).value = { formula: `SUM(T${blockStart}:T${rowIdx - 1})` };
    total.getCell(20).numFmt = MONEY_FMT;
    total.getCell(24).value = invoices[start].site;
    total.getCell(25).value = invoices[start].khuVuc;
    rowIdx += 1;
  }
}

function uniqueInvoices(lines: ClfLine[]): number {
  return new Set(lines.map((line) => `${line.invoiceNo}__${line.invoiceDateIso}`)).size;
}

export async function processClfWorkbook(inputBuffer: Buffer): Promise<ProcessClfResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(inputBuffer as any);
  const missing = REQUIRED_SHEETS.filter((name) => !findSheet(workbook, name));
  if (missing.length > 0) {
    const error = new Error('MISSING_CLF_SHEET');
    (error as Error & { missing?: string[] }).missing = [...missing];
    throw error;
  }

  const sthi = readLines(findSheet(workbook, 'STHI')!, 'CLF', 'ST');
  const tinh = readLines(findSheet(workbook, 'TINH')!, 'CLF', 'TINH');
  const npp = readLines(findSheet(workbook, 'NPP')!, 'CLF', 'byKhung');
  const uni = readLines(findSheet(workbook, 'STHI (uni)')!, 'UNI-CLF', 'ST');
  const all = [...sthi, ...tinh, ...npp, ...uni];
  await enrichLines(all);

  const nppManual = npp.filter((line) => isManualInvoice(line.invoiceNo));
  const nppNumbered = npp.filter((line) => !isManualInvoice(line.invoiceNo));

  const removeNames = workbook.worksheets
    .filter((ws) => !KEEP_SHEETS.has(ws.name.trim().toLowerCase()))
    .map((ws) => ws.name);
  for (const sheetName of removeNames) workbook.removeWorksheet(sheetName);

  writeRichLine(workbook, 'STHI', sthi, 'space', 'divide', true);
  writeCover(workbook, 'STHI (2)', sthi, 'calofic', false, 'divide');
  writeRichLine(workbook, 'TINH', tinh, 'space', 'multiply', false);
  writeCover(workbook, 'TINH (2)', tinh, 'calofic', true, 'multiply');
  writeNppLine(workbook, npp);
  writeRichLine(workbook, 'STHI (uni)', uni, 'xe', 'divide', false);
  writeCover(workbook, 'STHI (uni) (2)', uni, 'clv', false, 'divide');
  writeRichLine(workbook, 'NPP1', npp, 'space', 'multiply', false);
  writeCover(workbook, 'NPP1 (2)', nppNumbered, 'calofic', true, 'multiply');
  writeCover(workbook, 'tn-aav-pa', nppManual, 'calofic', true, 'multiply');

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    stats: {
      sthi_rows: sthi.length,
      tinh_rows: tinh.length,
      npp_rows: npp.length,
      uni_rows: uni.length,
      cover_sthi_invoices: uniqueInvoices(sthi),
      cover_tinh_invoices: uniqueInvoices(tinh),
      cover_npp_invoices: uniqueInvoices(nppNumbered),
      cover_uni_invoices: uniqueInvoices(uni),
      cover_tn_invoices: uniqueInvoices(nppManual),
    },
  };
}
