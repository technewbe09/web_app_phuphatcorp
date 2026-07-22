import { pool } from '../config/database';
import { storageService } from './storageService';

export interface RepairItem {
  id: number;
  repair_id: number;
  item_name: string;
  parts_cost: number;
  labor_cost: number;
  created_at: string;
}

export interface RepairImage {
  id: number;
  repair_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface RepairRecord {
  id: number;
  vehicle_id: number;
  plate_number?: string;
  driver_name?: string;
  repair_date: string;
  garage_name: string;
  total_amount: number;
  notes: string | null;
  status: 'active' | 'deleted';
  items?: RepairItem[];
  images?: RepairImage[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleRepairSummary {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  latest_repair_id: number | null;
  latest_repair_date: string | null;
  latest_garage_name: string | null;
  repair_count: number;
  total_repair_amount: string;
}

export interface CreateRepairInput {
  vehicle_id: number;
  repair_date: string;
  garage_name: string;
  notes?: string;
  items: {
    item_name: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

export interface UpdateRepairInput {
  repair_date?: string;
  garage_name?: string;
  notes?: string;
  items?: {
    item_name: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

export interface UploadBillInput {
  plate_number: string;
  repair_date: string;
  garage_name: string;
  notes?: string;
  items: {
    item_name: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

export interface UploadError {
  row: number;
  plate_number: string;
  reason: string;
}

const RECORD_SELECT = `
  rr.id, rr.vehicle_id, rr.repair_date, rr.garage_name,
  rr.total_amount, rr.notes, rr.status, rr.created_by,
  rr.created_at, rr.updated_at,
  v.plate_number, v.driver_name
`;

const ITEM_SELECT = `
  id, repair_id, item_name, parts_cost, labor_cost, created_at
`;

function calcTotal(items: { parts_cost: number; labor_cost: number }[]): number {
  return items.reduce((sum, item) => sum + (item.parts_cost || 0) + (item.labor_cost || 0), 0);
}

export const repairService = {
  async getSummary(params: {
    search?: string;
    vehicle_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{ vehicles: VehicleRepairSummary[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const conditions: string[] = [`v.status = 'active'`, `v.vehicle_type = 'Xe nhà'`];
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    if (params.vehicle_id) {
      conditions.push(`v.id = $${paramIdx}`);
      queryParams.push(params.vehicle_id);
      paramIdx++;
    }

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(`(v.plate_number ILIKE $${paramIdx} OR v.driver_name ILIKE $${paramIdx})`);
      queryParams.push(q);
      paramIdx++;
    }

    const searchWhere = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      WITH latest_repair AS (
        SELECT DISTINCT ON (vehicle_id)
          id, vehicle_id, repair_date, garage_name
        FROM repair_records
        WHERE status = 'active'
        ORDER BY vehicle_id, repair_date DESC
      ),
      repair_stats AS (
        SELECT
          vehicle_id,
          COUNT(*)::int AS cnt,
          COALESCE(SUM(total_amount), 0)::text AS total_amt
        FROM repair_records
        WHERE status = 'active'
        GROUP BY vehicle_id
      )
      SELECT
        v.id AS vehicle_id,
        v.plate_number,
        v.driver_name,
        lr.id AS latest_repair_id,
        lr.repair_date AS latest_repair_date,
        lr.garage_name AS latest_garage_name,
        COALESCE(rs.cnt, 0) AS repair_count,
        COALESCE(rs.total_amt, '0') AS total_repair_amount,
        COUNT(*) OVER()::int AS total_count
      FROM vehicles v
      LEFT JOIN latest_repair lr ON lr.vehicle_id = v.id
      LEFT JOIN repair_stats rs ON rs.vehicle_id = v.id
      ${searchWhere}
      ORDER BY
        CASE WHEN lr.id IS NULL THEN 1 ELSE 0 END,
        lr.repair_date DESC NULLS LAST,
        v.plate_number ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const result = await pool.query<VehicleRepairSummary & { total_count: number }>(
      query,
      [...queryParams, limit, offset],
    );

    const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
    return { vehicles: result.rows, total, page, limit };
  },

  async listByVehicle(vehicleId: number, params: {
    page?: number;
    limit?: number;
  }): Promise<{ repairs: RepairRecord[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query<RepairRecord & { total_count: number; item_count: number; grand_total: string }>(
      `SELECT ${RECORD_SELECT},
         COUNT(*) OVER()::int AS total_count,
         (SELECT COUNT(*)::int FROM repair_items WHERE repair_id = rr.id) AS item_count,
         (SELECT COALESCE(SUM(total_amount), 0)::text FROM repair_records WHERE vehicle_id = $1 AND status = 'active') AS grand_total
       FROM repair_records rr
       LEFT JOIN vehicles v ON rr.vehicle_id = v.id
       WHERE rr.vehicle_id = $1 AND rr.status = 'active'
       ORDER BY rr.repair_date DESC
       LIMIT $2 OFFSET $3`,
      [vehicleId, limit, offset],
    );

    const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
    return { repairs: result.rows, total, page, limit };
  },

  async getById(id: number): Promise<RepairRecord | null> {
    const [recordRes, itemsRes, imagesRes] = await Promise.all([
      pool.query<RepairRecord>(
        `SELECT ${RECORD_SELECT} FROM repair_records rr
         LEFT JOIN vehicles v ON rr.vehicle_id = v.id
         WHERE rr.id = $1 AND rr.status = 'active'`,
        [id],
      ),
      pool.query<RepairItem>(
        `SELECT ${ITEM_SELECT} FROM repair_items WHERE repair_id = $1 ORDER BY id ASC`,
        [id],
      ),
      pool.query<RepairImage>(
        `SELECT id, repair_id, filename, original_filename, file_path, file_size, mime_type, created_at
         FROM repair_images WHERE repair_id = $1 ORDER BY created_at ASC`,
        [id],
      ),
    ]);

    if (!recordRes.rows[0]) return null;
    return { ...recordRes.rows[0], items: itemsRes.rows, images: imagesRes.rows };
  },

  async create(input: CreateRepairInput, userId: number): Promise<RepairRecord> {
    const vehicleCheck = await pool.query<{ vehicle_type: string }>(
      `SELECT vehicle_type FROM vehicles WHERE id = $1 AND status = 'active'`,
      [input.vehicle_id],
    );
    if (!vehicleCheck.rows[0]) {
      throw { code: 'NOT_FOUND' };
    }
    if (vehicleCheck.rows[0].vehicle_type !== 'Xe nhà') {
      throw { code: 'INVALID_VEHICLE_TYPE', message: 'Chỉ được tạo bill cho xe loại Xe nhà' };
    }

    const totalAmount = calcTotal(input.items);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const recordResult = await client.query<RepairRecord>(
        `INSERT INTO repair_records (vehicle_id, repair_date, garage_name, total_amount, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, vehicle_id, repair_date, garage_name, total_amount, notes, status, created_by, created_at, updated_at`,
        [input.vehicle_id, input.repair_date, input.garage_name, totalAmount, input.notes || null, userId],
      );

      const record = recordResult.rows[0];

      if (input.items.length > 0) {
        const values: unknown[] = [record.id];
        const placeholders = input.items.map((item, i) => {
          const base = i * 3 + 2;
          values.push(item.item_name, item.parts_cost || 0, item.labor_cost || 0);
          return `($1, $${base}, $${base + 1}, $${base + 2})`;
        });
        await client.query(
          `INSERT INTO repair_items (repair_id, item_name, parts_cost, labor_cost) VALUES ${placeholders.join(', ')}`,
          values,
        );
      }

      await client.query('COMMIT');

      const items = await pool.query<RepairItem>(
        `SELECT ${ITEM_SELECT} FROM repair_items WHERE repair_id = $1 ORDER BY id ASC`,
        [record.id],
      );

      const vehicle = await pool.query<{ plate_number: string; driver_name: string }>(
        `SELECT plate_number, driver_name FROM vehicles WHERE id = $1`,
        [record.vehicle_id],
      );

      return {
        ...record,
        plate_number: vehicle.rows[0]?.plate_number,
        driver_name: vehicle.rows[0]?.driver_name,
        items: items.rows,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: number, input: UpdateRepairInput): Promise<RepairRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      const repairDate = input.repair_date ?? existing.repair_date;
      const garageName = input.garage_name ?? existing.garage_name;
      const notes = input.notes !== undefined ? input.notes : existing.notes;

      fields.push(`repair_date = $${paramIdx++}`);
      params.push(repairDate);
      fields.push(`garage_name = $${paramIdx++}`);
      params.push(garageName);
      fields.push(`notes = $${paramIdx++}`);
      params.push(notes);

      if (input.items !== undefined) {
        const totalAmount = calcTotal(input.items);
        fields.push(`total_amount = $${paramIdx++}`);
        params.push(totalAmount);

        await client.query(
          `DELETE FROM repair_items WHERE repair_id = $1`,
          [id],
        );

        if (input.items.length > 0) {
          const values: unknown[] = [id];
          const placeholders = input.items.map((item, i) => {
            const base = i * 3 + 2;
            values.push(item.item_name, item.parts_cost || 0, item.labor_cost || 0);
            return `($1, $${base}, $${base + 1}, $${base + 2})`;
          });
          await client.query(
            `INSERT INTO repair_items (repair_id, item_name, parts_cost, labor_cost) VALUES ${placeholders.join(', ')}`,
            values,
          );
        }
      }

      params.push(id);
      await client.query(
        `UPDATE repair_records SET ${fields.join(', ')} WHERE id = $${paramIdx}`,
        params,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return (await this.getById(id))!;
  },

  async softDelete(id: number): Promise<void> {
    const result = await pool.query(
      `UPDATE repair_records SET status = 'deleted' WHERE id = $1 AND status = 'active' RETURNING id`,
      [id],
    );
    if (result.rowCount === 0) {
      throw { code: 'NOT_FOUND' };
    }
  },

  async addImage(repairId: number, file: Express.Multer.File): Promise<RepairImage> {
    const uploadResult = await storageService.upload(file.buffer, file.originalname, file.mimetype);

    const result = await pool.query<RepairImage>(
      `INSERT INTO repair_images (repair_id, filename, original_filename, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, repair_id, filename, original_filename, file_path, file_size, mime_type, created_at`,
      [repairId, uploadResult.filename, file.originalname, uploadResult.objectKey, file.size, file.mimetype],
    );
    return result.rows[0];
  },

  async deleteImage(imageId: number): Promise<void> {
    const result = await pool.query<RepairImage>(
      `SELECT filename FROM repair_images WHERE id = $1`,
      [imageId],
    );
    if (!result.rows[0]) {
      throw { code: 'NOT_FOUND' };
    }

    await storageService.delete(result.rows[0].filename);
    await pool.query(`DELETE FROM repair_images WHERE id = $1`, [imageId]);
  },

  async uploadMany(bills: UploadBillInput[], userId: number): Promise<{ inserted: number }> {
    const errors: UploadError[] = [];

    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      if (!bill.plate_number) {
        errors.push({ row: i + 1, plate_number: '', reason: 'Thiếu biển số' });
        continue;
      }
      if (!bill.repair_date) {
        errors.push({ row: i + 1, plate_number: bill.plate_number, reason: 'Thiếu ngày sửa' });
        continue;
      }
      if (!bill.garage_name) {
        errors.push({ row: i + 1, plate_number: bill.plate_number, reason: 'Thiếu tên gara' });
        continue;
      }
      if (!bill.items || bill.items.length === 0) {
        errors.push({ row: i + 1, plate_number: bill.plate_number, reason: 'Không có hạng mục nào' });
        continue;
      }
      for (let j = 0; j < bill.items.length; j++) {
        const item = bill.items[j];
        if (!item.item_name) {
          errors.push({ row: i + 1, plate_number: bill.plate_number, reason: `Hạng mục ${j + 1}: thiếu tên` });
        }
        if (item.parts_cost < 0) {
          errors.push({ row: i + 1, plate_number: bill.plate_number, reason: `Hạng mục ${j + 1}: tiền phụ tùng < 0` });
        }
        if (item.labor_cost < 0) {
          errors.push({ row: i + 1, plate_number: bill.plate_number, reason: `Hạng mục ${j + 1}: tiền công < 0` });
        }
      }
    }

    if (errors.length > 0) {
      throw { code: 'UPLOAD_ERRORS', errors };
    }

    const vehicleMap = new Map<string, number>();
    const vehicleResult = await pool.query<{ id: number; plate_number: string }>(
      `SELECT id, plate_number FROM vehicles WHERE status = 'active' AND vehicle_type = 'Xe nhà'`,
    );
    for (const v of vehicleResult.rows) {
      vehicleMap.set(v.plate_number, v.id);
    }

    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      if (!vehicleMap.has(bill.plate_number)) {
        errors.push({ row: i + 1, plate_number: bill.plate_number, reason: 'Không tìm thấy xe' });
      }
    }

    if (errors.length > 0) {
      throw { code: 'UPLOAD_ERRORS', errors };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const bill of bills) {
        const vehicleId = vehicleMap.get(bill.plate_number)!;
        const totalAmount = calcTotal(bill.items);

        const recordResult = await client.query<{ id: number }>(
          `INSERT INTO repair_records (vehicle_id, repair_date, garage_name, total_amount, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [vehicleId, bill.repair_date, bill.garage_name, totalAmount, bill.notes || null, userId],
        );

        const repairId = recordResult.rows[0].id;

        if (bill.items.length > 0) {
          const values: unknown[] = [repairId];
          const placeholders = bill.items.map((item, idx) => {
            const base = idx * 3 + 2;
            values.push(item.item_name, item.parts_cost || 0, item.labor_cost || 0);
            return `($1, $${base}, $${base + 1}, $${base + 2})`;
          });
          await client.query(
            `INSERT INTO repair_items (repair_id, item_name, parts_cost, labor_cost) VALUES ${placeholders.join(', ')}`,
            values,
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { inserted: bills.length };
  },
};
