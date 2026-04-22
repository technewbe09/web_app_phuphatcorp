import { pool } from '../config/database';
import * as XLSX from 'xlsx';
import fs from 'fs';

export interface DeliverySchedule {
  id: number;
  ngay: string;
  stt: number;
  noi_giao: string | null;
  tan: number | null;
  so_xe: string | null;
  can_info: string | null;
  ghi_chu: string | null;
  loai: 'Giá tấn' | 'Giá chuyến' | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryScheduleWithUser extends DeliverySchedule {
  created_by_user: {
    id: number;
    full_name: string;
  };
}

export interface UploadError {
  sheet: string;
  row: number;
  ngay: string;
  field: string;
  value: any;
  reason: string;
}

export interface ListFilters {
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListResult {
  schedules: DeliveryScheduleWithUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export const deliveryScheduleService = {
  /**
   * Parse Excel file and insert delivery schedules
   * Replace mode: delete all records in date range before inserting
   */
  async upload(
    filePath: string,
    fromDate: string,
    toDate: string,
    userId: number
  ): Promise<{ total_sheets_processed: number; total_rows_inserted: number }> {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const errors: UploadError[] = [];
    const rowsToInsert: Array<{
      ngay: string; // Store as YYYY-MM-DD string
      stt: number;
      noi_giao: string | null;
      tan: number | null;
      so_xe: string | null;
      can_info: string | null;
      ghi_chu: string | null;
      loai: 'Giá tấn' | 'Giá chuyến';
    }> = [];

    // Parse as local date strings (UTC+7 timezone)
    // No need to convert to Date objects - just compare strings
    const fromDateStr = fromDate; // Already in YYYY-MM-DD format
    const toDateStr = toDate;
    let sheetsProcessed = 0;

    // Parse each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });

      // Parse column 1 (A-F) - date from A1 - Giá tấn
      const date1Cell = sheet['A1'];
      if (date1Cell && date1Cell.w) {
        const date1Str = this.parseExcelDateToString(date1Cell);
        if (date1Str && date1Str >= fromDateStr && date1Str <= toDateStr) {
          sheetsProcessed++;
          this.parseColumn(data, 0, date1Str, 'Giá tấn', sheetName, errors, rowsToInsert);
        }
      }

      // Parse column 2 (G-L) - date from G1 - Giá chuyến
      const date2Cell = sheet['G1'];
      if (date2Cell && date2Cell.w) {
        const date2Str = this.parseExcelDateToString(date2Cell);
        if (date2Str && date2Str >= fromDateStr && date2Str <= toDateStr) {
          if (!date1Cell || !date1Cell.w) sheetsProcessed++; // Don't double count if both columns processed
          this.parseColumn(data, 6, date2Str, 'Giá chuyến', sheetName, errors, rowsToInsert);
        }
      }
    }

    // Clean up temp file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('Failed to delete temp file:', filePath);
    }

    // Fail-fast: if any errors, throw them
    if (errors.length > 0) {
      throw { code: 'VALIDATION_ERRORS', errors };
    }

    // Replace mode: delete + insert in transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing records in date range
      await client.query(
        'DELETE FROM delivery_schedules WHERE ngay >= $1 AND ngay <= $2',
        [fromDate, toDate]
      );

      // Batch insert new records
      for (const row of rowsToInsert) {
        await client.query(
          `INSERT INTO delivery_schedules (ngay, stt, noi_giao, tan, so_xe, can_info, ghi_chu, loai, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            row.ngay, // Already in YYYY-MM-DD format
            row.stt,
            row.noi_giao,
            row.tan,
            row.so_xe,
            row.can_info,
            row.ghi_chu,
            row.loai,
            userId
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      total_sheets_processed: sheetsProcessed,
      total_rows_inserted: rowsToInsert.length
    };
  },

  /**
   * Parse a single column (6 columns: STT, NƠI GIAO, TẤN, SỐ XE, CAN, GHI CHÚ)
   * Column offset: 0 for A-F (Giá tấn), 6 for G-L (Giá chuyến)
   */
  parseColumn(
    data: unknown[],
    colOffset: number,
    ngayStr: string, // Date as YYYY-MM-DD string
    loai: 'Giá tấn' | 'Giá chuyến',
    sheetName: string,
    errors: UploadError[],
    rowsToInsert: any[]
  ): void {
    // Type assertion for data
    const rows = data as any[][];
    // Start from row 3 (index 3, after header rows 0, 1, 2)
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const stt = row[colOffset]; // Column A or G
      const noi_giao = row[colOffset + 1]; // Column B or H
      const tan = row[colOffset + 2]; // Column C or I
      const so_xe = row[colOffset + 3]; // Column D or J
      const can_info = row[colOffset + 4]; // Column E or K
      const ghi_chu = row[colOffset + 5]; // Column F or L

      // BR-001: Skip if no STT or (no NƠI GIAO and no SỐ XE)
      if (!stt || (!noi_giao && !so_xe)) {
        continue;
      }

      // Validate and normalize
      let normalizedStt: number | null = null;
      let normalizedTan: number | null = null;
      let normalizedSoXe: string | null = null;

      // Parse STT
      if (typeof stt === 'number') {
        normalizedStt = Math.floor(stt);
      } else if (typeof stt === 'string') {
        const parsed = parseInt(stt, 10);
        if (isNaN(parsed)) {
          errors.push({
            sheet: sheetName,
            row: i + 1,
            ngay: ngayStr,
            field: 'stt',
            value: stt,
            reason: 'STT không phải số hợp lệ'
          });
          continue;
        }
        normalizedStt = parsed;
      } else {
        continue; // Skip if STT is not valid
      }

      // Parse TẤN (no validation, best-effort)
      if (tan !== null && tan !== undefined && tan !== '') {
        const parsed = parseFloat(tan.toString().replace(',', '.'));
        if (!isNaN(parsed)) {
          normalizedTan = parsed;
        }
      }

      // Normalize SỐ XE (BR-004): uppercase, strip spaces/dashes/dots/commas → e.g. 50H12345
      if (so_xe !== null && so_xe !== undefined && so_xe !== '') {
        normalizedSoXe = so_xe.toString().replace(/[\s\-.]/g, '').toUpperCase();
      }

      // Add to insert batch
      rowsToInsert.push({
        ngay: ngayStr,
        stt: normalizedStt,
        noi_giao: noi_giao || null,
        tan: normalizedTan,
        so_xe: normalizedSoXe,
        can_info: can_info || null,
        ghi_chu: ghi_chu || null,
        loai: loai
      });
    }
  },

  /**
   * Parse Excel date cell to YYYY-MM-DD string (local timezone UTC+7)
   */
  parseExcelDateToString(cell: XLSX.CellObject): string | null {
    if (!cell) return null;

    // Priority 1: Parse from formatted string (cell.w) if available
    // This is the most reliable as it shows exactly what user sees in Excel
    if (cell.w) {
      // Format: "Ngày DD tháng MM năm YYYY."
      const vietnameseMatch = cell.w.match(/Ngày (\d{1,2}) tháng (\d{1,2}) năm (\d{4})/);
      if (vietnameseMatch) {
        const [, day, month, year] = vietnameseMatch;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Format: MM/DD/YYYY or DD/MM/YYYY
      const slashMatch = cell.w.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const [, part1, part2, year] = slashMatch;
        const p1 = parseInt(part1, 10);
        const p2 = parseInt(part2, 10);

        let month: number, day: number;
        if (p1 > 12) {
          day = p1;
          month = p2;
        } else if (p2 > 12) {
          month = p1;
          day = p2;
        } else {
          month = p1;
          day = p2;
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      // Format: YYYY-MM-DD
      const dashMatch = cell.w.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (dashMatch) {
        const [, year, month, day] = dashMatch;
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }

    // Priority 2: If cell has a Date object (type 'd')
    // xlsx cellDates:true creates UTC midnight Date objects — MUST use getUTC* methods
    // to avoid timezone shift (e.g. server at UTC would shift date back 7h vs UTC+7)
    if (cell.t === 'd' && cell.v instanceof Date) {
      const d = cell.v;
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // If cell has a numeric value (Excel serial date)
    // XLSX.SSF.parse_date_code returns {y, m, d}
    if (cell.t === 'n' && typeof cell.v === 'number') {
      const parts = XLSX.SSF.parse_date_code(cell.v);
      const year = parts.y;
      const month = String(parts.m).padStart(2, '0');
      const day = String(parts.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try parsing from formatted string (fallback)
    // Support formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    if (cell.w) {
      const str = cell.w.trim();

      // Try MM/DD/YYYY or DD/MM/YYYY format
      const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const [, part1, part2, year] = slashMatch;
        const p1 = parseInt(part1, 10);
        const p2 = parseInt(part2, 10);

        // Heuristic: if part1 > 12, it's DD/MM/YYYY, else assume MM/DD/YYYY
        let month: number, day: number;
        if (p1 > 12) {
          // Must be DD/MM/YYYY
          day = p1;
          month = p2;
        } else if (p2 > 12) {
          // Must be MM/DD/YYYY
          month = p1;
          day = p2;
        } else {
          // Ambiguous: default to MM/DD/YYYY (Excel default in most locales)
          month = p1;
          day = p2;
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const yearStr = year;
          const monthStr = String(month).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          return `${yearStr}-${monthStr}-${dayStr}`;
        }
      }

      // Try YYYY-MM-DD format
      const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (dashMatch) {
        const [, year, month, day] = dashMatch;
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const monthStr = String(m).padStart(2, '0');
          const dayStr = String(d).padStart(2, '0');
          return `${y}-${monthStr}-${dayStr}`;
        }
      }
    }

    return null;
  },

  /**
   * List delivery schedules with filters and pagination
   */
  async list(filters: ListFilters): Promise<ListResult> {
    const {
      from_date,
      to_date,
      search,
      page = 1,
      limit = 50
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Date range filter
    if (from_date) {
      conditions.push(`ds.ngay >= $${paramIndex++}`);
      params.push(from_date);
    }
    if (to_date) {
      conditions.push(`ds.ngay <= $${paramIndex++}`);
      params.push(to_date);
    }

    // Search filter
    if (search) {
      conditions.push(`(
        ds.noi_giao ILIKE $${paramIndex} OR
        ds.so_xe ILIKE $${paramIndex} OR
        ds.ghi_chu ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM delivery_schedules ds ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated data
    const dataResult = await pool.query<any>(
      `SELECT
        ds.id,
        ds.ngay::text as ngay,
        ds.stt,
        ds.noi_giao,
        ds.tan,
        ds.so_xe,
        ds.can_info,
        ds.ghi_chu,
        ds.loai,
        ds.created_by,
        ds.created_at,
        ds.updated_at,
        u.id as user_id,
        u.full_name as user_full_name
      FROM delivery_schedules ds
      LEFT JOIN users u ON ds.created_by = u.id
      ${whereClause}
      ORDER BY ds.ngay DESC, ds.stt ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const schedules: DeliveryScheduleWithUser[] = dataResult.rows.map(row => ({
      id: row.id,
      ngay: row.ngay,
      stt: row.stt,
      noi_giao: row.noi_giao,
      tan: row.tan,
      so_xe: row.so_xe,
      can_info: row.can_info,
      ghi_chu: row.ghi_chu,
      loai: row.loai,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by_user: {
        id: row.user_id,
        full_name: row.user_full_name
      }
    }));

    return {
      schedules,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Delete delivery schedules by date range
   */
  async deleteByDateRange(fromDate: string, toDate: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM delivery_schedules WHERE ngay >= $1 AND ngay <= $2',
      [fromDate, toDate]
    );
    return result.rowCount || 0;
  },

  /**
   * Delete a single delivery schedule by id
   */
  async deleteById(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM delivery_schedules WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Update a single delivery schedule by id
   */
  async updateById(
    id: number,
    data: {
      ngay: string;
      stt: number;
      noi_giao: string | null;
      tan: number | null;
      so_xe: string | null;
      can_info: string | null;
      ghi_chu: string | null;
      loai: 'Giá tấn' | 'Giá chuyến' | null;
    }
  ): Promise<DeliverySchedule | null> {
    const result = await pool.query<DeliverySchedule>(
      `UPDATE delivery_schedules
       SET ngay = $1, stt = $2, noi_giao = $3, tan = $4, so_xe = $5, can_info = $6, ghi_chu = $7, loai = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id, ngay::text as ngay, stt, noi_giao, tan, so_xe, can_info, ghi_chu, loai, created_by, created_at, updated_at`,
      [data.ngay, data.stt, data.noi_giao, data.tan, data.so_xe, data.can_info, data.ghi_chu, data.loai, id]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Get statistics for a date range
   */
  async getStatistics(fromDate: string, toDate: string): Promise<{
    summary: {
      totalDays: number;
      totalTrips: number;
      giaTanTrips: number;
      giaChuyenTrips: number;
      fromDate: string;
      toDate: string;
    };
    dailyBreakdown: Array<{
      ngay: string;
      tripCount: number;
      giaTanCount: number;
      giaChuyenCount: number;
    }>;
  }> {
    const summaryResult = await pool.query(
      `SELECT
        COUNT(DISTINCT ngay)::int AS total_days,
        COUNT(id)::int AS total_trips,
        COUNT(CASE WHEN loai = 'Giá tấn' THEN 1 END)::int AS gia_tan_trips,
        COUNT(CASE WHEN loai = 'Giá chuyến' THEN 1 END)::int AS gia_chuyen_trips
      FROM delivery_schedules
      WHERE ngay >= $1 AND ngay <= $2`,
      [fromDate, toDate]
    );

    const breakdownResult = await pool.query(
      `SELECT
        ngay::text,
        COUNT(id)::int AS trip_count,
        COUNT(CASE WHEN loai = 'Giá tấn' THEN 1 END)::int AS gia_tan_count,
        COUNT(CASE WHEN loai = 'Giá chuyến' THEN 1 END)::int AS gia_chuyen_count
      FROM delivery_schedules
      WHERE ngay >= $1 AND ngay <= $2
      GROUP BY ngay
      ORDER BY ngay ASC`,
      [fromDate, toDate]
    );

    const summary = summaryResult.rows[0];

    return {
      summary: {
        totalDays: summary.total_days ?? 0,
        totalTrips: summary.total_trips ?? 0,
        giaTanTrips: summary.gia_tan_trips ?? 0,
        giaChuyenTrips: summary.gia_chuyen_trips ?? 0,
        fromDate,
        toDate
      },
      dailyBreakdown: breakdownResult.rows.map(row => ({
        ngay: row.ngay,
        tripCount: row.trip_count,
        giaTanCount: row.gia_tan_count,
        giaChuyenCount: row.gia_chuyen_count,
      }))
    };
  }
};
