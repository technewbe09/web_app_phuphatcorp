import ExcelJS from 'exceljs';
import { pool } from '../config/database';
import { storageService } from '../services/storageService';
import { bangKeThoService } from '../services/bangKeThoService';
import { bangKeThoPricingLookup } from '../services/bangKeThoPricingLookup';
import { processNdMccWorkbook } from '../services/bangKeThoNdMccEngine';

jest.mock('../services/storageService', () => ({
  storageService: {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    getObjectStream: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;
const mockStorage = storageService as jest.Mocked<typeof storageService>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bangKeThoPricingLookup helpers', () => {
  it('maps khungGia to vehicle class correctly', () => {
    expect(bangKeThoPricingLookup.mapKhungGiaToVehicleClass('≤2.5 tấn')).toBe('le_2_5');
    expect(bangKeThoPricingLookup.mapKhungGiaToVehicleClass('<=2.5 tấn')).toBe('le_2_5');
    expect(bangKeThoPricingLookup.mapKhungGiaToVehicleClass('>8-16 tấn')).toBe('gt_8_16');
    expect(bangKeThoPricingLookup.mapKhungGiaToVehicleClass('>16-23 tấn')).toBe('gt_16_23');
  });

  it('maps khuVuc to surcharge zone correctly', () => {
    expect(bangKeThoPricingLookup.mapKhuVucToZone('ST')).toBe('noi_thanh');
    expect(bangKeThoPricingLookup.mapKhuVucToZone('NOI_THANH')).toBe('noi_thanh');
    expect(bangKeThoPricingLookup.mapKhuVucToZone('TINH')).toBe('tinh');
  });
});

describe('bangKeThoPricingLookup.lookupTransportRate', () => {
  const sampleTiers = [
    {
      route_name: 'Lâm Đồng - Lâm Viên - Đà Lạt/ Xuân Hương - Đà Lạt/ Đơn Dương',
      book_name: 'CLV',
      price: '660000',
      pricing_unit: 'tan',
      range_from: '8.000',
      range_to: '16.000',
      tier_label: null,
      set_label: null,
    },
    {
      route_name: 'Lâm Đồng - Lâm Viên - Đà Lạt/ Xuân Hương - Đà Lạt/ Đơn Dương',
      book_name: 'MCC GH',
      price: '861000',
      pricing_unit: 'tan',
      range_from: '8.000',
      range_to: '16.000',
      tier_label: null,
      set_label: null,
    },
    {
      route_name: 'Lâm Đồng - Lâm Viên - Đà Lạt/ Xuân Hương - Đà Lạt/ Đơn Dương',
      book_name: 'MCC (tt) GHÉP ND',
      price: '861000',
      pricing_unit: 'tan',
      range_from: '8.000',
      range_to: '16.000',
      tier_label: null,
      set_label: null,
    },
    {
      route_name: 'Hồ Chí Minh',
      book_name: 'MCC (tt)',
      price: '382000',
      pricing_unit: 'tan',
      range_from: '8.000',
      range_to: '16.000',
      tier_label: null,
      set_label: null,
    },
    {
      route_name: 'Hồ Chí Minh',
      book_name: 'MCC GH',
      price: '392000',
      pricing_unit: 'tan',
      range_from: '8.000',
      range_to: '16.000',
      tier_label: null,
      set_label: null,
    },
    {
      route_name: 'Hồ Chí Minh',
      book_name: 'MCC (tt) GHÉP ND',
      price: '400000',
      pricing_unit: 'tan',
      range_from: '8.000',
      range_to: '16.000',
      tier_label: null,
      set_label: null,
    },
  ];

  it('MCC-clv picks price from CLV book', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: sampleTiers } as never);
    const rate = await bangKeThoPricingLookup.lookupTransportRate({
      diemTinhPhi: 'Lâm Đồng - Lâm Viên-Đà Lạt/ Xuân Hương-Đà Lạt/ Đơn Dương',
      khungGia: '>8-16 tấn',
      invoiceDateIso: '2026-07-01',
      supplierCode: '2000000007',
      slot: 'CALOFIC HP',
    });
    expect(rate).toBe(660000);
  });

  it('MCC (uni) picks price from MCC GH book', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: sampleTiers } as never);
    const rate = await bangKeThoPricingLookup.lookupTransportRate({
      diemTinhPhi: 'Hồ Chí Minh',
      khungGia: '>8-16 tấn',
      invoiceDateIso: '2026-07-01',
      supplierCode: '2000000007',
      slot: 'WH Unidepot',
    });
    expect(rate).toBe(392000);
  });

  it('MCC (tt) without NDFC in trip picks price from MCC (tt) book', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: sampleTiers } as never);
    const rate = await bangKeThoPricingLookup.lookupTransportRate({
      diemTinhPhi: 'Hồ Chí Minh',
      khungGia: '>8-16 tấn',
      invoiceDateIso: '2026-07-01',
      supplierCode: '2000000007',
      slot: 'UNI 1',
      hasNdfcInTrip: false,
    });
    expect(rate).toBe(382000);
  });

  it('MCC (tt) with NDFC in trip picks price from MCC (tt) GHÉP ND book', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: sampleTiers } as never);
    const rate = await bangKeThoPricingLookup.lookupTransportRate({
      diemTinhPhi: 'Hồ Chí Minh',
      khungGia: '>8-16 tấn',
      invoiceDateIso: '2026-07-01',
      supplierCode: '2000000007',
      slot: 'UNI 1',
      hasNdfcInTrip: true,
    });
    expect(rate).toBe(400000);
  });

  it('returns null if route not found in target book', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: sampleTiers } as never);
    const rate = await bangKeThoPricingLookup.lookupTransportRate({
      diemTinhPhi: 'Hồ Chí Minh',
      khungGia: '>8-16 tấn',
      invoiceDateIso: '2026-07-01',
      supplierCode: '2000000007',
      slot: 'CALOFIC HP',
      targetBook: 'CLV',
    });
    expect(rate).toBeNull();
  });
});

