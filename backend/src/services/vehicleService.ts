import { pool } from '../config/database';
import * as XLSX from 'xlsx';

export interface Vehicle {
  id: number;
  plate_number: string;
  driver_name: string;
  vehicle_type: string;
  status: 'active' | 'deactive';
  oil_change_interval_km: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleListResult {
  vehicles: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadResult {
  imported: number;
  reactivated: number;
}

export interface UploadError {
  row: number;
  driver_name: string;
  plate_number: string;
  reason: string;
}

export interface VehicleData {
  driver_name: string;
  plate_number: string;
  vehicle_type?: string;
}

const SELECT_COLS = `
  id, plate_number, driver_name, vehicle_type, status, oil_change_interval_km, created_at, updated_at
`;

function normalizePlateNumber(raw: string): string | null {
  const cleaned = raw
    .replace(/^[^\d]*/, '')
    .replace(/[-,\s.]/g, '')
    .replace(/\/.*$/, '')
    .toUpperCase();

  if (!/^\d{2}[A-Z]\d{4,}$/.test(cleaned)) return null;

  return cleaned;
}

export const vehicleService = {
  async getAll(
    search?: string,
    status?: string,
    vehicle_type?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<VehicleListResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let whereClause = '';
    const conditions: string[] = [];

    if (status === 'active') {
      conditions.push("status = 'active'");
    } else if (status === 'inactive') {
      conditions.push("status = 'deactive'");
    } else if (status === 'all') {
      // no status filter
    } else {
      conditions.push("status = 'active'");
    }

    if (vehicle_type === 'Xe nhà' || vehicle_type === 'Xe ngoài') {
      conditions.push(`vehicle_type = '${vehicle_type}'`);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    let countWhereClause = whereClause;

    if (search) {
      const q = `%${search}%`;
      params.push(q, q);
      const and = countWhereClause ? ' AND ' : 'WHERE ';
      whereClause += `${and}(plate_number ILIKE $${params.length - 1} OR driver_name ILIKE $${params.length})`;
      countWhereClause += `${and}(plate_number ILIKE $1 OR driver_name ILIKE $2)`;
    }

    const countParams: unknown[] = [];
    if (search) {
      const q = `%${search}%`;
      countParams.push(q, q);
    }
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM vehicles ${countWhereClause}`,
      countParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query<Vehicle>(
      `SELECT ${SELECT_COLS} FROM vehicles ${whereClause}
       ORDER BY plate_number ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { vehicles: dataResult.rows, total, page, limit };
  },

  async findById(id: number): Promise<Vehicle | null> {
    const result = await pool.query<Vehicle>(
      `SELECT ${SELECT_COLS} FROM vehicles WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
    const result = await pool.query<Vehicle>(
      `SELECT ${SELECT_COLS} FROM vehicles WHERE plate_number = $1 AND status = 'active'`,
      [plateNumber],
    );
    return result.rows[0] || null;
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE vehicles SET status = 'deactive' WHERE id = $1`,
      [id],
    );
  },

  async create(data: VehicleData): Promise<Vehicle> {
    const normalized = normalizePlateNumber(data.plate_number);
    if (!normalized) {
      throw { code: 'INVALID_PLATE', message: `Biển số không đúng định dạng: ${data.plate_number}` };
    }

    const existingActive = await this.findByPlateNumber(normalized);
    if (existingActive) {
      throw { code: 'DUPLICATE_PLATE', message: `Biển số đã tồn tại: ${normalized}` };
    }

    const deactivated = await pool.query<Vehicle>(
      `SELECT id FROM vehicles WHERE plate_number = $1 AND status = 'deactive'`,
      [normalized],
    );

    const vehicle_type = data.vehicle_type || 'Xe nhà';

    if (deactivated.rows.length > 0) {
      const result = await pool.query<Vehicle>(
        `UPDATE vehicles SET status = 'active', driver_name = $1, vehicle_type = $2 WHERE id = $3 RETURNING ${SELECT_COLS}`,
        [data.driver_name, vehicle_type, deactivated.rows[0].id],
      );
      return result.rows[0];
    }

    const result = await pool.query<Vehicle>(
      `INSERT INTO vehicles (plate_number, driver_name, vehicle_type) VALUES ($1, $2, $3) RETURNING ${SELECT_COLS}`,
      [normalized, data.driver_name, vehicle_type],
    );
    return result.rows[0];
  },

  async toggleStatus(id: number): Promise<Vehicle> {
    const existing = await this.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const newStatus = existing.status === 'active' ? 'deactive' : 'active';
    const result = await pool.query<Vehicle>(
      `UPDATE vehicles SET status = $1 WHERE id = $2 RETURNING ${SELECT_COLS}`,
      [newStatus, id],
    );
    return result.rows[0];
  },

  async updateOilInterval(id: number, intervalKm: number): Promise<Vehicle> {
    const existing = await this.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const result = await pool.query<Vehicle>(
      `UPDATE vehicles SET oil_change_interval_km = $1 WHERE id = $2 RETURNING ${SELECT_COLS}`,
      [intervalKm, id],
    );
    return result.rows[0];
  },

  async update(id: number, data: { driver_name: string; vehicle_type?: string }): Promise<Vehicle> {
    const existing = await this.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const vehicle_type = data.vehicle_type || existing.vehicle_type;
    const result = await pool.query<Vehicle>(
      `UPDATE vehicles SET driver_name = $1, vehicle_type = $2 WHERE id = $3 RETURNING ${SELECT_COLS}`,
      [data.driver_name, vehicle_type, id],
    );
    return result.rows[0];
  },

  async uploadFromExcel(
    fileBuffer: Buffer,
  ): Promise<{ result?: UploadResult; errors?: UploadError[] }> {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = wb.SheetNames.find(
      (s) => s.toLowerCase().trim() === 'xe',
    );

    if (!sheetName) {
      return {
        errors: [{ row: 0, driver_name: '', plate_number: '', reason: "Không tìm thấy sheet 'xe' trong file" }],
      };
    }

    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

    const errors: UploadError[] = [];
    const rowsToInsert: { driver_name: string; plate_number: string }[] = [];
    const seenPlates = new Map<string, number>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i] as unknown[];
      const rowNum = i + 1;

      if (row.length === 0) continue;

      const col0 = String(row[0] ?? '').trim();
      const col1 = String(row[1] ?? '').trim();

      if (!col0 && !col1) continue;

      const normalized0 = col0.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalized1 = col1.toLowerCase().replace(/[^a-z0-9]/g, '');
      if ((col0 === 'MA' && normalized1 === 'soxe') || (normalized0 === 'ma' && col1 === 'SỐ XE')) {
        continue;
      }

      if (!col0 || !col1) continue;

      const normalized = normalizePlateNumber(col1);
      if (!normalized) {
        errors.push({
          row: rowNum,
          driver_name: col0,
          plate_number: col1,
          reason: `Biển số không đúng định dạng sau chuẩn hóa: ${col1}`,
        });
        continue;
      }

      if (seenPlates.has(normalized)) {
        errors.push({
          row: rowNum,
          driver_name: col0,
          plate_number: col1,
          reason: `Biển số trùng với dòng ${seenPlates.get(normalized)}: ${normalized}`,
        });
        continue;
      }
      seenPlates.set(normalized, rowNum);

      const existing = await this.findByPlateNumber(normalized);
      if (existing) {
        errors.push({
          row: rowNum,
          driver_name: col0,
          plate_number: col1,
          reason: `Biển số đã tồn tại: ${normalized}`,
        });
        continue;
      }

      rowsToInsert.push({ driver_name: col0, plate_number: normalized });
    }

    if (rowsToInsert.length === 0 && errors.length === 0) {
      return { errors: [{ row: 0, driver_name: '', plate_number: '', reason: 'Không có dữ liệu hợp lệ trong sheet xe' }] };
    }

    if (errors.length > 0) {
      return { errors };
    }

    let imported = 0;
    let reactivated = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rowsToInsert) {
        const deactivated = await client.query<Vehicle>(
          `SELECT id FROM vehicles WHERE plate_number = $1 AND status = 'deactive'`,
          [row.plate_number],
        );

        if (deactivated.rows.length > 0) {
          await client.query(
            `UPDATE vehicles SET status = 'active', driver_name = $1, vehicle_type = 'Xe nhà' WHERE id = $2`,
            [row.driver_name, deactivated.rows[0].id],
          );
          reactivated++;
        } else {
          await client.query(
            `INSERT INTO vehicles (plate_number, driver_name, vehicle_type) VALUES ($1, $2, 'Xe nhà')`,
            [row.plate_number, row.driver_name],
          );
          imported++;
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { result: { imported, reactivated } };
  },
};
