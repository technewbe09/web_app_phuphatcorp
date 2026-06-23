import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

export interface InspectionRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  inspection_date: string;
  expiry_date: string;
  notes: string | null;
  status: 'active' | 'expired' | 'superseded' | 'deleted';
  images?: InspectionImage[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionImage {
  id: number;
  inspection_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface InspectionListResult {
  inspections: InspectionRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInspectionInput {
  vehicle_id: number;
  inspection_date: string;
  expiry_date: string;
  notes?: string;
}

export interface UpdateInspectionInput {
  inspection_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface VehicleInspectionSummary {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  latest_inspection_id: number | null;
  latest_inspection_date: string | null;
  latest_expiry_date: string | null;
  latest_status: string | null;
  inspection_count: number;
}

const SELECT_COLS = `
  ir.id, ir.vehicle_id, ir.inspection_date, ir.expiry_date,
  ir.notes, ir.status, ir.created_by, ir.created_at, ir.updated_at,
  v.plate_number, v.driver_name
`;

const IMAGE_SELECT_COLS = `
  id, inspection_id, filename, original_filename, file_path, file_size, mime_type, created_at
`;

function ensureUploadDir(): string {
  const dir = path.resolve('uploads/inspection-images');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export const inspectionService = {
  async listAll(params: {
    vehicle_id?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InspectionListResult> {
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
      `SELECT COUNT(*) as count FROM inspection_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       ${whereClause}`,
      queryParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query<InspectionRecord>(
      `SELECT ${SELECT_COLS} FROM inspection_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       ${whereClause}
       ORDER BY ir.expiry_date ASC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...queryParams, limit, offset],
    );

    return { inspections: dataResult.rows, total, page, limit };
  },

  async getById(id: number): Promise<InspectionRecord | null> {
    const result = await pool.query<InspectionRecord>(
      `SELECT ${SELECT_COLS} FROM inspection_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       WHERE ir.id = $1`,
      [id],
    );
    if (!result.rows[0]) return null;

    const images = await pool.query<InspectionImage>(
      `SELECT ${IMAGE_SELECT_COLS} FROM inspection_images WHERE inspection_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return { ...result.rows[0], images: images.rows };
  },

  async create(input: CreateInspectionInput, userId: number): Promise<InspectionRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const activeResult = await client.query<{ id: number }>(
        `SELECT id FROM inspection_records
         WHERE vehicle_id = $1 AND status = 'active'
         ORDER BY expiry_date DESC LIMIT 1`,
        [input.vehicle_id],
      );
      if (activeResult.rows.length > 0) {
        await client.query(
          `UPDATE inspection_records SET status = 'superseded' WHERE id = $1`,
          [activeResult.rows[0].id],
        );
      }

      const insertResult = await client.query<InspectionRecord>(
        `INSERT INTO inspection_records (vehicle_id, inspection_date, expiry_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, vehicle_id, inspection_date, expiry_date, notes, status, created_by, created_at, updated_at`,
        [input.vehicle_id, input.inspection_date, input.expiry_date, input.notes || null, userId],
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

  async update(id: number, input: UpdateInspectionInput): Promise<InspectionRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (input.inspection_date !== undefined) {
      fields.push(`inspection_date = $${paramIdx++}`);
      params.push(input.inspection_date);
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
      `UPDATE inspection_records SET ${fields.join(', ')} WHERE id = $${paramIdx}`,
      params,
    );

    const updated = await this.getById(id);
    return updated!;
  },

  async softDelete(id: number): Promise<void> {
    const result = await pool.query(
      `UPDATE inspection_records SET status = 'deleted' WHERE id = $1 AND status != 'deleted' RETURNING id`,
      [id],
    );
    if (result.rowCount === 0) {
      throw { code: 'NOT_FOUND' };
    }
  },

  async getExpiring(days: number = 30): Promise<InspectionRecord[]> {
    const result = await pool.query<InspectionRecord>(
      `SELECT ${SELECT_COLS} FROM inspection_records ir
       LEFT JOIN vehicles v ON ir.vehicle_id = v.id
       WHERE ir.status = 'active'
         AND ir.expiry_date <= CURRENT_DATE + $1::INTEGER
         AND ir.expiry_date >= CURRENT_DATE
       ORDER BY ir.expiry_date ASC`,
      [days],
    );
    return result.rows;
  },

  async addImage(inspectionId: number, file: Express.Multer.File): Promise<InspectionImage> {
    const exists = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM inspection_records WHERE id = $1) AS exists`,
      [inspectionId],
    );
    if (!exists.rows[0].exists) {
      throw { code: 'NOT_FOUND' };
    }

    const result = await pool.query<InspectionImage>(
      `INSERT INTO inspection_images (inspection_id, filename, original_filename, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${IMAGE_SELECT_COLS}`,
      [inspectionId, file.filename, file.originalname, file.path, file.size, file.mimetype],
    );
    return result.rows[0];
  },

  async deleteImage(imageId: number): Promise<void> {
    const result = await pool.query<InspectionImage>(
      `SELECT file_path FROM inspection_images WHERE id = $1`,
      [imageId],
    );
    if (!result.rows[0]) {
      throw { code: 'NOT_FOUND' };
    }

    const filePath = result.rows[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query(`DELETE FROM inspection_images WHERE id = $1`, [imageId]);
  },

  async getImages(inspectionId: number): Promise<InspectionImage[]> {
    const result = await pool.query<InspectionImage>(
      `SELECT ${IMAGE_SELECT_COLS} FROM inspection_images WHERE inspection_id = $1 ORDER BY created_at ASC`,
      [inspectionId],
    );
    return result.rows;
  },

  async getVehicleSummary(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ vehicles: VehicleInspectionSummary[]; total: number; page: number; limit: number }> {
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
      } else if (params.status === 'no_inspection') {
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
      WITH latest_inspection AS (
        SELECT DISTINCT ON (vehicle_id)
          id, vehicle_id, inspection_date, expiry_date, status
        FROM inspection_records
        WHERE status IN ('active', 'expired')
        ORDER BY vehicle_id, expiry_date DESC
      ),
      inspection_counts AS (
        SELECT vehicle_id, COUNT(*) AS cnt
        FROM inspection_records
        WHERE status != 'deleted'
        GROUP BY vehicle_id
      )
      SELECT
        v.id AS vehicle_id,
        v.plate_number,
        v.driver_name,
        li.id AS latest_inspection_id,
        li.inspection_date AS latest_inspection_date,
        li.expiry_date AS latest_expiry_date,
        li.status AS latest_status,
        COALESCE(ic.cnt, 0)::int AS inspection_count,
        COUNT(*) OVER()::int AS total_count
      FROM vehicles v
      LEFT JOIN latest_inspection li ON li.vehicle_id = v.id
      LEFT JOIN inspection_counts ic ON ic.vehicle_id = v.id
      WHERE v.status = 'active'
        ${whereLatest}
        ${searchWhere}
      ORDER BY
        CASE WHEN li.id IS NULL THEN 1 ELSE 0 END,
        li.expiry_date ASC NULLS LAST,
        v.plate_number ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const result = await pool.query<VehicleInspectionSummary & { total_count: number }>(
      query,
      [...queryParams, limit, offset],
    );

    const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
    return { vehicles: result.rows, total, page, limit };
  },
};
