import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { pool } from '../config/database';
import { storageService } from '../services/storageService';
import { bangKeThoService, BangKeError } from '../services/bangKeTho';
import { bangKeThoPricingLookup, resolveClvBook } from '../services/bangKeTho/pricingLookup';
import { processClvWorkbook } from '../services/bangKeTho/clvEngine';

jest.mock('../services/storageService', () => ({
  storageService: {
    upload: jest.fn().mockResolvedValue({ filename: 'out.xlsx', objectKey: 'batches/x/outputs/clv.xlsx' }),
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
    phi_chuyen_tai: null,
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
  row[0] = 'CLV';
  row[1] = '0001';
  row[2] = new Date(2026, 6, 1, 12);
  row[3] = '67C 02368';
  row[4] = '5100012242';
  row[5] = 'Khách';
  row[6] = 'Địa chỉ';
  row[7] = '>8-16 tấn';
  row[8] = 'Tấn';
  row[13] = '5100012242';
  row[16] = 1000;
  row[20] = 1.2;
  row[29] = 'GST01_CLV HP';
  for (const [idx, value] of Object.entries(overrides)) row[Number(idx)] = value;
  return row;
}

async function workbookBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Sheet1').addRow(['giữ']);
  wb.addWorksheet('Processed').addRow(['giữ processed']);
  wb.addWorksheet('VFM').addRow(['xóa']);
  const clv = wb.addWorksheet('CLV');
  clv.addRow([]);
  clv.addRow(HEADERS);
  clv.addRow(line({ 5: 'Bách Hoành', 16: '1,200', 20: 2 }));
  clv.addRow(line({ 16: 800, 20: '' }));
  clv.addRow(line({ 1: '0002', 16: 500 }));
  clv.addRow(line({ 1: 'PA9', 3: '50E 11111', 7: '>16-23 tấn', 29: '', 16: 300 }));
  clv.addRow(line({ 1: '0003', 3: '50H 44024', 7: '≤2.5 tấn', 8: 'Chuyến', 29: 'GST01_CLV HP', 16: 100 }));
  clv.addRow(line({ 1: '0004', 3: '50H 54580', 7: '<=2.5 tấn', 8: 'Chuyến', 29: 'GST01_Vinh Tuong', 16: 80 }));
  clv.addRow(line({ 0: 'MCC', 1: '999' }));
  wb.addWorksheet('NDFC').addRow(['xóa']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function formulaOf(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value && typeof value === 'object' && 'formula' in value) return String(value.formula);
  return '';
}

describe('resolveClvBook', () => {
  it('returns the CLV book and does not fall back', async () => {
    expect(resolveClvBook()).toBe('CLV');
    jest.spyOn(bangKeThoPricingLookup, 'lookupTransportRate').mockRestore();
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          route_name: 'An Giang - Châu Đốc',
          book_name: 'MCC GH',
          price: '999',
          pricing_unit: 'tan',
          range_from: '8',
          range_to: '16',
          tier_label: null,
          set_label: null,
        },
        {
          route_name: 'An Giang - Châu Đốc',
          book_name: 'CLV',
          price: '538000',
          pricing_unit: 'tan',
          range_from: '8',
          range_to: '16',
          tier_label: null,
          set_label: null,
        },
      ],
    } as never);
    const rate = await bangKeThoPricingLookup.lookupTransportRate({
      diemTinhPhi: 'An Giang - Châu Đốc',
      khungGia: '>8-16 tấn',
      invoiceDateIso: '2026-07-01',
      targetBook: resolveClvBook(),
    });
    expect(rate).toBe(538000);
  });
});

