import { pool } from '../config/database';

export interface OilChangeRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  change_date: string;
  odometer_at: number;
  oil_type: string | null;
  notes: string | null;
  status: 'active' | 'deleted';
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface OilChangeDueVehicle {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  last_oil_change_date: string | null;
  last_oil_change_km: number | null;
  current_km: number | null;
  interval_km: number;
  km_since_change: number | null;
  km_overdue: number | null;
  status: 'overdue' | 'due_soon' | 'ok' | 'no_data';
}

export interface OilChangeListResult {
  records: OilChangeRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateOilChangeInput {
  vehicle_id: number;
  change_date: string;
  odometer_at: number;
  oil_type?: string;
  notes?: string;
}

export interface UpdateOilChangeInput {
  change_date?: string;
  odometer_at?: number;
  oil_type?: string;
  notes?: string;
}

const SELECT_COLS = `
  ocr.id, ocr.vehicle_id, ocr.change_date, ocr.odometer_at,
  ocr.oil_type, ocr.notes, ocr.status, ocr.created_by,
  ocr.created_at, ocr.updated_at,
  v.plate_number, v.driver_name
`;

export const oilChangeService = {
  async listAll(params: {
    vehicle_id?: number;
    page?: number;
    limit?: number;
  }): Promise<OilChangeListResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const conditions: string[] = ["ocr.status != 'deleted'"];
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    if (params.vehicle_id) {
      conditions.push(`ocr.vehicle_id = $${paramIdx++}`);
      queryParams.push(params.vehicle_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM oil_change_records ocr
       LEFT JOIN vehicles v ON ocr.vehicle_id = v.id
       ${whereClause}`,
      queryParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query<OilChangeRecord>(
      `SELECT ${SELECT_COLS} FROM oil_change_records ocr
       LEFT JOIN vehicles v ON ocr.vehicle_id = v.id
       ${whereClause}
       ORDER BY ocr.change_date DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...queryParams, limit, offset],
    );

    return { records: dataResult.rows, total, page, limit };
  },

  async getById(id: number): Promise<OilChangeRecord | null> {
    const result = await pool.query<OilChangeRecord>(
      `SELECT ${SELECT_COLS} FROM oil_change_records ocr
       LEFT JOIN vehicles v ON ocr.vehicle_id = v.id
       WHERE ocr.id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create(input: CreateOilChangeInput, userId: number): Promise<OilChangeRecord> {
    const result = await pool.query<OilChangeRecord>(
      `INSERT INTO oil_change_records (vehicle_id, change_date, odometer_at, oil_type, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, vehicle_id, change_date, odometer_at, oil_type, notes, status, created_by, created_at, updated_at`,
      [input.vehicle_id, input.change_date, input.odometer_at, input.oil_type || null, input.notes || null, userId],
    );

    const row = result.rows[0];

    const vehicleResult = await pool.query<{ plate_number: string; driver_name: string }>(
      `SELECT plate_number, driver_name FROM vehicles WHERE id = $1`,
      [input.vehicle_id],
    );

    return {
      ...row,
      plate_number: vehicleResult.rows[0]?.plate_number,
      driver_name: vehicleResult.rows[0]?.driver_name,
    };
  },

  async update(id: number, input: UpdateOilChangeInput): Promise<OilChangeRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (input.change_date !== undefined) {
      fields.push(`change_date = $${paramIdx++}`);
      params.push(input.change_date);
    }
    if (input.odometer_at !== undefined) {
      fields.push(`odometer_at = $${paramIdx++}`);
      params.push(input.odometer_at);
    }
    if (input.oil_type !== undefined) {
      fields.push(`oil_type = $${paramIdx++}`);
      params.push(input.oil_type);
    }
    if (input.notes !== undefined) {
      fields.push(`notes = $${paramIdx++}`);
      params.push(input.notes);
    }

    if (fields.length === 0) return existing;

    params.push(id);
    const result = await pool.query<OilChangeRecord>(
      `UPDATE oil_change_records SET ${fields.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, vehicle_id, change_date, odometer_at, oil_type, notes, status, created_by, created_at, updated_at`,
      params,
    );

    return await this.getById(id) as OilChangeRecord;
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.getById(id);
    if (!existing || existing.status === 'deleted') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE oil_change_records SET status = 'deleted' WHERE id = $1`,
      [id],
    );
  },

  async getDueVehicles(): Promise<OilChangeDueVehicle[]> {
    const result = await pool.query<OilChangeDueVehicle>(`
      WITH
        last_oil_change AS (
          SELECT DISTINCT ON (vehicle_id)
            vehicle_id,
            change_date,
            odometer_at
          FROM oil_change_records
          WHERE status = 'active'
          ORDER BY vehicle_id, change_date DESC
        ),
        last_fuel AS (
          SELECT DISTINCT ON (vehicle_id)
            vehicle_id,
            odometer_new
          FROM fuel_records
          ORDER BY vehicle_id, record_date DESC
        )
      SELECT
        v.id AS vehicle_id,
        v.plate_number,
        v.driver_name,
        loc.change_date AS last_oil_change_date,
        loc.odometer_at AS last_oil_change_km,
        lf.odometer_new AS current_km,
        v.oil_change_interval_km AS interval_km,
        CASE
          WHEN lf.odometer_new IS NULL THEN NULL
          WHEN loc.odometer_at IS NULL THEN lf.odometer_new
          ELSE lf.odometer_new - loc.odometer_at
        END AS km_since_change,
        CASE
          WHEN lf.odometer_new IS NULL THEN NULL
          WHEN loc.odometer_at IS NULL THEN lf.odometer_new - v.oil_change_interval_km
          ELSE (lf.odometer_new - loc.odometer_at) - v.oil_change_interval_km
        END AS km_overdue,
        CASE
          WHEN lf.odometer_new IS NULL THEN 'no_data'
          WHEN loc.odometer_at IS NULL THEN
            CASE WHEN lf.odometer_new >= v.oil_change_interval_km THEN 'overdue'
                 WHEN lf.odometer_new >= v.oil_change_interval_km * 0.8 THEN 'due_soon'
                 ELSE 'ok'
            END
          ELSE
            CASE WHEN (lf.odometer_new - loc.odometer_at) >= v.oil_change_interval_km THEN 'overdue'
                 WHEN (lf.odometer_new - loc.odometer_at) >= v.oil_change_interval_km * 0.8 THEN 'due_soon'
                 ELSE 'ok'
            END
        END AS status
      FROM vehicles v
      LEFT JOIN last_oil_change loc ON v.id = loc.vehicle_id
      LEFT JOIN last_fuel lf ON v.id = lf.vehicle_id
      WHERE v.status = 'active'
      ORDER BY
        CASE
          WHEN lf.odometer_new IS NULL THEN 3
          WHEN loc.odometer_at IS NULL THEN
            CASE WHEN lf.odometer_new >= v.oil_change_interval_km THEN 0
                 WHEN lf.odometer_new >= v.oil_change_interval_km * 0.8 THEN 1
                 ELSE 2
            END
          ELSE
            CASE WHEN (lf.odometer_new - loc.odometer_at) >= v.oil_change_interval_km THEN 0
                 WHEN (lf.odometer_new - loc.odometer_at) >= v.oil_change_interval_km * 0.8 THEN 1
                 ELSE 2
            END
        END,
        v.plate_number ASC
    `);

    return result.rows;
  },
};
