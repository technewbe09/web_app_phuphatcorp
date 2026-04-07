import { driverService } from '../services/driverService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── driverService.list ───────────────────────────────────────────────────────

describe('driverService.list', () => {
  it('returns active drivers ordered by ten_ky_hieu', async () => {
    const mockDrivers = [
      { id: 1, ten_ky_hieu: 'TX01', ho_ten: 'Nguyễn Văn A', lien_he: null, cccd: null, ghi_chu: null, status: 'active', created_at: '2026-04-07', updated_at: '2026-04-07' },
      { id: 2, ten_ky_hieu: 'TX02', ho_ten: null, lien_he: null, cccd: null, ghi_chu: null, status: 'active', created_at: '2026-04-07', updated_at: '2026-04-07' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockDrivers } as never);

    const result = await driverService.list();
    expect(result).toEqual(mockDrivers);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });
});

// ─── driverService.create ────────────────────────────────────────────────────

describe('driverService.create', () => {
  it('creates driver successfully when ten_ky_hieu is unique', async () => {
    // findByTenKyHieu → not found
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    // INSERT
    const newDriver = { id: 1, ten_ky_hieu: 'TX01', ho_ten: null, lien_he: null, cccd: null, ghi_chu: null, status: 'active', created_at: '2026-04-07', updated_at: '2026-04-07' };
    mockPool.query.mockResolvedValueOnce({ rows: [newDriver] } as never);

    const result = await driverService.create({ ten_ky_hieu: 'TX01' });
    expect(result).toEqual(newDriver);
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('throws DUPLICATE_TEN_KY_HIEU when ten_ky_hieu already exists', async () => {
    // findByTenKyHieu → found
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as never);

    await expect(driverService.create({ ten_ky_hieu: 'TX01' })).rejects.toMatchObject({
      code: 'DUPLICATE_TEN_KY_HIEU',
      ten_ky_hieu: 'TX01',
    });
  });
});

// ─── driverService.update ────────────────────────────────────────────────────

describe('driverService.update', () => {
  it('updates driver successfully', async () => {
    const existing = { id: 1, ten_ky_hieu: 'TX01', ho_ten: null, lien_he: null, cccd: null, ghi_chu: null, status: 'active', created_at: '2026-04-07', updated_at: '2026-04-07' };
    // findById
    mockPool.query.mockResolvedValueOnce({ rows: [existing] } as never);
    // UPDATE RETURNING
    const updated = { ...existing, ho_ten: 'Nguyễn Văn A', updated_at: '2026-04-07' };
    mockPool.query.mockResolvedValueOnce({ rows: [updated] } as never);

    const result = await driverService.update(1, { ten_ky_hieu: 'TX01', ho_ten: 'Nguyễn Văn A' });
    expect(result).toEqual(updated);
  });

  it('throws NOT_FOUND when driver does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(driverService.update(999, { ten_ky_hieu: 'TX99' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws DUPLICATE_TEN_KY_HIEU when renaming to an existing alias', async () => {
    const existing = { id: 1, ten_ky_hieu: 'TX01', status: 'active' };
    mockPool.query.mockResolvedValueOnce({ rows: [existing] } as never);
    // findByTenKyHieu for new alias → found (another driver)
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] } as never);

    await expect(driverService.update(1, { ten_ky_hieu: 'TX02' })).rejects.toMatchObject({
      code: 'DUPLICATE_TEN_KY_HIEU',
      ten_ky_hieu: 'TX02',
    });
  });
});

// ─── driverService.softDelete ────────────────────────────────────────────────

describe('driverService.softDelete', () => {
  it('soft-deletes active driver', async () => {
    const existing = { id: 1, ten_ky_hieu: 'TX01', status: 'active' };
    mockPool.query.mockResolvedValueOnce({ rows: [existing] } as never);
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(driverService.softDelete(1)).resolves.toBeUndefined();
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('throws NOT_FOUND when driver is already deactive', async () => {
    const existing = { id: 1, ten_ky_hieu: 'TX01', status: 'deactive' };
    mockPool.query.mockResolvedValueOnce({ rows: [existing] } as never);

    await expect(driverService.softDelete(1)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ─── driverService.uploadDocument ───────────────────────────────────────────

describe('driverService.uploadDocument', () => {
  it('uploads document successfully', async () => {
    const driver = { id: 1, ten_ky_hieu: 'TX01', status: 'active' };
    mockPool.query.mockResolvedValueOnce({ rows: [driver] } as never);
    const doc = { id: 1, driver_id: 1, file_name: 'cccd.jpg', mime_type: 'image/jpeg', file_size: 102400, created_at: '2026-04-07' };
    mockPool.query.mockResolvedValueOnce({ rows: [doc] } as never);

    const result = await driverService.uploadDocument(1, {
      file_name: 'cccd.jpg',
      mime_type: 'image/jpeg',
      file_data: 'base64data',
      file_size: 102400,
    });
    expect(result).toEqual(doc);
  });

  it('throws FILE_TOO_LARGE when file_size > 5MB', async () => {
    const driver = { id: 1, ten_ky_hieu: 'TX01', status: 'active' };
    mockPool.query.mockResolvedValueOnce({ rows: [driver] } as never);

    await expect(
      driverService.uploadDocument(1, {
        file_name: 'big.pdf',
        file_data: 'base64data',
        file_size: 6 * 1024 * 1024, // 6MB
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('throws NOT_FOUND when driver does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      driverService.uploadDocument(999, { file_name: 'x.pdf', file_data: 'data' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ─── driverService.deleteDocument ───────────────────────────────────────────

describe('driverService.deleteDocument', () => {
  it('deletes document successfully', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as never);
    await expect(driverService.deleteDocument(1, 1)).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when document does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 } as never);
    await expect(driverService.deleteDocument(1, 999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
