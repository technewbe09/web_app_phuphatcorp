import { pool } from '../config/database';
import type { PoolClient } from 'pg';

function normalizeSoXe(raw: string): string {
  return raw.replace(/^[^\d]*/, '').replace(/[-,\s]/g, '').replace(/\/.*$/, '');
}

export interface DriverInvoice {
  id: number;
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string | null;
  so_hoa_don: string[];
  original_filename: string | null;
  uploaded_by: number | null;
  uploaded_at: string;
  reconciled_count?: number;
}

export interface DriverInvoiceRow {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string | null;
  so_hoa_don: string[];
}

export interface DriverInvoiceFilters {
  page?: number;
  limit?: number;
  ma?: string;
  ten_tx?: string;
  ngay_from?: string;
  ngay_to?: string;
  so_xe?: string;
  noi_giao?: string;
  so_hoa_don?: string;
  ghi_chu?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DuplicateInfo {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  ghi_chu: string | null;
}

export interface UploadResult {
  inserted: number;
  duplicates: DuplicateInfo[];
}

const SELECT_COLS = `
  id, ma, ten_tx, ngay::text, so_xe, noi_giao,
  ghi_chu, so_hoa_don, original_filename,
  uploaded_by, uploaded_at
`;

function rowToInvoice(row: Record<string, unknown>): DriverInvoice {
  return {
    id: row.id as number,
    ma: row.ma as string,
    ten_tx: row.ten_tx as string,
    ngay: row.ngay as string,
    so_xe: row.so_xe as string,
    noi_giao: row.noi_giao as string,
    ghi_chu: row.ghi_chu as string | null,
    so_hoa_don: row.so_hoa_don as string[],
    original_filename: row.original_filename as string | null,
    uploaded_by: row.uploaded_by as number | null,
    uploaded_at: row.uploaded_at instanceof Date
      ? (row.uploaded_at as Date).toISOString()
      : row.uploaded_at as string,
  };
}

export const driverInvoiceService = {

  async reconcileAccountantInvoices(
    client: PoolClient,
    soXe: string,
    ngay: string,
    soHoaDonList: string[],
  ): Promise<number> {
    const normalizedSoXe = normalizeSoXe(soXe);
    let totalUpdated = 0;

    for (const soHd of soHoaDonList) {
      const stripped = soHd.replace(/^0+/, '');
      if (!stripped) continue;

      const result = await client.query(
        `UPDATE accountant_invoices
         SET trang_thai = 'đã có'
         WHERE ngay = $1::date
           AND so_xe = $2
           AND trang_thai = 'không có'
           AND (
              regexp_replace(so_hoa_don, '^0+', '') = $3
              OR regexp_replace(so_hoa_don, '^0+', '') LIKE $3 || '%'
              OR $3 LIKE regexp_replace(so_hoa_don, '^0+', '') || '%'
              OR regexp_replace(so_hoa_don, '^0+', '') LIKE '%' || $3 || '%'
            )
         RETURNING id`,
        [ngay, normalizedSoXe, stripped],
      );
      totalUpdated += result.rows.length;
    }

    return totalUpdated;
  },

  async create(
    data: DriverInvoiceRow,
    userId: number,
  ): Promise<DriverInvoice & { reconciled_count: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reconciledCount = await this.reconcileAccountantInvoices(
        client,
        data.so_xe,
        data.ngay,
        data.so_hoa_don,
      );

      const result = await client.query(
        `INSERT INTO driver_invoices
           (ma, ten_tx, ngay, so_xe, noi_giao, ghi_chu, so_hoa_don, original_filename, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${SELECT_COLS}`,
        [
          data.ma,
          data.ten_tx,
          data.ngay,
          data.so_xe,
          data.noi_giao,
          data.ghi_chu,
          JSON.stringify(data.so_hoa_don),
          null,
          userId,
        ],
      );

      await client.query('COMMIT');

      const invoice = rowToInvoice(result.rows[0]);
      return { ...invoice, reconciled_count: reconciledCount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  async list(filters: DriverInvoiceFilters = {}): Promise<PaginatedResult<DriverInvoice>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.ma) {
      conditions.push(`ma ILIKE $${paramIndex++}`);
      params.push(`%${filters.ma}%`);
    }
    if (filters.ten_tx) {
      conditions.push(`ten_tx ILIKE $${paramIndex++}`);
      params.push(`%${filters.ten_tx}%`);
    }
    if (filters.ngay_from) {
      conditions.push(`ngay >= $${paramIndex++}`);
      params.push(filters.ngay_from);
    }
    if (filters.ngay_to) {
      conditions.push(`ngay <= $${paramIndex++}`);
      params.push(filters.ngay_to);
    }
    if (filters.so_xe) {
      conditions.push(`so_xe ILIKE $${paramIndex++}`);
      params.push(`%${filters.so_xe}%`);
    }
    if (filters.noi_giao) {
      conditions.push(`noi_giao ILIKE $${paramIndex++}`);
      params.push(`%${filters.noi_giao}%`);
    }
    if (filters.so_hoa_don) {
      conditions.push(`EXISTS (SELECT 1 FROM jsonb_array_elements_text(so_hoa_don) elem WHERE elem LIKE $${paramIndex++})`);
      params.push(`%${filters.so_hoa_don}%`);
    }
    if (filters.ghi_chu) {
      conditions.push(`ghi_chu ILIKE $${paramIndex++}`);
      params.push(`%${filters.ghi_chu}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM driver_invoices ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const dataResult = await pool.query(
      `SELECT ${SELECT_COLS}
       FROM driver_invoices
       ${whereClause}
       ORDER BY ngay DESC, ma ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset],
    );

    return {
      data: dataResult.rows.map(rowToInvoice),
      pagination: { page, limit, total, totalPages },
    };
  },

  async findById(id: number): Promise<DriverInvoice | null> {
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM driver_invoices WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? rowToInvoice(result.rows[0]) : null;
  },

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedSoXe = normalizeSoXe(existing.so_xe);
      for (const soHd of existing.so_hoa_don) {
        const stripped = soHd.replace(/^0+/, '');
        if (!stripped) continue;

        await client.query(
          `UPDATE accountant_invoices
           SET trang_thai = 'không có'
           WHERE ngay = $1::date
             AND so_xe = $2
             AND trang_thai = 'đã có'
             AND (
               regexp_replace(so_hoa_don, '^0+', '') = $3
               OR regexp_replace(so_hoa_don, '^0+', '') LIKE $3 || '%'
               OR $3 LIKE regexp_replace(so_hoa_don, '^0+', '') || '%'
               OR regexp_replace(so_hoa_don, '^0+', '') LIKE '%' || $3 || '%'
             )`,
          [existing.ngay, normalizedSoXe, stripped],
        );
      }

      await client.query('DELETE FROM driver_invoices WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: number, data: DriverInvoiceRow): Promise<DriverInvoice & { reconciled_count: number }> {
    const existing = await this.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedSoXe = normalizeSoXe(data.so_xe);

      await client.query(
        `UPDATE accountant_invoices
         SET trang_thai = 'không có'
         WHERE ngay = $1::date
           AND so_xe = $2
           AND trang_thai = 'đã có'`,
        [data.ngay, normalizedSoXe],
      );

      const reconciledCount = await this.reconcileAccountantInvoices(
        client,
        data.so_xe,
        data.ngay,
        data.so_hoa_don,
      );

      const result = await client.query(
        `UPDATE driver_invoices
         SET ma = $1, ten_tx = $2, ngay = $3, so_xe = $4, noi_giao = $5,
             ghi_chu = $6, so_hoa_don = $7
         WHERE id = $8
         RETURNING ${SELECT_COLS}`,
        [
          data.ma,
          data.ten_tx,
          data.ngay,
          data.so_xe,
          data.noi_giao,
          data.ghi_chu,
          JSON.stringify(data.so_hoa_don),
          id,
        ],
      );

      await client.query('COMMIT');

      const invoice = rowToInvoice(result.rows[0]);
      return { ...invoice, reconciled_count: reconciledCount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async checkDuplicates(rows: DriverInvoiceRow[]): Promise<DuplicateInfo[]> {
    if (rows.length === 0) return [];

    const maArray: string[] = [];
    const ngayArray: string[] = [];
    const soXeArray: string[] = [];
    const gocArray: (string | null)[] = [];

    for (const row of rows) {
      maArray.push(row.ma);
      ngayArray.push(row.ngay);
      soXeArray.push(row.so_xe);
      gocArray.push(row.ghi_chu);
    }

    const result = await pool.query<{ ma: string; ten_tx: string; ngay: string; so_xe: string; ghi_chu: string | null }>(
      `SELECT di.ma, di.ten_tx, di.ngay::text, di.so_xe, di.ghi_chu
       FROM driver_invoices di
       JOIN unnest($1::varchar[], $2::date[], $3::varchar[], $4::text[])
         AS t(ma, ngay, so_xe, ghi_chu)
         ON di.ma = t.ma AND di.ngay = t.ngay AND di.so_xe = t.so_xe
            AND di.ghi_chu IS NOT DISTINCT FROM t.ghi_chu`,
      [maArray, ngayArray, soXeArray, gocArray],
    );

    return result.rows.map((r) => ({
      ma: r.ma,
      ten_tx: r.ten_tx,
      ngay: r.ngay,
      so_xe: r.so_xe,
      ghi_chu: r.ghi_chu,
    }));
  },

  async uploadMany(
    rows: DriverInvoiceRow[],
    originalFilename: string,
    userId: number,
    skipDuplicates: boolean,
  ): Promise<UploadResult> {
    const duplicates = await this.checkDuplicates(rows);

    if (duplicates.length > 0 && !skipDuplicates) {
      return { inserted: 0, duplicates };
    }

    const duplicateSet = new Set(
      duplicates.map((d) => `${d.ma}|${d.ngay}|${d.so_xe}|${d.ghi_chu}`),
    );

    const rowsToInsert = rows.filter(
      (r) => !duplicateSet.has(`${r.ma}|${r.ngay}|${r.so_xe}|${r.ghi_chu}`),
    );

    const uniqueRows = new Map<string, DriverInvoiceRow>();
    for (const r of rowsToInsert) {
      uniqueRows.set(`${r.ma}|${r.ngay}|${r.so_xe}|${r.ghi_chu}`, r);
    }
    const dedupedRows = Array.from(uniqueRows.values());

    if (dedupedRows.length === 0) {
      return { inserted: 0, duplicates };
    }

    const maArray: string[] = [];
    const tenTxArray: string[] = [];
    const ngayArray: string[] = [];
    const soXeArray: string[] = [];
    const noiGiaoArray: string[] = [];
    const gocArray: (string | null)[] = [];
    const hoaDonArray: string[] = [];

    for (const row of dedupedRows) {
      maArray.push(row.ma);
      tenTxArray.push(row.ten_tx);
      ngayArray.push(row.ngay);
      soXeArray.push(row.so_xe);
      noiGiaoArray.push(row.noi_giao);
      gocArray.push(row.ghi_chu);
      hoaDonArray.push(JSON.stringify(row.so_hoa_don));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO driver_invoices
           (ma, ten_tx, ngay, so_xe, noi_giao, ghi_chu, so_hoa_don, original_filename, uploaded_by)
         SELECT * FROM unnest(
           $1::varchar[], $2::varchar[], $3::date[], $4::varchar[], $5::varchar[],
           $6::text[], $7::jsonb[], $8::varchar[], $9::int[]
         )`,
        [
          maArray, tenTxArray, ngayArray, soXeArray, noiGiaoArray,
          gocArray, hoaDonArray,
          Array(dedupedRows.length).fill(originalFilename),
          Array(dedupedRows.length).fill(userId),
        ],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { inserted: dedupedRows.length, duplicates };
  },
};
