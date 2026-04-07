import { pool } from '../config/database';

export interface Vehicle {
  id: number;
  bien_so: string;
  loai: string;
  tai_xe: string[];
  status: 'active' | 'deactive';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleData {
  bien_so: string;
  loai: string;
  tai_xe?: string[];
}

const VALID_LOAI = ['Xe lớn', 'Xe nhỏ'] as const;

export const vehicleService = {
  async list(): Promise<Vehicle[]> {
    const result = await pool.query<Vehicle>(
      `SELECT id, bien_so, loai, tai_xe, status, start_date, end_date, created_at, updated_at
       FROM vehicles
       WHERE status = 'active'
       ORDER BY start_date DESC`,
    );
    return result.rows;
  },

  async findActiveByBienSo(bien_so: string): Promise<Vehicle | null> {
    const result = await pool.query<Vehicle>(
      `SELECT id FROM vehicles WHERE bien_so = $1 AND status = 'active' LIMIT 1`,
      [bien_so],
    );
    return result.rows[0] || null;
  },

  async findById(id: number): Promise<Vehicle | null> {
    const result = await pool.query<Vehicle>(
      `SELECT id, bien_so, loai, tai_xe, status, start_date, end_date, created_at, updated_at
       FROM vehicles WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create(data: CreateVehicleData): Promise<Vehicle> {
    if (!VALID_LOAI.includes(data.loai as typeof VALID_LOAI[number])) {
      throw { code: 'INVALID_LOAI', loai: data.loai };
    }

    const existing = await this.findActiveByBienSo(data.bien_so);
    if (existing) {
      throw { code: 'DUPLICATE_BIEN_SO', bien_so: data.bien_so };
    }

    const taiXe = data.tai_xe ?? [];
    const result = await pool.query<Vehicle>(
      `INSERT INTO vehicles (bien_so, loai, tai_xe)
       VALUES ($1, $2, $3)
       RETURNING id, bien_so, loai, tai_xe, status, start_date, end_date, created_at, updated_at`,
      [data.bien_so, data.loai, JSON.stringify(taiXe)],
    );
    return result.rows[0];
  },

  async softUpdate(id: number, data: CreateVehicleData): Promise<Vehicle> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    if (!VALID_LOAI.includes(data.loai as typeof VALID_LOAI[number])) {
      throw { code: 'INVALID_LOAI', loai: data.loai };
    }

    // Check if new bien_so conflicts with another active row
    if (data.bien_so !== existing.bien_so) {
      const duplicate = await this.findActiveByBienSo(data.bien_so);
      if (duplicate) {
        throw { code: 'DUPLICATE_BIEN_SO', bien_so: data.bien_so };
      }
    }

    const taiXe = data.tai_xe ?? [];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE vehicles SET status = 'deactive', end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id],
      );

      const insertResult = await client.query<Vehicle>(
        `INSERT INTO vehicles (bien_so, loai, tai_xe)
         VALUES ($1, $2, $3)
         RETURNING id, bien_so, loai, tai_xe, status, start_date, end_date, created_at, updated_at`,
        [data.bien_so, data.loai, JSON.stringify(taiXe)],
      );

      await client.query('COMMIT');
      return insertResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE vehicles SET status = 'deactive', end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id],
    );
  },

  async uploadMany(rows: CreateVehicleData[]): Promise<{ inserted: number }> {
    // Check duplicates within the uploaded rows (case-sensitive)
    const seenBienSos = new Set<string>();
    const inFileErrors: { row: number; bien_so: string; reason: string }[] = [];
    rows.forEach((row, idx) => {
      if (seenBienSos.has(row.bien_so)) {
        inFileErrors.push({ row: idx + 2, bien_so: row.bien_so, reason: 'Biển số trùng trong file' });
      } else {
        seenBienSos.add(row.bien_so);
      }
    });

    // Validate loai values
    const loaiErrors: { row: number; bien_so: string; reason: string }[] = [];
    rows.forEach((row, idx) => {
      if (!VALID_LOAI.includes(row.loai as typeof VALID_LOAI[number])) {
        if (!inFileErrors.some((e) => e.row === idx + 2)) {
          loaiErrors.push({ row: idx + 2, bien_so: row.bien_so, reason: `Loại '${row.loai}' không hợp lệ` });
        }
      }
    });

    // Check duplicates against DB (active rows)
    const dbErrors: { row: number; bien_so: string; reason: string }[] = [];
    const uniqueBienSos = Array.from(seenBienSos);
    if (uniqueBienSos.length > 0) {
      const result = await pool.query<{ bien_so: string }>(
        `SELECT bien_so FROM vehicles WHERE bien_so = ANY($1::text[]) AND status = 'active'`,
        [uniqueBienSos],
      );
      const existingBienSos = new Set(result.rows.map((r) => r.bien_so));
      rows.forEach((row, idx) => {
        if (existingBienSos.has(row.bien_so) && !inFileErrors.some((e) => e.row === idx + 2)) {
          dbErrors.push({ row: idx + 2, bien_so: row.bien_so, reason: 'Biển số đã tồn tại trong hệ thống' });
        }
      });
    }

    const allErrors = [...inFileErrors, ...loaiErrors, ...dbErrors];
    if (allErrors.length > 0) {
      throw { code: 'UPLOAD_ERRORS', errors: allErrors };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        const taiXe = row.tai_xe ?? [];
        await client.query(
          `INSERT INTO vehicles (bien_so, loai, tai_xe) VALUES ($1, $2, $3)`,
          [row.bien_so, row.loai, JSON.stringify(taiXe)],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { inserted: rows.length };
  },
};
