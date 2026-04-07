import { pool } from '../config/database';

export interface TripCode {
  id: number;
  ma: string;
  tuyen: string;
  so_tien: number | null;
  so_luot: number;
  status: 'active' | 'deactive';
  start_date: string;
  end_date: string | null;
  boc_xep: string | null;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTripCodeData {
  ma: string;
  tuyen: string;
  so_tien?: number | null;
  so_luot?: number | null;
  boc_xep?: string | null;
  ghi_chu?: string | null;
}

export const tripCodeService = {
  async list(): Promise<TripCode[]> {
    const result = await pool.query<TripCode>(
      `SELECT id, ma, tuyen, so_tien, so_luot, status, start_date, end_date, boc_xep, ghi_chu, created_at, updated_at
       FROM trip_codes
       WHERE status = 'active'
       ORDER BY start_date DESC`,
    );
    return result.rows;
  },

  async findActiveByMa(ma: string): Promise<TripCode | null> {
    const result = await pool.query<TripCode>(
      `SELECT id FROM trip_codes WHERE ma = $1 AND status = 'active' LIMIT 1`,
      [ma],
    );
    return result.rows[0] || null;
  },

  async findById(id: number): Promise<TripCode | null> {
    const result = await pool.query<TripCode>(
      `SELECT id, ma, tuyen, so_tien, so_luot, status, start_date, end_date, boc_xep, ghi_chu, created_at, updated_at FROM trip_codes WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create(data: CreateTripCodeData): Promise<TripCode> {
    const existing = await this.findActiveByMa(data.ma);
    if (existing) {
      throw { code: 'DUPLICATE_MA', ma: data.ma };
    }

    const result = await pool.query<TripCode>(
      `INSERT INTO trip_codes (ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, ma, tuyen, so_tien, so_luot, status, start_date, end_date, boc_xep, ghi_chu, created_at, updated_at`,
      [data.ma, data.tuyen, data.so_tien ?? null, data.so_luot ?? 1, data.boc_xep ?? 'no', data.ghi_chu ?? null],
    );
    return result.rows[0];
  },

  async softUpdate(id: number, data: CreateTripCodeData): Promise<TripCode> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    // Check if new ma conflicts with another active row (not the current one)
    if (data.ma !== existing.ma) {
      const duplicate = await this.findActiveByMa(data.ma);
      if (duplicate) {
        throw { code: 'DUPLICATE_MA', ma: data.ma };
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate old row
      await client.query(
        `UPDATE trip_codes SET status = 'deactive', end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id],
      );

      // Insert new row
      const insertResult = await client.query<TripCode>(
        `INSERT INTO trip_codes (ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, ma, tuyen, so_tien, so_luot, status, start_date, end_date, boc_xep, ghi_chu, created_at, updated_at`,
        [data.ma, data.tuyen, data.so_tien ?? null, data.so_luot ?? 1, data.boc_xep ?? 'no', data.ghi_chu ?? null],
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
      `UPDATE trip_codes SET status = 'deactive', end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id],
    );
  },

  async uploadMany(rows: CreateTripCodeData[]): Promise<{ inserted: number }> {
    // Check duplicates within the uploaded rows (case-sensitive)
    const seenMas = new Set<string>();
    const inFileErrors: { row: number; ma: string; reason: string }[] = [];
    rows.forEach((row, idx) => {
      if (seenMas.has(row.ma)) {
        inFileErrors.push({ row: idx + 2, ma: row.ma, reason: 'Mã trùng trong file' });
      } else {
        seenMas.add(row.ma);
      }
    });

    // Check duplicates against DB (active rows)
    const dbErrors: { row: number; ma: string; reason: string }[] = [];
    const uniqueMas = Array.from(seenMas);
    if (uniqueMas.length > 0) {
      const result = await pool.query<{ ma: string }>(
        `SELECT ma FROM trip_codes WHERE ma = ANY($1::text[]) AND status = 'active'`,
        [uniqueMas],
      );
      const existingMas = new Set(result.rows.map((r) => r.ma));
      rows.forEach((row, idx) => {
        if (existingMas.has(row.ma) && !inFileErrors.some((e) => e.row === idx + 2)) {
          dbErrors.push({ row: idx + 2, ma: row.ma, reason: 'Mã đã tồn tại trong hệ thống' });
        }
      });
    }

    const allErrors = [...inFileErrors, ...dbErrors];
    if (allErrors.length > 0) {
      throw { code: 'UPLOAD_ERRORS', errors: allErrors };
    }

    // Bulk insert
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        await client.query(
          `INSERT INTO trip_codes (ma, tuyen, so_tien, so_luot, boc_xep, ghi_chu) VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.ma, row.tuyen, row.so_tien ?? null, row.so_luot ?? 1, row.boc_xep ?? 'no', row.ghi_chu ?? null],
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
