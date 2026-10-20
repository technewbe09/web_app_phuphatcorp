import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { pool } from '../config/database';
import { storageService } from '../services/storageService';
import { bangKeThoService } from '../services/bangKeTho';
import { bangKeThoPricingLookup } from '../services/bangKeTho/pricingLookup';
import { processClfWorkbook } from '../services/bangKeTho/clfEngine';

jest.mock('../services/storageService', () => ({
  storageService: {
    upload: jest.fn().mockResolvedValue({ filename: 'out.xlsx', objectKey: 'batches/x/outputs/calofic.xlsx' }),
    delete: jest.fn().mockResolvedValue(undefined),
    getStream: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;
const mockStorage = storageService as jest.Mocked<typeof storageService>;

beforeEach(() => {
  jest.clearAllMocks();
  bangKeThoPricingLookup.clearCache();
  mockPool.query.mockReset();
  jest.spyOn(bangKeThoPricingLookup, 'initCache').mockResolvedValue();
  jest.spyOn(bangKeThoPricingLookup, 'lookupCustomer').mockImplementation(async (params) => {
    if (params.tenKhachHang === 'Bách Hoành') {
      return {
        diem_tra_hang: 'Bách Hoành',
        tuyen_phuong: 'An Giang - Châu Đốc',
        diem_giao_hang_tinh_phi: 'An Giang - Châu Đốc',
        customer_id: 1,
        is_partial_match: true,
        matched_address: 'Địa chỉ khớp DB',
      };
    }
    return {
      diem_tra_hang: 'Đại lý',
      tuyen_phuong: 'Tuyến',
      diem_giao_hang_tinh_phi: 'Tuyến tính phí',
      customer_id: 2,
      is_partial_match: false,
      matched_address: '',
    };
  });
  jest.spyOn(bangKeThoPricingLookup, 'lookupTransportRate').mockResolvedValue(538000);
  jest.spyOn(bangKeThoPricingLookup, 'lookupSurcharges').mockResolvedValue({
    phi_boc_xep: 1000,
    phi_chuyen_tai: 2000,
    phi_ghep_diem: 999,
  });
});

const HEADERS = [
  'Mã nhà cung cấp', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng',
  'Tên khách hàng', 'Địa chỉ giao hàng', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
  'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã liên hệ giao hàng', 'Mã DVT',
  'Số lượng (DVT bán hàng)', 'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)',
  'Tấn/ Hóa đơn', 'Tấn/ Chuyến', 'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', 'GẠO', '',
  'Tài xế', 'Thông tin bổ sung', 'Slot',
];

function line(overrides: Record<number, unknown>): unknown[] {
  const row = new Array(HEADERS.length).fill('');
  row[0] = '2000000001';
  row[1] = '0001';
  row[2] = new Date(2026, 6, 1, 12);
  row[3] = '67C 02368';
  row[4] = '5100012242';
  row[5] = 'Khách';
  row[6] = 'Địa chỉ';
  row[7] = '≤2.5 tấn';
  row[8] = 'Tấn';
  row[13] = '5100012242';
  row[16] = '1,200';
  row[20] = 1.2;
  row[29] = 'CH02_WH PACK PRODUCT';
  for (const [idx, value] of Object.entries(overrides)) row[Number(idx)] = value;
  return row;
}

async function workbookBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Sheet1');
  wb.addWorksheet('Processed');
  const mcc = wb.addWorksheet('MCC');
  mcc.addRow(HEADERS);
  mcc.addRow(line({ 0: 'MCC', 1: '9999' }));

  const sthi = wb.addWorksheet('STHI');
  sthi.addRow(['meta']);
  sthi.addRow(HEADERS);
  sthi.addRow(line({ 5: 'Bách Hoành' }));
  sthi.addRow(line({ 1: '0002', 16: 800 }));

  const tinh = wb.addWorksheet('TINH');
  tinh.addRow(['meta']);
  tinh.addRow(HEADERS);
  tinh.addRow(line({ 1: '0100', 7: '>8-16 tấn', 29: 'GST01' }));

  const npp = wb.addWorksheet('NPP');
  npp.addRow(['meta']);
  npp.addRow(HEADERS);
  npp.addRow(line({ 1: '0200', 7: '>16-23 tấn' }));
  npp.addRow(line({ 1: 'PA9', 7: '>16-23 tấn' }));

  const uni = wb.addWorksheet('STHI (uni)');
  uni.addRow(['meta']);
  uni.addRow(HEADERS);
  uni.addRow(line({ 1: '0300', 29: 'WH Unidepot' }));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function formulaOf(cell: ExcelJS.Cell): string {
  const value = cell.value as { formula?: string } | null;
  return value && typeof value === 'object' && value.formula ? value.formula : '';
}

describe('processClfWorkbook', () => {
  it('rejects when a Calofic source sheet is missing', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('STHI');
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(processClfWorkbook(buf)).rejects.toThrow('MISSING_CLF_SHEET');
  });

  it('keeps Sheet1 and Processed, drops other factories, and writes the Calofic sheets', async () => {
    const { buffer, stats } = await processClfWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    expect(out.worksheets.map((ws) => ws.name)).toEqual([
      'Sheet1',
      'Processed',
      'STHI',
      'STHI (2)',
      'TINH',
      'TINH (2)',
      'NPP',
      'STHI (uni)',
      'STHI (uni) (2)',
      'NPP1',
      'NPP1 (2)',
      'tn-aav-pa',
    ]);
    expect(stats).toMatchObject({
      sthi_rows: 2,
      tinh_rows: 1,
      npp_rows: 2,
      uni_rows: 1,
      cover_tn_invoices: 1,
      cover_npp_invoices: 1,
    });
  });

  it('prices STHI from book CLF and keeps ghép điểm out of the unit price', async () => {
    await processClfWorkbook(await workbookBuffer());
    expect(bangKeThoPricingLookup.lookupTransportRate).toHaveBeenCalledWith(
      expect.objectContaining({ targetBook: 'CLF', supplierCode: '2000000001' }),
    );

    const { buffer } = await processClfWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    const row = out.getWorksheet('STHI')!.getRow(3);
    expect(row.getCell(22).value).toBe(1200);
    expect(formulaOf(row.getCell(11))).toBe('I3&" "&N3&" ("&E3&")"');
    expect(formulaOf(row.getCell(32))).toBe('SUM(AB3:AD3)');
    expect(row.getCell(31).value).toBe(999);
    expect(row.getCell(37).value).toBe('CLF');
    expect(row.getCell(38).value).toBe('ST');
    expect(row.getCell(13).fill).toMatchObject({ fgColor: { argb: 'FFFFEB9C' } });
    expect(row.getCell(13).note).toBe('Địa chỉ khớp DB');
  });

  it('writes UNI-CLF with the CLV contract cover and splits NPP invoices', async () => {
    const { buffer } = await processClfWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    const uni = out.getWorksheet('STHI (uni)')!.getRow(3);
    expect(formulaOf(uni.getCell(11))).toContain('xe');
    expect(uni.getCell(36).value).toBe('UNI-CLF');
    expect(String(out.getWorksheet('STHI (uni) (2)')!.getCell('A2').value)).toContain('WILMAR CLV');
    expect(String(out.getWorksheet('STHI (2)')!.getCell('A1').value)).toContain('……');
    expect(String(out.getWorksheet('STHI (2)')!.getCell('A9').value)).toContain('CALOFIC');

    const numbered = out.getWorksheet('NPP1 (2)')!;
    const manual = out.getWorksheet('tn-aav-pa')!;
    const values = (ws: ExcelJS.Worksheet) => {
      const found: string[] = [];
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value === '0200' || cell.value === 'PA9') found.push(String(cell.value));
        });
      });
      return found;
    };
    expect(values(numbered)).toEqual(['0200']);
    expect(values(manual)).toEqual(['PA9']);
    expect(out.getWorksheet('TINH')!.getRow(3).getCell(37).value).toBe('TỈNH');
  });
});

describe('bangKeThoService.processCalofic', () => {
  it('marks the house failed when a Calofic sheet is missing', async () => {
    const batchId = '11111111-1111-1111-1111-111111111111';
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{
          id: batchId,
          original_filename: '1-8.7.xlsx',
          input_object_key: 'batches/x/input.xlsx',
        }],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never);
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1');
    const inputBuf = Buffer.from(await wb.xlsx.writeBuffer());
    mockStorage.getStream.mockResolvedValue({
      stream: Readable.from(inputBuf) as never,
      stat: { size: inputBuf.length } as never,
    });

    await expect(bangKeThoService.processCalofic(batchId, 1)).rejects.toMatchObject({
      message: 'File input thiếu sheet STHI, TINH, NPP, STHI (uni)',
      statusCode: 400,
      code: 'MISSING_CLF_SHEET',
    });
  });
});
