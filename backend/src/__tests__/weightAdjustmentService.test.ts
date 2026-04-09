import { weightAdjustmentService } from '../services/weightAdjustmentService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.connect.mockResolvedValue(mockClient as never);
});

const mockRow = {
  id: 1, ma_hang: 'HH001', ten_hang: 'Gạo 25kg',
  gia_tri_cu: 100, gia_tri_dieu_chinh: 102.5,
  status: 'active', version: 1,
  start_date: '2026-04-07T00:00:00Z', end_date: null,
  action_type: 'create', action_by: 1, action_by_name: 'Admin',
  created_at: '2026-04-07T00:00:00Z', updated_at: '2026-04-07T00:00:00Z',
};

// ─── list ────────────────────────────────────────────────────────────────────

describe('weightAdjustmentService.list', () => {
  it('returns active records ordered by ma_hang', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);
    const result = await weightAdjustmentService.list();
    expect(result).toEqual([mockRow]);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('weightAdjustmentService.create', () => {
  it('creates successfully when ma_hang is unique', async () => {
    // findActiveByMaHang → not found
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    // getUserName
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never);
    // INSERT
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);

    const result = await weightAdjustmentService.create(
      { ma_hang: 'HH001', ten_hang: 'Gạo 25kg', gia_tri_cu: 100, gia_tri_dieu_chinh: 102.5 },
      1,
    );
    expect(result).toEqual(mockRow);
  });

  it('throws DUPLICATE_MA_HANG when ma_hang already active', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, version: 1 }] } as never);

    await expect(
      weightAdjustmentService.create(
        { ma_hang: 'HH001', ten_hang: 'Gạo 25kg', gia_tri_dieu_chinh: 102.5 },
        1,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_MA_HANG', ma_hang: 'HH001' });
  });

  it('creates with null gia_tri_cu when not provided', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never);
    const rowNoGiaTriCu = { ...mockRow, gia_tri_cu: null };
    mockPool.query.mockResolvedValueOnce({ rows: [rowNoGiaTriCu] } as never);

    const result = await weightAdjustmentService.create(
      { ma_hang: 'HH001', ten_hang: 'Gạo 25kg', gia_tri_dieu_chinh: 102.5 },
      1,
    );
    expect(result.gia_tri_cu).toBeNull();
  });
});

// ─── softUpdate ──────────────────────────────────────────────────────────────

describe('weightAdjustmentService.softUpdate', () => {
  it('deactivates old row and inserts new version', async () => {
    // findById (existing active row)
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);
    // getUserName
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never);
    // transaction: BEGIN, UPDATE, INSERT, COMMIT
    mockClient.query
      .mockResolvedValueOnce({} as never) // BEGIN
      .mockResolvedValueOnce({} as never) // UPDATE deactivate
      .mockResolvedValueOnce({ rows: [{ ...mockRow, version: 2, action_type: 'update' }] } as never) // INSERT
      .mockResolvedValueOnce({} as never); // COMMIT

    const result = await weightAdjustmentService.softUpdate(
      1,
      { ma_hang: 'HH001', ten_hang: 'Gạo 30kg', gia_tri_dieu_chinh: 110 },
      1,
    );
    expect(result.version).toBe(2);
    expect(result.action_type).toBe('update');
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it('throws NOT_FOUND when record does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      weightAdjustmentService.softUpdate(999, { ma_hang: 'X', ten_hang: 'X', gia_tri_dieu_chinh: 1 }, 1),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when record is deactive', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockRow, status: 'deactive' }] } as never);

    await expect(
      weightAdjustmentService.softUpdate(1, { ma_hang: 'HH001', ten_hang: 'X', gia_tri_dieu_chinh: 1 }, 1),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws DUPLICATE_MA_HANG when new ma_hang conflicts with another active record', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never); // findById
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 99, version: 1 }] } as never); // findActiveByMaHang → conflict

    await expect(
      weightAdjustmentService.softUpdate(1, { ma_hang: 'HH999', ten_hang: 'X', gia_tri_dieu_chinh: 1 }, 1),
    ).rejects.toMatchObject({ code: 'DUPLICATE_MA_HANG', ma_hang: 'HH999' });
  });
});

// ─── softDelete ──────────────────────────────────────────────────────────────

describe('weightAdjustmentService.softDelete', () => {
  it('deactivates active record successfully', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never); // findById
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never); // getUserName
    mockPool.query.mockResolvedValueOnce({} as never); // UPDATE

    await expect(weightAdjustmentService.softDelete(1, 1)).resolves.toBeUndefined();
    expect(mockPool.query).toHaveBeenCalledTimes(3);
  });

  it('throws NOT_FOUND for non-existent record', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(weightAdjustmentService.softDelete(999, 1)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ─── uploadMany ──────────────────────────────────────────────────────────────

describe('weightAdjustmentService.uploadMany', () => {
  const rows = [
    { ma_hang: 'HH001', ten_hang: 'Gạo 25kg', gia_tri_dieu_chinh: 100 },
    { ma_hang: 'HH002', ten_hang: 'Bột mì', gia_tri_dieu_chinh: 50 },
  ];

  it('inserts all rows and returns count', async () => {
    // check DB duplicates
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    // getUserName
    mockPool.query.mockResolvedValueOnce({ rows: [{ full_name: 'Admin' }] } as never);
    // transaction
    mockClient.query
      .mockResolvedValueOnce({} as never) // BEGIN
      .mockResolvedValueOnce({} as never) // INSERT row 1
      .mockResolvedValueOnce({} as never) // INSERT row 2
      .mockResolvedValueOnce({} as never); // COMMIT

    const result = await weightAdjustmentService.uploadMany(rows, 1);
    expect(result.inserted).toBe(2);
  });

  it('throws UPLOAD_ERRORS for in-file duplicate ma_hang', async () => {
    const dupRows = [
      { ma_hang: 'HH001', ten_hang: 'Gạo 25kg', gia_tri_dieu_chinh: 100 },
      { ma_hang: 'HH001', ten_hang: 'Gạo dup', gia_tri_dieu_chinh: 99 },
    ];
    // DB check still runs for uniqueMaHangs (['HH001']) — return empty (no DB duplicates)
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(weightAdjustmentService.uploadMany(dupRows, 1)).rejects.toMatchObject({
      code: 'UPLOAD_ERRORS',
    });
  });

  it('throws UPLOAD_ERRORS for DB duplicate ma_hang', async () => {
    // DB returns existing ma_hang
    mockPool.query.mockResolvedValueOnce({ rows: [{ ma_hang: 'HH001' }] } as never);

    await expect(weightAdjustmentService.uploadMany(rows, 1)).rejects.toMatchObject({
      code: 'UPLOAD_ERRORS',
    });
  });
});
