import { pool } from '../config/database';

export interface DispatchSchedule {
  id: number;
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateDispatchScheduleData {
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu?: string | null;
}

export interface CreateDispatchScheduleData {
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu?: string | null;
}

export const dispatchScheduleService = {
  async listByDate(
    date: string,
  ): Promise<{ xe_nho: DispatchSchedule[]; xe_lon: DispatchSchedule[]; tuyen_ngoai: DispatchSchedule[] }> {
    const result = await pool.query<DispatchSchedule>(
      `SELECT id, ngay, loai_tuyen, loai_xe, xe_type,
               diem_nhan, diem_tra, to_char(gio_nhan, 'HH24:MI') AS gio_nhan,
               ghi_chu, created_by, created_at, updated_at
       FROM dispatch_schedules
       WHERE ngay = $1
       ORDER BY loai_xe ASC, gio_nhan ASC`,
      [date],
    );

    const xe_nho = result.rows.filter(
      (r) => r.loai_tuyen === 'Tuyến cố định' && r.loai_xe === 'Xe nhỏ',
    );
    const xe_lon = result.rows.filter(
      (r) => r.loai_tuyen === 'Tuyến cố định' && r.loai_xe === 'Xe lớn',
    );
    const tuyen_ngoai = result.rows.filter((r) => r.loai_tuyen === 'Tuyến ngoài');

    return { xe_nho, xe_lon, tuyen_ngoai };
  },

  async create(data: CreateDispatchScheduleData, userId: number | null): Promise<DispatchSchedule> {
    const result = await pool.query<DispatchSchedule>(
      `INSERT INTO dispatch_schedules
         (ngay, loai_tuyen, loai_xe, xe_type,
           diem_nhan, diem_tra, gio_nhan, ghi_chu, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, ngay, loai_tuyen, loai_xe, xe_type,
                 diem_nhan, diem_tra, to_char(gio_nhan, 'HH24:MI') AS gio_nhan,
                 ghi_chu, created_by, created_at, updated_at`,
      [
        data.ngay,
        data.loai_tuyen,
        data.loai_xe,
        data.xe_type,
        data.diem_nhan,
        data.diem_tra,
        data.gio_nhan,
        data.ghi_chu ?? null,
        userId,
      ],
    );

    return result.rows[0];
  },

  async update(id: number, data: UpdateDispatchScheduleData): Promise<DispatchSchedule | null> {
    const result = await pool.query<DispatchSchedule>(
      `UPDATE dispatch_schedules
         SET diem_nhan = $1, diem_tra = $2, gio_nhan = $3,
             ghi_chu = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, ngay, loai_tuyen, loai_xe, xe_type,
                 diem_nhan, diem_tra, to_char(gio_nhan, 'HH24:MI') AS gio_nhan,
                 ghi_chu, created_by, created_at, updated_at`,
      [
        data.diem_nhan,
        data.diem_tra,
        data.gio_nhan,
        data.ghi_chu ?? null,
        id,
      ],
    );
    return result.rows[0] ?? null;
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM dispatch_schedules WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },
};
