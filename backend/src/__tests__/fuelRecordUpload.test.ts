import * as XLSX from 'xlsx';
import { fuelRecordService } from '../services/fuelRecordService';
import { pool } from './__mocks__/database';

const mockPool = pool as unknown as {
  query: jest.Mock;
  connect: jest.Mock;
};

describe('fuelRecordService.uploadFromExcel', () => {
  let mockClient: {
    query: jest.Mock;
    release: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);
    mockPool.query.mockResolvedValue({
      rows: [{ id: 1, plate_number: '50H-55443' }],
    });
  });

  it('correctly imports row 1 when row 0 is header missing NGÀY in A1 (startRow = 1)', async () => {
    // Construct workbook matching sheet 10-2026
    const data = [
      // Row 0: Header with empty cell A1
      [null, 'SỐ XE', null, 'SỐ KM ĐỔ', 'T.CỘNG', null, 'L/100 KM', null, 'định vị', 'T.CỘNG', 'LÍT', 'L/100 KM', null, 'THÀNH TIỀN'],
      // Row 1: First data record (should NOT be skipped!)
      [46301, '50H-55443', 216015, 216305, 290, 45, 15.5, 46747, 47079, 332, 45, 13.5, 29710, 1336950],
      // Row 2: Second data record
      [46304, '50H-55443', 216305, 216619, 314, 40, 12.7, 47079, 47399, 320, 40, 12.5, 29120, 1164800],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '10-2026');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await fuelRecordService.uploadFromExcel(buffer, 1);

    expect(result.errors).toBe(0);
    // Should import both rows (row 1 and row 2), NOT skip row 1
    expect(result.imported).toBe(2);

    // Verify insert parameters contain both records
    const insertCall = mockClient.query.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO fuel_records'),
    );
    expect(insertCall).toBeDefined();
    const flatParams = insertCall[1] as unknown[];
    // flatParams has 17 params per row. Check total cost param (14th item, index 13)
    expect(flatParams[13]).toBe(1336950); // First row cost
  });

  it('correctly imports data when row 0 is title and row 1 is header (startRow = 2)', async () => {
    const data = [
      // Row 0: Title
      ['THỐNG KÊ DẦU THÁNG 05/2026', null, null, null, null, null],
      // Row 1: Header
      ['NGÀY', 'SỐ XE', 'SỐ KM CŨ', 'SỐ KM ĐỔ', 'T.CỘNG', 'LÍT', null, null, null, null, null, null, 'ĐƠN GIÁ', 'THÀNH TIỀN'],
      // Row 2: First data record
      [46148, '50H-55443', 206058, 206377, 319, 40, null, null, null, null, null, null, 25000, 1000000],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '05-2026');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await fuelRecordService.uploadFromExcel(buffer, 1);

    expect(result.errors).toBe(0);
    expect(result.imported).toBe(1);
  });
});