describe('processClvWorkbook', () => {
  it('throws when the CLV sheet is missing', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1');
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(processClvWorkbook(buf)).rejects.toThrow('MISSING_CLV_SHEET');
  });

  it('keeps Sheet1, Processed, CLV and appends six result sheets', async () => {
    const { buffer, stats } = await processClvWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    expect(out.worksheets.map((ws) => ws.name)).toEqual([
      'Sheet1',
      'Processed',
      'CLV',
      'clv tấn',
      'clv tấn (2)',
      'tn-aav-pa',
      'clv chuyến+uni-clv',
      'clv chuyến',
      'uni-clv',
    ]);
    expect(out.getWorksheet('Sheet1')!.getCell('A1').value).toBe('giữ');
    expect(out.getWorksheet('Processed')!.getCell('A1').value).toBe('giữ processed');
    expect(stats).toEqual({
      tan_rows: 4,
      chuyen_rows: 2,
      tan_invoices: 3,
      chuyen_invoices: 2,
      cover_tan_invoices: 2,
      cover_tn_invoices: 1,
      cover_chuyen_invoices: 1,
      cover_uni_invoices: 1,
    });
  });

  it('writes ton formulas without dividing and trip formulas with dividing', async () => {
    const { buffer } = await processClvWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    const tan = out.getWorksheet('clv tấn')!;
    expect(formulaOf(tan.getRow(3).getCell(31))).toBe('ROUND($Y3*SUM($AB3:$AD3),0)');
    expect(formulaOf(tan.getRow(3).getCell(24))).toContain('SUMIF');
    expect(tan.getRow(3).getCell(22).value).toBe(1200);
    expect(tan.getRow(3).getCell(36).value).toBe('TỈNH');
    expect(tan.getRow(4).getCell(39).value).toBeNull();
    const chuyen = out.getWorksheet('clv chuyến+uni-clv')!;
    expect(formulaOf(chuyen.getRow(3).getCell(31))).toBe('ROUND(SUM($AB3:$AD3)/$Z3*$Y3,0)');
    expect(chuyen.getRow(3).getCell(36).value).toBe('ST');
  });

  it('splits covers by slot and leaves uni-clv without a trip total', async () => {
    const { buffer } = await processClvWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    const tanCover = out.getWorksheet('clv tấn (2)')!;
    expect(tanCover.getCell('A2').value).toContain('WILMAR CLV-PHUPHAT/2025');
    expect(String(tanCover.getCell('A1').value)).not.toContain('235');
    expect(tanCover.getCell('P2').value).toBe('BK số:');
    expect(tanCover.getRow(14).getCell(2).value).toBe('0001');
    expect(tanCover.getRow(15).getCell(2).value).toBe('0002');
    expect(tanCover.getRow(16).getCell(3).value).toBe('Tổng cộng');
    expect(tanCover.getRow(16).getCell(1).value).toBeNull();

    const tn = out.getWorksheet('tn-aav-pa')!;
    expect(tn.getRow(14).getCell(2).value).toBe('PA9');
    expect(tn.getRow(14).getCell(25).value).toBe('TỈNH');

    const uni = out.getWorksheet('uni-clv')!;
    expect(uni.getRow(14).getCell(2).value).toBe('0004');
    expect(uni.getRow(15).getCell(3).value).toBeNull();
    const chuyen = out.getWorksheet('clv chuyến')!;
    expect(chuyen.getRow(14).getCell(2).value).toBe('0003');
    expect(formulaOf(chuyen.getRow(14).getCell(20))).toContain('/$O14');
    expect(chuyen.getRow(15).getCell(3).value).toBe('Tổng cộng');
  });

  it('paints a partial customer match yellow and notes the matched address', async () => {
    const { buffer } = await processClvWorkbook(await workbookBuffer());
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer as any);
    const cell = out.getWorksheet('clv tấn')!.getRow(3).getCell(13);
    expect(cell.fill).toMatchObject({ fgColor: { argb: 'FFFFEB9C' } });
    expect(cell.note).toBe('Địa chỉ khớp DB');
  });
});

describe('bangKeThoService.processClv', () => {
  it('marks the house failed when CLV is missing', async () => {
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

    await expect(bangKeThoService.processClv(batchId, 1)).rejects.toMatchObject({
      message: 'File input thiếu sheet CLV',
      statusCode: 400,
      code: 'MISSING_CLV_SHEET',
    });
    expect(mockPool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('status = \'failed\''),
      ['File input thiếu sheet CLV', batchId, 'clv'],
    );
    expect(BangKeError).toBeDefined();
  });
});
