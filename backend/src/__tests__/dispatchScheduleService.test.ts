import { dispatchScheduleService } from '../services/dispatchScheduleService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

const mockScheduleRow = {
  id: 1,
  ngay: '2026-04-07',
  loai_tuyen: 'Tuyến cố định',
  loai_xe: 'Xe nhỏ',
  xe_type: 'Xe nhà',
  bien_so: '51H-123.45',
  tai_xe: 'Nguyễn Văn A',
  vehicle_id: 1,
  diem_nhan: 'Kho A',
  tan: '5.5',
  can: 'CAN-001',
  ghi_chu: null,
  created_by: 1,
  created_at: '2026-04-07T01:00:00Z',
  updated_at: '2026-04-07T01:00:00Z',
};

describe('dispatchScheduleService.listByDate', () => {
  it('returns xe_nho and xe_lon split by loai_xe for Tuyến cố định, and tuyen_ngoai for Tuyến ngoài', async () => {
    const mockRows = [
      { ...mockScheduleRow, loai_tuyen: 'Tuyến cố định', loai_xe: 'Xe nhỏ', id: 1 },
      { ...mockScheduleRow, loai_tuyen: 'Tuyến cố định', loai_xe: 'Xe lớn', id: 2 },
      { ...mockScheduleRow, loai_tuyen: 'Tuyến ngoài', loai_xe: 'Xe nhỏ', id: 3 },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockRows } as never);

    const result = await dispatchScheduleService.listByDate('2026-04-07');

    expect(result.xe_nho).toHaveLength(1);
    expect(result.xe_lon).toHaveLength(1);
    expect(result.tuyen_ngoai).toHaveLength(1);
    expect(result.xe_nho[0].loai_xe).toBe('Xe nhỏ');
    expect(result.xe_lon[0].loai_xe).toBe('Xe lớn');
    expect(result.tuyen_ngoai[0].loai_tuyen).toBe('Tuyến ngoài');
  });

  it('returns empty arrays when no records for date', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    const result = await dispatchScheduleService.listByDate('2026-01-01');

    expect(result.xe_nho).toEqual([]);
    expect(result.xe_lon).toEqual([]);
    expect(result.tuyen_ngoai).toEqual([]);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE ngay = $1'),
      ['2026-01-01'],
    );
  });
});

describe('dispatchScheduleService.create', () => {
  it('inserts record and returns created schedule', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockScheduleRow] } as never);

    const result = await dispatchScheduleService.create(
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến cố định',
        loai_xe: 'Xe nhỏ',
        xe_type: 'Xe nhà',
        diem_nhan: 'Kho A',
        tan: '5.5',
        can: 'CAN-001',
      },
      1,
    );

    expect(result).toEqual(mockScheduleRow);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('handles optional fields as null', async () => {
    const rowWithNulls = { ...mockScheduleRow, ghi_chu: null };
    mockPool.query.mockResolvedValueOnce({ rows: [rowWithNulls] } as never);

    const result = await dispatchScheduleService.create(
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến ngoài',
        loai_xe: 'Xe lớn',
        xe_type: 'Xe ngoài',
        diem_nhan: 'X',
      },
      null,
    );

    expect(result.ghi_chu).toBeNull();
  });
});

describe('dispatchScheduleService.createBatch', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);
  });

  it('creates multiple trips in a transaction', async () => {
    mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockScheduleRow, id: 1 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockScheduleRow, id: 2 }] });
    mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

    const items = [
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến cố định' as const,
        loai_xe: 'Xe nhỏ' as const,
        bien_so: '51H-123.45',
        tai_xe: 'Nguyễn Văn A',
        vehicle_id: 1,
        diem_nhan: 'Kho A',
      },
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến cố định' as const,
        loai_xe: 'Xe lớn' as const,
        bien_so: '51H-678.90',
        diem_nhan: 'Kho B',
      },
    ];

    const result = await dispatchScheduleService.createBatch(items, 1);

    expect(result).toHaveLength(2);
    expect(mockClient.query).toHaveBeenCalledTimes(4); // BEGIN + 2 inserts + COMMIT
    expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
    expect(mockClient.query.mock.calls[3][0]).toBe('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('auto-detects xe_type based on vehicle_id', async () => {
    mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockScheduleRow, id: 1, xe_type: 'Xe nhà' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockScheduleRow, id: 2, xe_type: 'Xe ngoài' }] });
    mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

    const items = [
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến cố định' as const,
        loai_xe: 'Xe nhỏ' as const,
        bien_so: '51H-123.45',
        vehicle_id: 1,
        diem_nhan: 'Kho A',
      },
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến cố định' as const,
        loai_xe: 'Xe nhỏ' as const,
        bien_so: '51H-678.90',
        diem_nhan: 'Kho B',
      },
    ];

    await dispatchScheduleService.createBatch(items, 1);

    const insertCall1 = mockClient.query.mock.calls[1][1];
    const insertCall2 = mockClient.query.mock.calls[2][1];
    expect(insertCall1[3]).toBe('Xe nhà');
    expect(insertCall2[3]).toBe('Xe ngoài');
  });

  it('rolls back on error', async () => {
    mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
    mockClient.query.mockRejectedValueOnce(new Error('DB error'));
    mockClient.query.mockResolvedValueOnce(undefined); // ROLLBACK

    const items = [
      {
        ngay: '2026-04-07',
        loai_tuyen: 'Tuyến cố định' as const,
        loai_xe: 'Xe nhỏ' as const,
        bien_so: '51H-123.45',
        diem_nhan: 'Kho A',
      },
    ];

    await expect(dispatchScheduleService.createBatch(items, 1)).rejects.toThrow('DB error');
    expect(mockClient.query.mock.calls[2][0]).toBe('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

describe('dispatchScheduleService.update', () => {
  it('updates editable fields and returns updated schedule', async () => {
    const updatedRow = { ...mockScheduleRow, diem_nhan: 'Kho C' };
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] } as never);

    const result = await dispatchScheduleService.update(1, {
      diem_nhan: 'Kho C',
      tan: '6.0',
      can: 'CAN-002',
    });

    expect(result).toEqual(updatedRow);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query.mock.calls[0][0]).toContain('UPDATE dispatch_schedules');
  });

  it('returns null when record does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    const result = await dispatchScheduleService.update(999, {
      diem_nhan: 'A',
    });

    expect(result).toBeNull();
  });

  it('does not update ngay/loai_tuyen/loai_xe/xe_type (structural fields)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockScheduleRow] } as never);

    await dispatchScheduleService.update(1, {
      diem_nhan: 'A',
    });

    const sql = mockPool.query.mock.calls[0][0] as string;
    expect(sql).not.toContain('ngay =');
    expect(sql).not.toContain('loai_tuyen =');
    expect(sql).not.toContain('loai_xe =');
    expect(sql).not.toContain('xe_type =');
  });
});

describe('dispatchScheduleService.remove', () => {
  it('returns true when record exists and is deleted', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as never);

    const result = await dispatchScheduleService.remove(1);
    expect(result).toBe(true);
  });

  it('returns false when record does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 } as never);

    const result = await dispatchScheduleService.remove(999);
    expect(result).toBe(false);
  });
});
