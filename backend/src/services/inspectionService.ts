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

      const activeResult = await client.query<InspectionRecord>(
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

      const insertResult = await client.query<{ id: number }>(
        `INSERT INTO inspection_records (vehicle_id, inspection_date, expiry_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [input.vehicle_id, input.inspection_date, input.expiry_date, input.notes || null, userId],
      );

      await client.query('COMMIT');

      const newId = insertResult.rows[0].id;
      const record = await this.getById(newId);
      return record!;
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
    const existing = await this.getById(id);
    if (!existing || existing.status === 'deleted') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE inspection_records SET status = 'deleted' WHERE id = $1`,
      [id],
    );
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
    const inspection = await this.getById(inspectionId);
    if (!inspection) {
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
};
