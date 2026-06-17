import { pool } from '../config/database';

export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  notes: string | null;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface SupplierData {
  supplier_code: string;
  name: string;
  notes?: string | null;
}

export interface SupplierListResult {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadResult {
  inserted: number;
}

const SELECT_COLS = `
  id, supplier_code, name, notes, status, created_at, updated_at
`;

export const supplierService = {
  async list(
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<SupplierListResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let whereClause = "WHERE status = 'active'";

    if (search) {
      const q = `%${search}%`;
      params.push(q, q, q);
      whereClause += ` AND (supplier_code ILIKE $${params.length - 2} OR name ILIKE $${params.length - 1} OR notes ILIKE $${params.length})`;
    }

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suppliers ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query<Supplier>(
      `SELECT ${SELECT_COLS} FROM suppliers ${whereClause}
       ORDER BY supplier_code ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { suppliers: dataResult.rows, total, page, limit };
  },

  async findById(id: number): Promise<Supplier | null> {
    const result = await pool.query<Supplier>(
      `SELECT ${SELECT_COLS} FROM suppliers WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async findByCode(code: string, excludeId?: number): Promise<Supplier | null> {
    const query = excludeId != null
      ? `SELECT ${SELECT_COLS} FROM suppliers WHERE supplier_code = $1 AND status = 'active' AND id != $2`
      : `SELECT ${SELECT_COLS} FROM suppliers WHERE supplier_code = $1 AND status = 'active'`;
    const params = excludeId != null ? [code, excludeId] : [code];
    const result = await pool.query<Supplier>(query, params);
    return result.rows[0] || null;
  },

  async create(data: SupplierData): Promise<Supplier> {
    const result = await pool.query<Supplier>(
      `INSERT INTO suppliers (supplier_code, name, notes)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_COLS}`,
      [data.supplier_code, data.name, data.notes ?? null],
    );
    return result.rows[0];
  },

  async update(id: number, data: SupplierData): Promise<Supplier> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    const result = await pool.query<Supplier>(
      `UPDATE suppliers
       SET supplier_code = $1, name = $2, notes = $3
       WHERE id = $4
       RETURNING ${SELECT_COLS}`,
      [data.supplier_code, data.name, data.notes ?? null, id],
    );
    return result.rows[0];
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE suppliers SET status = 'deactive' WHERE id = $1`,
      [id],
    );
  },

  async uploadMany(rows: SupplierData[]): Promise<UploadResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        await client.query(
          `INSERT INTO suppliers (supplier_code, name, notes)
           VALUES ($1, $2, $3)`,
          [row.supplier_code, row.name, row.notes ?? null],
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
