import { pool } from '../config/database';

export interface DispatchSchedule {
  id: number;
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  bien_so: string;
  tai_xe: string | null;
  ma_chuyen: string | null;
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu: string | null;
  vehicle_id: number | null;
  trip_code_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateDispatchScheduleData {
  bien_so: string;
  tai_xe?: string | null;
  ma_chuyen?: string | null;
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu?: string | null;
  vehicle_id?: number | null;
  trip_code_id?: number | null;
}

export interface CreateDispatchScheduleData {
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  bien_so: string;
  tai_xe?: string | null;
  ma_chuyen?: string | null;
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu?: string | null;
  vehicle_id?: number | null;
  trip_code_id?: number | null;
}

export const dispatchScheduleService = {
  async listByDate(
    date: string,
  ): Promise<{ xe_nho: DispatchSchedule[]; xe_lon: DispatchSchedule[]; tuyen_ngoai: DispatchSchedule[] }> {
    const result = await pool.query<DispatchSchedule>(
      `SELECT id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, ma_chuyen,
              diem_nhan, diem_tra, to_char(gio_nhan, 'HH24:MI') AS gio_nhan,
              ghi_chu, vehicle_id, trip_code_id, created_by, created_at, updated_at
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
         (ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, ma_chuyen,
          diem_nhan, diem_tra, gio_nhan, ghi_chu,
          vehicle_id, trip_code_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, ma_chuyen,
                 diem_nhan, diem_tra, to_char(gio_nhan, 'HH24:MI') AS gio_nhan,
                 ghi_chu, vehicle_id, trip_code_id, created_by, created_at, updated_at`,
      [
        data.ngay,
        data.loai_tuyen,
        data.loai_xe,
        data.xe_type,
        data.bien_so,
        data.tai_xe ?? null,
        data.ma_chuyen ?? null,
        data.diem_nhan,
        data.diem_tra,
        data.gio_nhan,
        data.ghi_chu ?? null,
        data.vehicle_id ?? null,
        data.trip_code_id ?? null,
        userId,
      ],
    );

    return result.rows[0];
  },

  async update(id: number, data: UpdateDispatchScheduleData): Promise<DispatchSchedule | null> {
    const result = await pool.query<DispatchSchedule>(
      `UPDATE dispatch_schedules
         SET bien_so = $1, tai_xe = $2, ma_chuyen = $3,
             diem_nhan = $4, diem_tra = $5, gio_nhan = $6,
             ghi_chu = $7, vehicle_id = $8, trip_code_id = $9,
             updated_at = NOW()
       WHERE id = $10
       RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, ma_chuyen,
                 diem_nhan, diem_tra, to_char(gio_nhan, 'HH24:MI') AS gio_nhan,
                 ghi_chu, vehicle_id, trip_code_id, created_by, created_at, updated_at`,
      [
        data.bien_so,
        data.tai_xe ?? null,
        data.ma_chuyen ?? null,
        data.diem_nhan,
        data.diem_tra,
        data.gio_nhan,
        data.ghi_chu ?? null,
        data.vehicle_id ?? null,
        data.trip_code_id ?? null,
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
