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
  diem_nhan: 'Kho A',
  diem_tra: 'Kho B',
  gio_nhan: '08:00',
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
        diem_tra: 'Kho B',
        gio_nhan: '08:00',
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
        diem_tra: 'Y',
        gio_nhan: '10:30',
      },
      null,
    );

    expect(result.ghi_chu).toBeNull();
  });
});

describe('dispatchScheduleService.update', () => {
  it('updates editable fields and returns updated schedule', async () => {
    const updatedRow = { ...mockScheduleRow, diem_nhan: 'Kho C', gio_nhan: '10:00' };
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] } as never);

    const result = await dispatchScheduleService.update(1, {
      diem_nhan: 'Kho C',
      diem_tra: 'Kho B',
      gio_nhan: '10:00',
    });

    expect(result).toEqual(updatedRow);
    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query.mock.calls[0][0]).toContain('UPDATE dispatch_schedules');
  });

  it('returns null when record does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    const result = await dispatchScheduleService.update(999, {
      diem_nhan: 'A',
      diem_tra: 'B',
      gio_nhan: '08:00',
    });

    expect(result).toBeNull();
  });

  it('does not update ngay/loai_tuyen/loai_xe/xe_type (structural fields)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [mockScheduleRow] } as never);

    await dispatchScheduleService.update(1, {
      diem_nhan: 'A',
      diem_tra: 'B',
      gio_nhan: '08:00',
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
