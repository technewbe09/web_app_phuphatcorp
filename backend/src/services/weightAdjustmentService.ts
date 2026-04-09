import { pool } from '../config/database';

export interface WeightAdjustment {
  id: number;
  ma_hang: string;
  ten_hang: string;
  gia_tri_cu: number | null;
  gia_tri_dieu_chinh: number;
  status: 'active' | 'deactive';
  version: number;
  start_date: string;
  end_date: string | null;
  action_type: 'create' | 'update' | 'delete' | 'upload';
  action_by: number | null;
  action_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWeightAdjustmentData {
  ma_hang: string;
  ten_hang: string;
  gia_tri_cu?: number | null;
  gia_tri_dieu_chinh: number;
}

const SELECT_COLS = `
  id, ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh,
  status, version, start_date, end_date,
  action_type, action_by, action_by_name,
  created_at, updated_at
`;

async function getUserName(userId: number): Promise<string | null> {
  const result = await pool.query<{ full_name: string }>(
    'SELECT full_name FROM users WHERE id = $1',
    [userId],
  );
  return result.rows[0]?.full_name ?? null;
}

export const weightAdjustmentService = {
  async list(): Promise<WeightAdjustment[]> {
    const result = await pool.query<WeightAdjustment>(
      `SELECT ${SELECT_COLS}
       FROM weight_adjustments
       WHERE status = 'active'
       ORDER BY ma_hang ASC`,
    );
    return result.rows;
  },

  async findActiveByMaHang(maHang: string): Promise<WeightAdjustment | null> {
    const result = await pool.query<WeightAdjustment>(
      `SELECT id, version FROM weight_adjustments WHERE ma_hang = $1 AND status = 'active' LIMIT 1`,
      [maHang],
    );
    return result.rows[0] || null;
  },

  async findById(id: number): Promise<WeightAdjustment | null> {
    const result = await pool.query<WeightAdjustment>(
      `SELECT ${SELECT_COLS} FROM weight_adjustments WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create(data: CreateWeightAdjustmentData, userId: number): Promise<WeightAdjustment> {
    const existing = await this.findActiveByMaHang(data.ma_hang);
    if (existing) {
      throw { code: 'DUPLICATE_MA_HANG', ma_hang: data.ma_hang };
    }

    const actionByName = await getUserName(userId);

    const result = await pool.query<WeightAdjustment>(
      `INSERT INTO weight_adjustments
         (ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh, version, action_type, action_by, action_by_name)
       VALUES ($1, $2, $3, $4, 1, 'create', $5, $6)
       RETURNING ${SELECT_COLS}`,
      [data.ma_hang, data.ten_hang, data.gia_tri_cu ?? null, data.gia_tri_dieu_chinh, userId, actionByName],
    );
    return result.rows[0];
  },

  async softUpdate(id: number, data: CreateWeightAdjustmentData, userId: number): Promise<WeightAdjustment> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    if (data.ma_hang !== existing.ma_hang) {
      const duplicate = await this.findActiveByMaHang(data.ma_hang);
      if (duplicate) {
        throw { code: 'DUPLICATE_MA_HANG', ma_hang: data.ma_hang };
      }
    }

    const actionByName = await getUserName(userId);
    const newVersion = existing.version + 1;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE weight_adjustments
         SET status = 'deactive', end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id],
      );

      const insertResult = await client.query<WeightAdjustment>(
        `INSERT INTO weight_adjustments
           (ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh, version, action_type, action_by, action_by_name)
         VALUES ($1, $2, $3, $4, $5, 'update', $6, $7)
         RETURNING ${SELECT_COLS}`,
        [data.ma_hang, data.ten_hang, data.gia_tri_cu ?? null, data.gia_tri_dieu_chinh, newVersion, userId, actionByName],
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

  async softDelete(id: number, userId: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    const actionByName = await getUserName(userId);

    await pool.query(
      `UPDATE weight_adjustments
       SET status = 'deactive', end_date = CURRENT_TIMESTAMP,
           action_type = 'delete', action_by = $2, action_by_name = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, userId, actionByName],
    );
  },

  async uploadMany(rows: CreateWeightAdjustmentData[], userId: number): Promise<{ inserted: number }> {
    const seenMaHangs = new Set<string>();
    const inFileErrors: { row: number; ma_hang: string; reason: string }[] = [];

    rows.forEach((row, idx) => {
      if (seenMaHangs.has(row.ma_hang)) {
        inFileErrors.push({ row: idx + 2, ma_hang: row.ma_hang, reason: 'Mã hàng trùng trong file' });
      } else {
        seenMaHangs.add(row.ma_hang);
      }
    });

    const dbErrors: { row: number; ma_hang: string; reason: string }[] = [];
    const uniqueMaHangs = Array.from(seenMaHangs);
    if (uniqueMaHangs.length > 0) {
      const result = await pool.query<{ ma_hang: string }>(
        `SELECT ma_hang FROM weight_adjustments WHERE ma_hang = ANY($1::text[]) AND status = 'active'`,
        [uniqueMaHangs],
      );
      const existingMaHangs = new Set(result.rows.map((r) => r.ma_hang));
      rows.forEach((row, idx) => {
        if (existingMaHangs.has(row.ma_hang) && !inFileErrors.some((e) => e.row === idx + 2)) {
          dbErrors.push({ row: idx + 2, ma_hang: row.ma_hang, reason: 'Mã hàng đã tồn tại trong hệ thống' });
        }
      });
    }

    const allErrors = [...inFileErrors, ...dbErrors];
    if (allErrors.length > 0) {
      throw { code: 'UPLOAD_ERRORS', errors: allErrors };
    }

    const actionByName = await getUserName(userId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        await client.query(
          `INSERT INTO weight_adjustments
             (ma_hang, ten_hang, gia_tri_cu, gia_tri_dieu_chinh, version, action_type, action_by, action_by_name)
           VALUES ($1, $2, $3, $4, 1, 'upload', $5, $6)`,
          [row.ma_hang, row.ten_hang, row.gia_tri_cu ?? null, row.gia_tri_dieu_chinh, userId, actionByName],
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