describe('bangKeThoNdMccEngine', () => {
  async function createTestWorkbook(rows: any[][]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1');
    wb.addWorksheet('VFM');
    wb.addWorksheet('CLV');
    wb.addWorksheet('STHI');
    const ws = wb.addWorksheet('Processed');

    const headers = [
      'Mã nhà cung cấp', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng',
      'Tên khách hàng', 'Địa chỉ giao hàng', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
      'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã liên hệ giao hàng', 'Mã DVT',
      'Số lượng (DVT bán hàng)', 'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)',
      'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', '', '',
      'Tài xế', 'Thông tin bổ sung', 'Slot', 'Diễn giải', 'Channel',
      'SubChannel', 'SlotNo', 'user tạo HĐ', 'User tạo PXK', 'PO number',
      'Warehouse No', 'Warehouse Name', 'Phiếu XK', 'Chứng từ ghi sổ', 'Số seri',
      'Loại hàng', 'Tuyến cũ', 'Tuyến mới', 'Tuyến lên hóa đơn'
    ];

    ws.addRow(headers);
    for (const r of rows) {
      ws.addRow(r);
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  it('throws MISSING_PROCESSED_SHEET if Processed sheet is absent', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1');
    const buf = Buffer.from(await wb.xlsx.writeBuffer());

    await expect(processNdMccWorkbook(buf)).rejects.toThrow('MISSING_PROCESSED_SHEET');
  });

  it('generates 8 sheets with formulas and aggregates invoices correctly', async () => {
    mockPool.query.mockResolvedValue({ rows: [] } as never);

    const testRows = [
      // MCC Row 1 (CALOFIC HP)
      [
        '2000000007', 'HD001', '2026-07-01', '51C 12345', 'KH01',
        'CÔNG TY TNHH ABC', '123 ĐƯỜNG ABC, TP.HCM', '>8-16 tấn', 'Tấn', 'SP01',
        'Bột chiên giòn', 'Frying mix', '', 'CAR',
        10, 10, 100, 0.1,
        0, 0, 0.1, 0, 0, '', '',
        'Tài xế A', '', 'CALOFIC HP', '', 'RETAIL',
        'PDS', '', '', '', '',
        '', '', '', '', '',
        '', '', '', ''
      ],
      // MCC Row 2 (CALOFIC HP, same invoice HD001)
      [
        '2000000007', 'HD001', '2026-07-01', '51C 12345', 'KH01',
        'CÔNG TY TNHH ABC', '123 ĐƯỜNG ABC, TP.HCM', '>8-16 tấn', 'Tấn', 'SP02',
        'Bột mì', 'Flour', '', 'CAR',
        20, 10, 200, 0.2,
        0, 0, 0.2, 0, 0, '', '',
        'Tài xế A', '', 'CALOFIC HP', '', 'RETAIL',
        'PDS', '', '', '', '',
        '', '', '', '', '',
        '', '', '', ''
      ],
      // MCC Row 3 (WH Unidepot)
      [
        '2000000007', 'HD002', '2026-07-02', '51C 67890', 'KH02',
        'CÔNG TY TNHH XYZ', '456 ĐƯỜNG XYZ, BÌNH DƯƠNG', '>8-16 tấn', 'Tấn', 'SP03',
        'Dầu ăn', 'Cooking oil', '', 'CAR',
        50, 10, 500, 0.5,
        0, 0, 0.5, 0, 0, '', '',
        'Tài xế B', '', 'WH Unidepot', '', 'SUPERMARKET',
        'MT', '', '', '', '',
        '', '', '', '', '',
        '', '', '', ''
      ],
      // NDFC Row 4 (UNI 1)
      [
        '2000000008', 'HD003', '2026-07-03', '51C 99999', 'KH03',
        'CÔNG TY CỔ PHẦN DEF', '789 ĐƯỜNG DEF, ĐỒNG NAI', '>8-16 tấn', 'Tấn', 'SP04',
        'Bột gạo', 'Rice powder', '', 'CAR',
        30, 10, 300, 0.3,
        0, 0, 0, 0, 0.3, '', '',
        'Tài xế C', '', 'UNI 1', '', 'GENERAL',
        'GT', '', '', '', '',
        '', '', '', '', '',
        '', '', '', ''
      ],
      // Other supplier row (should be ignored)
      [
        '2000000099', 'HD999', '2026-07-01', '51C 00000', 'KH99',
        'OTHER', 'OTHER', '>8-16 tấn', 'Tấn', 'SP99',
        'Other', 'Other', '', 'CAR',
        10, 10, 100, 0.1,
        0.1, 0, 0, 0, 0, '', '',
        '', '', 'CALOFIC HP', '', '',
        '', '', '', '', '',
        '', '', '', '', '',
        '', '', '', ''
      ]
    ];

    const inputBuf = await createTestWorkbook(testRows);
    const res = await processNdMccWorkbook(inputBuf);

    expect(res.stats.mcc_rows).toBe(3);
    expect(res.stats.ndfc_rows).toBe(1);
    expect(res.stats.mcc_invoices).toBe(2);
    expect(res.stats.ndfc_invoices).toBe(1);

    const outWb = new ExcelJS.Workbook();
    await outWb.xlsx.load(res.buffer as any);

    const expectedSheets = [
      'NCC',
      'Sheet1',
      'Processed',
      'MCC (goc)',
      'MCC-clv',
      'MCC (uni)',
      'MCC (tt)',
      'NDFC (goc)',
      'NDFC-clv',
      'NDFC (uni)',
      'NDFC (tt)',
    ];
    expect(outWb.worksheets.map((w) => w.name)).toEqual(expectedSheets);

    // Verify non-scope sheets (VFM, CLV, STHI) are stripped out
    expect(outWb.getWorksheet('VFM')).toBeUndefined();
    expect(outWb.getWorksheet('CLV')).toBeUndefined();
    expect(outWb.getWorksheet('STHI')).toBeUndefined();

    // Verify MCC (goc) has 3 data rows + 2 header rows = 5 rows
    const mccGoc = outWb.getWorksheet('MCC (goc)')!;
    expect(mccGoc.rowCount).toBe(5);

    // Row 3 should have formula for Hóa đơn and Round MT
    const row3 = mccGoc.getRow(3);
    expect((row3.getCell(9).value as any)?.formula).toBe('G3&", ("&L3&"), xe "&D3');
    expect((row3.getCell(22).value as any)?.formula).toBe('ROUND(U3/1000,3)');

    // Verify MCC-clv summary sheet has 1 invoice (HD001)
    const mccClv = outWb.getWorksheet('MCC-clv')!;
    // Row 1 empty, Row 2 header, Row 3 invoice HD001
    expect(mccClv.rowCount).toBe(3);
    const clvRow3 = mccClv.getRow(3);
    expect(clvRow3.getCell(2).value).toBe('HD001');
    // Total weight for HD001 = 0.1 + 0.2 = 0.3
    expect(clvRow3.getCell(13).value).toBe(0.3);
  });

  it('preserves existing NCC sheet content and keeps exact sheet order', async () => {
    mockPool.query.mockResolvedValue({ rows: [] } as never);

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1');
    const nccWs = wb.addWorksheet('ncc');
    nccWs.addRow(['Mã NCC', 'Tên NCC', 'Ghi chú']);
    nccWs.addRow(['2000000007', 'MCC', 'Chi nhánh miền Nam']);
    nccWs.addRow(['2000000008', 'NDFC', 'Chi nhánh miền Bắc']);

    const ws = wb.addWorksheet('Processed');
    const headers = [
      'Mã nhà cung cấp', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng',
      'Tên khách hàng', 'Địa chỉ giao hàng', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
      'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã liên hệ giao hàng', 'Mã DVT',
      'Số lượng (DVT bán hàng)', 'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)',
      'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', '', '',
      'Tài xế', 'Thông tin bổ sung', 'Slot', 'Diễn giải', 'Channel',
      'SubChannel', 'SlotNo', 'user tạo HĐ', 'User tạo PXK', 'PO number',
      'Warehouse No', 'Warehouse Name', 'Phiếu XK', 'Chứng từ ghi sổ', 'Số seri',
      'Loại hàng', 'Tuyến cũ', 'Tuyến mới', 'Tuyến lên hóa đơn'
    ];
    ws.addRow(headers);
    ws.addRow([
      '2000000007', 'HD001', '2026-07-01', '51C 12345', 'KH01',
      'CÔNG TY TNHH ABC', '123 ĐƯỜNG ABC, TP.HCM', '>8-16 tấn', 'Tấn', 'SP01',
      'Bột chiên giòn', 'Frying mix', '', 'CAR',
      10, 10, 100, 0.1,
      0, 0, 0.1, 0, 0, '', '',
      'Tài xế A', '', 'CALOFIC HP', '', 'RETAIL',
      'PDS', '', '', '', '',
      '', '', '', '', '',
      '', '', '', ''
    ]);

    const inputBuf = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await processNdMccWorkbook(inputBuf);

    const outWb = new ExcelJS.Workbook();
    await outWb.xlsx.load(res.buffer as any);

    const expectedSheets = [
      'NCC',
      'Sheet1',
      'Processed',
      'MCC (goc)',
      'MCC-clv',
      'MCC (uni)',
      'MCC (tt)',
      'NDFC (goc)',
      'NDFC-clv',
      'NDFC (uni)',
      'NDFC (tt)',
    ];
    expect(outWb.worksheets.map((w) => w.name)).toEqual(expectedSheets);

    const outNcc = outWb.getWorksheet('NCC')!;
    expect(outNcc.getRow(1).getCell(1).value).toBe('Mã NCC');
    expect(outNcc.getRow(2).getCell(1).value).toBe('2000000007');
    expect(outNcc.getRow(2).getCell(2).value).toBe('MCC');
    expect(outNcc.getRow(3).getCell(1).value).toBe('2000000008');
  });
});

describe('bangKeThoService.processNdMcc', () => {
  it('updates outputs to ready and saves to storage', async () => {
    const batchId = '11111111-1111-1111-1111-111111111111';

    // 1. Batch lookup mock
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{
          id: batchId,
          original_filename: '1-8.7.xlsx',
          input_object_key: 'batches/11111111-1111-1111-1111-111111111111/input.xlsx'
        }],
      } as never)
      // Customers cache init
      .mockResolvedValueOnce({ rows: [] } as never)
      // Rate lookups
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      // Update bang_ke_tho_outputs
      .mockResolvedValueOnce({
        rows: [{
          generated_at: '2026-09-19T00:00:00.000Z',
          download_filename: 'ND-MCC 1-8.7.xlsx'
        }]
      } as never);

    // Create minimal valid input buffer with Processed sheet
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Processed');
    ws.addRow([
      'Mã nhà cung cấp', 'Số hóa đơn', 'Ngày hóa đơn', 'Số tàu', 'Mã khách hàng',
      'Tên khách hàng', 'Địa chỉ giao hàng', 'Khung giá', 'Đơn vị tính', 'Mã hàng hóa',
      'Tên hàng hóa (Vie)', 'Tên hàng hóa (En)', 'Mã liên hệ giao hàng', 'Mã DVT',
      'Số lượng (DVT bán hàng)', 'SP Trọng lượng net', 'HĐ Trọng lượng (Net)', 'Round(MT)',
      'CLF', 'VFM', 'MCC', 'CLV', 'NDFC', '', '',
      'Tài xế', 'Thông tin bổ sung', 'Slot', 'Diễn giải', 'Channel'
    ]);
    ws.addRow([
      '2000000007', 'HD001', '2026-07-01', '51C 12345', 'KH01',
      'ABC', 'HCM', '>8-16 tấn', 'Tấn', 'SP01',
      'Bột', 'Flour', '', 'CAR',
      10, 10, 100, 0.1,
      0, 0, 0.1, 0, 0, '', '',
      '', '', 'CALOFIC HP', '', 'RETAIL'
    ]);
    const inputBuf = Buffer.from(await wb.xlsx.writeBuffer());

    // Readable stream mock
    const { Readable } = await import('stream');
    const stream = Readable.from(inputBuf);
    mockStorage.getObjectStream.mockResolvedValue({
      stream: stream as any,
      stat: { size: inputBuf.length } as any,
    });

    const result = await bangKeThoService.processNdMcc(batchId, 1);

    expect(result.batch_id).toBe(batchId);
    expect(result.house_code).toBe('nd_mcc');
    expect(result.status).toBe('ready');
    expect(result.download_filename).toBe('ND-MCC 1-8.7.xlsx');
    expect(result.stats.mcc_rows).toBe(1);
    expect(mockStorage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'batches/11111111-1111-1111-1111-111111111111/outputs/nd_mcc.xlsx',
      })
    );
  });
});
