import { pool } from '../config/database';

export interface InnerCityCustomer {
  id: number;
  customer_name: string;
  customer_code: string;
  status: 'active' | 'deactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InnerCityCustomerData {
  customer_name: string;
  customer_code: string;
  notes?: string | null;
}

export interface InnerCityCustomerListResult {
  customers: InnerCityCustomer[];
  total: number;
  page: number;
  limit: number;
}

const SELECT_COLS = `
  id, customer_name, customer_code, status, notes, created_at, updated_at
`;

export const innerCityCustomerService = {
  async getAll(
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<InnerCityCustomerListResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let whereClause = "WHERE status = 'active'";
    let countWhereClause = "WHERE status = 'active'";

    if (search) {
      const q = `%${search}%`;
      params.push(q, q);
      whereClause += ` AND (customer_name ILIKE $${params.length - 1} OR customer_code ILIKE $${params.length})`;
      countWhereClause += ` AND (customer_name ILIKE $1 OR customer_code ILIKE $2)`;
    }

    const countParams: unknown[] = [];
    if (search) {
      const q = `%${search}%`;
      countParams.push(q, q);
    }
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM inner_city_customers ${countWhereClause}`,
      countParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query<InnerCityCustomer>(
      `SELECT ${SELECT_COLS} FROM inner_city_customers ${whereClause}
       ORDER BY customer_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { customers: dataResult.rows, total, page, limit };
  },

  async findById(id: number): Promise<InnerCityCustomer | null> {
    const result = await pool.query<InnerCityCustomer>(
      `SELECT ${SELECT_COLS} FROM inner_city_customers WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async findByCode(code: string, excludeId?: number): Promise<InnerCityCustomer | null> {
    let query = `SELECT ${SELECT_COLS} FROM inner_city_customers WHERE customer_code = $1 AND status = 'active'`;
    const params: unknown[] = [code];
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    const result = await pool.query<InnerCityCustomer>(query, params);
    return result.rows[0] || null;
  },

  async create(data: InnerCityCustomerData): Promise<InnerCityCustomer> {
    const existing = await this.findByCode(data.customer_code);
    if (existing) {
      throw { code: 'DUPLICATE_CODE' };
    }

    const result = await pool.query<InnerCityCustomer>(
      `INSERT INTO inner_city_customers (customer_name, customer_code, notes)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_COLS}`,
      [data.customer_name, data.customer_code, data.notes ?? null],
    );
    return result.rows[0];
  },

  async update(id: number, data: InnerCityCustomerData): Promise<InnerCityCustomer> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    const duplicate = await this.findByCode(data.customer_code, id);
    if (duplicate) {
      throw { code: 'DUPLICATE_CODE' };
    }

    const result = await pool.query<InnerCityCustomer>(
      `UPDATE inner_city_customers
       SET customer_name = $1, customer_code = $2, notes = $3
       WHERE id = $4
       RETURNING ${SELECT_COLS}`,
      [data.customer_name, data.customer_code, data.notes ?? null, id],
    );
    return result.rows[0];
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE inner_city_customers SET status = 'deactive' WHERE id = $1`,
      [id],
    );
  },
};
