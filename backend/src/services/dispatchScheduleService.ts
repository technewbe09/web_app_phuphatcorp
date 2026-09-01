import { pool } from '../config/database';

export interface DispatchSchedule {
  id: number;
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  bien_so: string;
  tai_xe: string | null;
  vehicle_id: number | null;
  diem_nhan: string;
  tan: string | null;
  can: string | null;
  ghi_chu: string | null;
  invoice_status: 'created' | 'pending_review' | 'completed' | 'request_supplement';
  driver_id: number | null;
  dispatcher_id: number | null;
  documents: any[];
  supplement_note: string | null;
  driver_note: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateDispatchScheduleData {
  diem_nhan: string;
  tan?: string | null;
  can?: string | null;
  ghi_chu?: string | null;
}

export interface CreateDispatchScheduleData {
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  xe_type: 'Xe nhà' | 'Xe ngoài';
  bien_so?: string;
  tai_xe?: string | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  diem_nhan: string;
  tan?: string | null;
  can?: string | null;
  ghi_chu?: string | null;
}

export interface CreateDispatchScheduleBatchItem {
  ngay: string;
  loai_tuyen: 'Tuyến cố định' | 'Tuyến ngoài';
  loai_xe: 'Xe lớn' | 'Xe nhỏ';
  bien_so: string;
  tai_xe?: string | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  diem_nhan: string;
  tan?: string | null;
  can?: string | null;
  ghi_chu?: string | null;
}

export const dispatchScheduleService = {
  async listByDate(
    date: string,
  ): Promise<{ xe_nho: DispatchSchedule[]; xe_lon: DispatchSchedule[]; tuyen_ngoai: DispatchSchedule[] }> {
    const result = await pool.query<DispatchSchedule>(
      `SELECT id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
               diem_nhan, tan, can,
               ghi_chu, invoice_status, created_by, created_at, updated_at
         FROM dispatch_schedules
         WHERE ngay = $1
         ORDER BY loai_xe ASC, created_at ASC`,
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
          (ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id, driver_id,
            diem_nhan, tan, can, ghi_chu, created_by, invoice_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'created')
        RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id, driver_id,
                  diem_nhan, tan, can,
                  ghi_chu, invoice_status, created_by, created_at, updated_at`,
      [
        data.ngay,
        data.loai_tuyen,
        data.loai_xe,
        data.xe_type,
        data.bien_so ?? null,
        data.tai_xe ?? null,
        data.vehicle_id ?? null,
        data.driver_id ?? null,
        data.diem_nhan,
        data.tan ?? null,
        data.can ?? null,
        data.ghi_chu ?? null,
        userId,
      ],
    );

    return result.rows[0];
  },

  async createBatch(
    items: CreateDispatchScheduleBatchItem[],
    userId: number | null,
  ): Promise<DispatchSchedule[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results: DispatchSchedule[] = [];

      for (const item of items) {
        const xe_type = item.vehicle_id ? 'Xe nhà' : 'Xe ngoài';
        const result = await client.query<DispatchSchedule>(
          `INSERT INTO dispatch_schedules
              (ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id, driver_id,
                diem_nhan, tan, can, ghi_chu, created_by, invoice_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'created')
            RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id, driver_id,
                      diem_nhan, tan, can, ghi_chu, invoice_status, created_by, created_at, updated_at`,
          [
            item.ngay,
            item.loai_tuyen,
            item.loai_xe,
            xe_type,
            item.bien_so,
            item.tai_xe ?? null,
            item.vehicle_id ?? null,
            item.driver_id ?? null,
            item.diem_nhan,
            item.tan ?? null,
            item.can ?? null,
            item.ghi_chu ?? null,
            userId,
          ],
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: number, data: UpdateDispatchScheduleData): Promise<DispatchSchedule | null> {
    const result = await pool.query<DispatchSchedule>(
      `UPDATE dispatch_schedules
          SET diem_nhan = $1, tan = $2, can = $3,
              ghi_chu = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING id, ngay, loai_tuyen, loai_xe, xe_type, bien_so, tai_xe, vehicle_id,
                  diem_nhan, tan, can,
                  ghi_chu, invoice_status, created_by, created_at, updated_at`,
      [
        data.diem_nhan,
        data.tan ?? null,
        data.can ?? null,
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
