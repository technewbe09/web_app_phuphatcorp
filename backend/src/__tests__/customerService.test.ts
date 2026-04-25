import { customerService } from '../services/customerService';
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
  id: 1,
  diem_tra_hang: 'Acecook Việt Nam',
  ten_khach_hang: 'CÔNG TY CỔ PHẦN ACECOOK VIỆT NAM',
  tuyen_phuong: 'TP, Hồ Chí Minh - Tây Thạnh',
  tuyen_cu: 'TP, Hồ Chí Minh',
  dia_chi_giao_hang: 'LÔ SỐ II-3, ĐƯỜNG SỐ 11, KCN TÂN BÌNH, TP.HCM',
  boc_xep: false,
  status: 'active',
  created_at: '2026-04-21T00:00:00Z',
  updated_at: '2026-04-21T00:00:00Z',
};

// ─── list ────────────────────────────────────────────────────────────────────

describe('customerService.list', () => {
  it('returns active records ordered by diem_tra_hang', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);
    const result = await customerService.list();
    expect(result).toEqual([mockRow]);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no customers', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    const result = await customerService.list();
    expect(result).toEqual([]);
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('customerService.create', () => {
  it('creates successfully when diem_tra_hang is unique', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // findActiveByDiemTraHang → not found
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never); // INSERT

    const result = await customerService.create({
      diem_tra_hang: 'Acecook Việt Nam',
      ten_khach_hang: 'CÔNG TY CỔ PHẦN ACECOOK VIỆT NAM',
      tuyen_phuong: 'TP, Hồ Chí Minh - Tây Thạnh',
      tuyen_cu: 'TP, Hồ Chí Minh',
      dia_chi_giao_hang: 'LÔ SỐ II-3',
      boc_xep: false,
    });
    expect(result).toEqual(mockRow);
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('throws DUPLICATE_DIEM_TRA_HANG when diem_tra_hang already active', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as never);

    await expect(
      customerService.create({
        diem_tra_hang: 'Acecook Việt Nam',
        ten_khach_hang: 'CÔNG TY CỔ PHẦN ACECOOK VIỆT NAM',
        boc_xep: false,
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_DIEM_TRA_HANG', diem_tra_hang: 'Acecook Việt Nam' });
  });

  it('creates with null optional fields when not provided', async () => {
    const rowNoOptional = { ...mockRow, tuyen_phuong: null, tuyen_cu: null, dia_chi_giao_hang: null };
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    mockPool.query.mockResolvedValueOnce({ rows: [rowNoOptional] } as never);

    const result = await customerService.create({
      diem_tra_hang: 'Acecook Việt Nam',
      ten_khach_hang: 'CÔNG TY CỔ PHẦN ACECOOK VIỆT NAM',
      boc_xep: true,
    });
    expect(result.tuyen_phuong).toBeNull();
    expect(result.tuyen_cu).toBeNull();
    expect(result.dia_chi_giao_hang).toBeNull();
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('customerService.update', () => {
  it('updates active record successfully', async () => {
    const updatedRow = { ...mockRow, ten_khach_hang: 'ACECOOK UPDATED' };
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never); // findById
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);        // findActiveByDiemTraHang excludeId → no conflict
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] } as never); // UPDATE

    const result = await customerService.update(1, {
      diem_tra_hang: 'Acecook Việt Nam',
      ten_khach_hang: 'ACECOOK UPDATED',
      boc_xep: false,
    });
    expect(result.ten_khach_hang).toBe('ACECOOK UPDATED');
  });

  it('throws NOT_FOUND when record does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      customerService.update(999, { diem_tra_hang: 'X', ten_khach_hang: 'X', boc_xep: true }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when record is deactive', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockRow, status: 'deactive' }] } as never);

    await expect(
      customerService.update(1, { diem_tra_hang: 'X', ten_khach_hang: 'X', boc_xep: true }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws DUPLICATE_DIEM_TRA_HANG when new name conflicts with another active record', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never);    // findById
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] } as never); // findActiveByDiemTraHang excludeId → conflict

    await expect(
      customerService.update(1, { diem_tra_hang: 'Aeon Bình Tân', ten_khach_hang: 'X', boc_xep: true }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_DIEM_TRA_HANG', diem_tra_hang: 'Aeon Bình Tân' });
  });

  it('allows update with same diem_tra_hang (no conflict with itself)', async () => {
    const updatedRow = { ...mockRow, boc_xep: true };
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never); // findById
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);        // findActiveByDiemTraHang excludeId → empty (same record excluded)
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] } as never); // UPDATE

    const result = await customerService.update(1, {
      diem_tra_hang: 'Acecook Việt Nam',
      ten_khach_hang: 'CÔNG TY CỔ PHẦN ACECOOK VIỆT NAM',
      boc_xep: true,
    });
    expect(result.boc_xep).toBe(true);
  });
});

// ─── softDelete ──────────────────────────────────────────────────────────────

describe('customerService.softDelete', () => {
  it('deactivates active record successfully', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockRow] } as never); // findById
    mockPool.query.mockResolvedValueOnce({} as never);                  // UPDATE

    await expect(customerService.softDelete(1)).resolves.toBeUndefined();
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('throws NOT_FOUND for non-existent record', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(customerService.softDelete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND for already deactive record', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockRow, status: 'deactive' }] } as never);

    await expect(customerService.softDelete(1)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ─── uploadMany ──────────────────────────────────────────────────────────────

describe('customerService.uploadMany', () => {
  const rows = [
    { diem_tra_hang: 'Acecook Việt Nam', ten_khach_hang: 'ACECOOK', boc_xep: false },
    { diem_tra_hang: 'Aeon Bình Tân', ten_khach_hang: 'AEON', boc_xep: true },
  ];

  it('inserts all rows and returns count', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // DB duplicate check
    mockClient.query
      .mockResolvedValueOnce({} as never) // BEGIN
      .mockResolvedValueOnce({} as never) // INSERT row 1
      .mockResolvedValueOnce({} as never) // INSERT row 2
      .mockResolvedValueOnce({} as never); // COMMIT

    const result = await customerService.uploadMany(rows);
    expect(result.inserted).toBe(2);
  });

  it('throws UPLOAD_ERRORS for in-file duplicate diem_tra_hang', async () => {
    const dupRows = [
      { diem_tra_hang: 'Acecook Việt Nam', ten_khach_hang: 'ACECOOK A', boc_xep: false },
      { diem_tra_hang: 'Acecook Việt Nam', ten_khach_hang: 'ACECOOK B', boc_xep: true },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never); // DB check

    await expect(customerService.uploadMany(dupRows)).rejects.toMatchObject({
      code: 'UPLOAD_ERRORS',
    });
  });

  it('throws UPLOAD_ERRORS for DB duplicate diem_tra_hang', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ diem_tra_hang: 'Acecook Việt Nam' }] } as never);

    await expect(customerService.uploadMany(rows)).rejects.toMatchObject({
      code: 'UPLOAD_ERRORS',
    });
  });

  it('errors include correct row numbers (1-based header + 1)', async () => {
    const dupRows = [
      { diem_tra_hang: 'X', ten_khach_hang: 'A', boc_xep: false },
      { diem_tra_hang: 'X', ten_khach_hang: 'B', boc_xep: true },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    await expect(customerService.uploadMany(dupRows)).rejects.toMatchObject({
      code: 'UPLOAD_ERRORS',
      errors: expect.arrayContaining([
        expect.objectContaining({ row: 3, diem_tra_hang: 'X' }),
      ]),
    });
  });
});
