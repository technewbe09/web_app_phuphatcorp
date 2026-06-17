import { pool } from '../config/database';

export interface AccountantInvoice {
  id: number;
  batch_id: string;
  ngay: string;
  so_xe: string;
  so_hoa_don: string;
  trang_thai: string;
  created_at: string;
}

export interface AccountantInvoiceFilters {
  page?: number;
  limit?: number;
  batch_id?: string;
  ngay_from?: string;
  ngay_to?: string;
  so_xe?: string;
  so_hoa_don?: string;
  trang_thai?: string;
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

function rowToInvoice(row: Record<string, unknown>): AccountantInvoice {
  return {
    id: row.id as number,
    batch_id: row.batch_id as string,
    ngay: row.ngay as string,
    so_xe: row.so_xe as string,
    so_hoa_don: row.so_hoa_don as string,
    trang_thai: row.trang_thai as string,
    created_at: row.created_at instanceof Date
      ? (row.created_at as Date).toISOString()
      : (row.created_at as string),
  };
}

export interface MissingInvoice {
  so_hoa_don: string;
  ten_kh: string;
}

export interface MissingDateGroup {
  ngay: string;
  invoices: MissingInvoice[];
}

export interface MissingVehicle {
  so_xe: string;
  missing_count: number;
  in_catalog: boolean;
  dates: MissingDateGroup[];
}

export const accountantInvoiceService = {
  async list(filters: AccountantInvoiceFilters = {}): Promise<PaginatedResult<AccountantInvoice>> {
    const page = filters.page || 1;
    const limit = filters.limit || 30;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.batch_id) {
      conditions.push(`batch_id = $${paramIndex++}`);
      params.push(filters.batch_id);
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
    if (filters.so_hoa_don) {
      conditions.push(`so_hoa_don ILIKE $${paramIndex++}`);
      params.push(`%${filters.so_hoa_don}%`);
    }
    if (filters.trang_thai) {
      conditions.push(`trang_thai = $${paramIndex++}`);
      params.push(filters.trang_thai);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM accountant_invoices ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const dataResult = await pool.query(
      `SELECT id, batch_id, ngay::text as ngay, so_xe, so_hoa_don, trang_thai, created_at
       FROM accountant_invoices
       ${whereClause}
       ORDER BY ngay DESC, so_xe ASC, so_hoa_don ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset],
    );

    return {
      data: dataResult.rows.map(rowToInvoice),
      pagination: { page, limit, total, totalPages },
    };
  },

  async getMissingSummary(batchId?: string, inCatalog?: boolean): Promise<MissingVehicle[]> {
    const conditions: string[] = ["ai.trang_thai = 'không có'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (batchId) {
      conditions.push(`ai.batch_id = $${paramIndex++}`);
      params.push(batchId);
    }

    if (inCatalog === true) {
      conditions.push('v.id IS NOT NULL');
    } else if (inCatalog === false) {
      conditions.push('v.id IS NULL');
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query<{
      so_xe: string;
      ngay: string;
      so_hoa_don: string;
      ten_kh: string;
      in_catalog: boolean;
    }>(
      `SELECT ai.so_xe, ai.ngay::text as ngay, ai.so_hoa_don,
              COALESCE(MIN(dd.ten_kh), '') AS ten_kh,
              (v.id IS NOT NULL) AS in_catalog
       FROM accountant_invoices ai
       LEFT JOIN vehicles v ON
         regexp_replace(
           regexp_replace(
              regexp_replace(v.plate_number, '^[^0-9]*', ''),
             '[-,\\s]', '', 'g'
           ),
           '/.*$', ''
         ) = ai.so_xe
         AND v.status = 'active'
       LEFT JOIN delivery_data dd ON
         dd.ngay_hd = ai.ngay
         AND regexp_replace(
               regexp_replace(
                 regexp_replace(dd.so_tau_xe, '^[^0-9]*', ''),
                 '[-,\\s]', '', 'g'
               ),
               '/.*$', ''
             ) = ai.so_xe
         AND trim(dd.so_hd) = ai.so_hoa_don
       WHERE ${whereClause}
       GROUP BY ai.so_xe, ai.ngay, ai.so_hoa_don, v.id
       ORDER BY ai.so_xe ASC, ai.ngay DESC, ai.so_hoa_don ASC`,
      params,
    );

    const vehicleMap = new Map<string, { dates: Map<string, MissingInvoice[]>; in_catalog: boolean }>();

    for (const row of result.rows) {
      let vehicle = vehicleMap.get(row.so_xe);
      if (!vehicle) {
        vehicle = { dates: new Map(), in_catalog: row.in_catalog };
        vehicleMap.set(row.so_xe, vehicle);
      }

      const dateList = vehicle.dates.get(row.ngay);
      if (dateList) {
        dateList.push({ so_hoa_don: row.so_hoa_don, ten_kh: row.ten_kh });
      } else {
        vehicle.dates.set(row.ngay, [{ so_hoa_don: row.so_hoa_don, ten_kh: row.ten_kh }]);
      }
    }

    return Array.from(vehicleMap.entries()).map(([so_xe, v]) => {
      const dates: MissingDateGroup[] = Array.from(v.dates.entries()).map(([ngay, invoices]) => ({
        ngay,
        invoices,
      }));
      const missing_count = dates.reduce((sum, d) => sum + d.invoices.length, 0);
      return { so_xe, missing_count, in_catalog: v.in_catalog, dates };
    });
  },
};
