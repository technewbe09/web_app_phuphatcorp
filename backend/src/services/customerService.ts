import { pool } from '../config/database';

export interface Customer {
  id: number;
  diem_tra_hang: string;
  ten_khach_hang: string;
  tuyen_phuong: string | null;
  tuyen_cu: string | null;
  dia_chi_giao_hang: string | null;
  boc_xep: boolean;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface CustomerData {
  diem_tra_hang: string;
  ten_khach_hang: string;
  tuyen_phuong?: string | null;
  tuyen_cu?: string | null;
  dia_chi_giao_hang?: string | null;
  boc_xep: boolean;
}

const SELECT_COLS = `
  id, diem_tra_hang, ten_khach_hang, tuyen_phuong, tuyen_cu,
  dia_chi_giao_hang, boc_xep, status, created_at, updated_at
`;

export const customerService = {
  async list(): Promise<Customer[]> {
    const result = await pool.query<Customer>(
      `SELECT ${SELECT_COLS}
       FROM customers
       WHERE status = 'active'
       ORDER BY diem_tra_hang ASC`,
    );
    return result.rows;
  },

  async findById(id: number): Promise<Customer | null> {
    const result = await pool.query<Customer>(
      `SELECT ${SELECT_COLS} FROM customers WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create(data: CustomerData): Promise<Customer> {
    const result = await pool.query<Customer>(
      `INSERT INTO customers
         (diem_tra_hang, ten_khach_hang, tuyen_phuong, tuyen_cu, dia_chi_giao_hang, boc_xep)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLS}`,
      [
        data.diem_tra_hang,
        data.ten_khach_hang,
        data.tuyen_phuong ?? null,
        data.tuyen_cu ?? null,
        data.dia_chi_giao_hang ?? null,
        data.boc_xep,
      ],
    );
    return result.rows[0];
  },

  async update(id: number, data: CustomerData): Promise<Customer> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    const result = await pool.query<Customer>(
      `UPDATE customers
       SET diem_tra_hang = $1, ten_khach_hang = $2, tuyen_phuong = $3,
           tuyen_cu = $4, dia_chi_giao_hang = $5, boc_xep = $6
       WHERE id = $7
       RETURNING ${SELECT_COLS}`,
      [
        data.diem_tra_hang,
        data.ten_khach_hang,
        data.tuyen_phuong ?? null,
        data.tuyen_cu ?? null,
        data.dia_chi_giao_hang ?? null,
        data.boc_xep,
        id,
      ],
    );
    return result.rows[0];
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE customers SET status = 'deactive' WHERE id = $1`,
      [id],
    );
  },

  async uploadMany(rows: CustomerData[]): Promise<{ inserted: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        await client.query(
          `INSERT INTO customers
             (diem_tra_hang, ten_khach_hang, tuyen_phuong, tuyen_cu, dia_chi_giao_hang, boc_xep)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            row.diem_tra_hang,
            row.ten_khach_hang,
            row.tuyen_phuong ?? null,
            row.tuyen_cu ?? null,
            row.dia_chi_giao_hang ?? null,
            row.boc_xep,
          ],
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
