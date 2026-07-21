import { pool } from '../config/database';
import { storageService } from './storageService';

export interface InsuranceRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  purchase_date: string;
  expiry_date: string;
  notes: string | null;
  status: 'active' | 'expired' | 'superseded' | 'deleted';
  images?: InsuranceImage[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceImage {
  id: number;
  insurance_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface InsuranceListResult {
  insurances: InsuranceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInsuranceInput {
  vehicle_id: number;
  purchase_date: string;
  expiry_date: string;
  notes?: string;
}

export interface UpdateInsuranceInput {
  purchase_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface VehicleInsuranceSummary {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  latest_insurance_id: number | null;
  latest_purchase_date: string | null;
  latest_expiry_date: string | null;
  latest_status: string | null;
  insurance_count: number;
}

const SELECT_COLS = `
  ir.id, ir.vehicle_id, ir.purchase_date, ir.expiry_date,
  ir.notes, ir.status, ir.created_by, ir.created_at, ir.updated_at,
  v.plate_number, v.driver_name
`;

const IMAGE_SELECT_COLS = `
  id, insurance_id, filename, original_filename, file_path, file_size, mime_type, created_at
`;

export const insuranceService = {
  async listAll(params: {
    vehicle_id?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InsuranceListResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const conditions: string[] = ["ir.status != 'deleted'"];
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    if (params.vehicle_id) {
      conditions.push(`ir.vehicle_id = $${paramIdx++}`);
      queryParams.push(params.vehicle_id);
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'expiring') {
        conditions.push(`ir.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND ir.expiry_date >= CURRENT_DATE AND ir.status = 'active'`);
      } else {
        conditions.push(`ir.status = $${paramIdx++}`);
        queryParams.push(params.status);
      }
    }

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(`v.plate_number ILIKE $${paramIdx++}`);
      queryParams.push(q);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM insurance_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       ${whereClause}`,
      queryParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query<InsuranceRecord>(
      `SELECT ${SELECT_COLS} FROM insurance_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       ${whereClause}
       ORDER BY ir.expiry_date ASC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...queryParams, limit, offset],
    );

    return { insurances: dataResult.rows, total, page, limit };
  },

  async getById(id: number): Promise<InsuranceRecord | null> {
    const result = await pool.query<InsuranceRecord>(
      `SELECT ${SELECT_COLS} FROM insurance_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       WHERE ir.id = $1`,
      [id],
    );
    if (!result.rows[0]) return null;

    const images = await pool.query<InsuranceImage>(
      `SELECT ${IMAGE_SELECT_COLS} FROM insurance_images WHERE insurance_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return { ...result.rows[0], images: images.rows };
  },

  async create(input: CreateInsuranceInput, userId: number): Promise<InsuranceRecord> {
    const vehicleCheck = await pool.query<{ vehicle_type: string }>(
      `SELECT vehicle_type FROM vehicles WHERE id = $1`,
      [input.vehicle_id],
    );
    if (!vehicleCheck.rows[0]) {
      throw { code: 'NOT_FOUND', message: 'Không tìm thấy xe' };
    }
    if (vehicleCheck.rows[0].vehicle_type !== 'Xe nhà') {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Chỉ cho phép tạo bảo hiểm cho xe loại "Xe nhà"',
        status: 400,
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const activeResult = await client.query<{ id: number; expiry_date: string }>(
        `SELECT id, expiry_date FROM insurance_records
         WHERE vehicle_id = $1 AND status = 'active'
         ORDER BY expiry_date DESC LIMIT 1`,
        [input.vehicle_id],
      );

      if (activeResult.rows.length > 0) {
        const activeExpiry = new Date(activeResult.rows[0].expiry_date);
        const newExpiry = new Date(input.expiry_date);

        if (newExpiry <= activeExpiry) {
          const formattedDate = activeExpiry.toLocaleDateString('vi-VN');
          throw {
            code: 'VALIDATION_ERROR',
            message: `Ngày hết hạn phải sau ngày hết hạn hiện tại (${formattedDate})`,
            status: 400,
          };
        }

        await client.query(
          `UPDATE insurance_records SET status = 'superseded' WHERE id = $1`,
          [activeResult.rows[0].id],
        );
      }

      const insertResult = await client.query<InsuranceRecord>(
        `INSERT INTO insurance_records (vehicle_id, purchase_date, expiry_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, vehicle_id, purchase_date, expiry_date, notes, status, created_by, created_at, updated_at`,
        [input.vehicle_id, input.purchase_date, input.expiry_date, input.notes || null, userId],
      );

      await client.query('COMMIT');

      const row = insertResult.rows[0];
      const vehicle = await pool.query<{ plate_number: string; driver_name: string }>(
        `SELECT plate_number, driver_name FROM vehicles WHERE id = $1`,
        [row.vehicle_id],
      );

      return {
        ...row,
        plate_number: vehicle.rows[0]?.plate_number,
        driver_name: vehicle.rows[0]?.driver_name,
        images: [],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: number, input: UpdateInsuranceInput): Promise<InsuranceRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (input.purchase_date !== undefined) {
      fields.push(`purchase_date = $${paramIdx++}`);
      params.push(input.purchase_date);
    }
    if (input.expiry_date !== undefined) {
      fields.push(`expiry_date = $${paramIdx++}`);
      params.push(input.expiry_date);
    }
    if (input.notes !== undefined) {
      fields.push(`notes = $${paramIdx++}`);
      params.push(input.notes);
    }

    if (fields.length === 0) return existing;

    params.push(id);
    await pool.query(
      `UPDATE insurance_records SET ${fields.join(', ')} WHERE id = $${paramIdx}`,
      params,
    );

    const updated = await this.getById(id);
    return updated!;
  },

  async softDelete(id: number): Promise<void> {
    const result = await pool.query(
      `UPDATE insurance_records SET status = 'deleted' WHERE id = $1 AND status != 'deleted' RETURNING id`,
      [id],
    );
    if (result.rowCount === 0) {
      throw { code: 'NOT_FOUND' };
    }
  },

  async getExpiring(days: number = 30): Promise<InsuranceRecord[]> {
    const result = await pool.query<InsuranceRecord>(
      `SELECT ${SELECT_COLS} FROM insurance_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       WHERE ir.status = 'active'
         AND ir.expiry_date <= CURRENT_DATE + $1::INTEGER
         AND ir.expiry_date >= CURRENT_DATE
       ORDER BY ir.expiry_date ASC`,
      [days],
    );
    return result.rows;
  },

  async addImage(insuranceId: number, file: Express.Multer.File): Promise<InsuranceImage> {
    const exists = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM insurance_records WHERE id = $1) AS exists`,
      [insuranceId],
    );
    if (!exists.rows[0].exists) {
      throw { code: 'NOT_FOUND' };
    }

    const uploadResult = await storageService.upload(file.buffer, file.originalname, file.mimetype);

    const result = await pool.query<InsuranceImage>(
      `INSERT INTO insurance_images (insurance_id, filename, original_filename, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${IMAGE_SELECT_COLS}`,
      [insuranceId, uploadResult.filename, file.originalname, uploadResult.objectKey, file.size, file.mimetype],
    );
    return result.rows[0];
  },

  async deleteImage(imageId: number): Promise<void> {
    const result = await pool.query<InsuranceImage>(
      `SELECT filename FROM insurance_images WHERE id = $1`,
      [imageId],
    );
    if (!result.rows[0]) {
      throw { code: 'NOT_FOUND' };
    }

    await storageService.delete(result.rows[0].filename);

    await pool.query(`DELETE FROM insurance_images WHERE id = $1`, [imageId]);
  },

  async getImages(insuranceId: number): Promise<InsuranceImage[]> {
    const result = await pool.query<InsuranceImage>(
      `SELECT ${IMAGE_SELECT_COLS} FROM insurance_images WHERE insurance_id = $1 ORDER BY created_at ASC`,
      [insuranceId],
    );
    return result.rows;
  },

  async getVehicleSummary(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ vehicles: VehicleInsuranceSummary[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    let whereLatest = '';
    if (params.status && params.status !== 'all') {
      if (params.status === 'expired') {
        whereLatest = `AND li.expiry_date < CURRENT_DATE`;
      } else if (params.status === 'expiring') {
        whereLatest = `AND li.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`;
      } else if (params.status === 'active') {
        whereLatest = `AND li.expiry_date >= CURRENT_DATE`;
      } else if (params.status === 'no_insurance') {
        whereLatest = `AND li.id IS NULL`;
      }
    }

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(`(v.plate_number ILIKE $${paramIdx} OR v.driver_name ILIKE $${paramIdx})`);
      queryParams.push(q);
      paramIdx++;
    }

    const searchWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      WITH latest_insurance AS (
        SELECT DISTINCT ON (vehicle_id)
          id, vehicle_id, purchase_date, expiry_date, status
        FROM insurance_records
        WHERE status IN ('active', 'expired')
        ORDER BY vehicle_id, expiry_date DESC
      ),
      insurance_counts AS (
        SELECT vehicle_id, COUNT(*) AS cnt
        FROM insurance_records
        WHERE status != 'deleted'
        GROUP BY vehicle_id
      )
      SELECT
        v.id AS vehicle_id,
        v.plate_number,
        v.driver_name,
        li.id AS latest_insurance_id,
        li.purchase_date AS latest_purchase_date,
        li.expiry_date AS latest_expiry_date,
        li.status AS latest_status,
        COALESCE(ic.cnt, 0)::int AS insurance_count,
        COUNT(*) OVER()::int AS total_count
      FROM vehicles v
      LEFT JOIN latest_insurance li ON li.vehicle_id = v.id
      LEFT JOIN insurance_counts ic ON ic.vehicle_id = v.id
      WHERE v.status = 'active'
        AND v.vehicle_type = 'Xe nhà'
        ${whereLatest}
        ${searchWhere}
      ORDER BY
        CASE WHEN li.id IS NULL THEN 1 ELSE 0 END,
        li.expiry_date ASC NULLS LAST,
        v.plate_number ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const result = await pool.query<VehicleInsuranceSummary & { total_count: number }>(
      query,
      [...queryParams, limit, offset],
    );

    const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
    return { vehicles: result.rows, total, page, limit };
  },
};
