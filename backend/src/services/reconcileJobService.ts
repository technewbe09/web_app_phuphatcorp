import { pool } from '../config/database';

export interface ReconcileJobConfig {
  id: number;
  name: string;
  lookback_days: number;
  schedule_hours: number[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReconcileJobLog {
  id: number;
  config_id: number | null;
  config_name: string | null;
  trigger_type: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  lookback_days: number | null;
  scanned_count: number;
  matched_count: number;
  error_message: string | null;
  matched_invoices: MatchedInvoice[];
  created_at: string;
}

export interface MatchedInvoice {
  id: number;
  so_hoa_don: string;
  so_xe: string;
  ngay: string;
}

export interface CreateConfigInput {
  name?: string;
  lookback_days?: number;
  schedule_hours?: number[];
  is_active?: boolean;
}

export interface UpdateConfigInput {
  name?: string;
  lookback_days?: number;
  schedule_hours?: number[];
  is_active?: boolean;
}

export interface LogFilters {
  page?: number;
  limit?: number;
  config_id?: number;
  status?: string;
}

export interface TriggerInput {
  config_id?: number;
  lookback_days?: number;
}

export interface TriggerResult {
  log_id: number;
  scanned_count: number;
  matched_count: number;
  matched_invoices: MatchedInvoice[];
  status: string;
}

function mapConfig(row: Record<string, unknown>): ReconcileJobConfig {
  return {
    id: row.id as number,
    name: row.name as string,
    lookback_days: row.lookback_days as number,
    schedule_hours: row.schedule_hours as number[],
    is_active: row.is_active as boolean,
    last_run_at: row.last_run_at ? new Date(row.last_run_at as string).toISOString() : null,
    next_run_at: row.next_run_at ? new Date(row.next_run_at as string).toISOString() : null,
    created_by: row.created_by as number | null,
    updated_by: row.updated_by as number | null,
    created_at: row.created_at instanceof Date
      ? (row.created_at as Date).toISOString()
      : row.created_at as string,
    updated_at: row.updated_at instanceof Date
      ? (row.updated_at as Date).toISOString()
      : row.updated_at as string,
  };
}

function mapLog(row: Record<string, unknown>): ReconcileJobLog {
  return {
    id: row.id as number,
    config_id: row.config_id as number | null,
    config_name: row.config_name as string | null,
    trigger_type: row.trigger_type as string,
    started_at: row.started_at instanceof Date
      ? (row.started_at as Date).toISOString()
      : row.started_at as string,
    finished_at: row.finished_at
      ? (row.finished_at instanceof Date
          ? (row.finished_at as Date).toISOString()
          : (row.finished_at as string))
      : null,
    status: row.status as string,
    lookback_days: row.lookback_days as number | null,
    scanned_count: row.scanned_count as number,
    matched_count: row.matched_count as number,
    error_message: row.error_message as string | null,
    matched_invoices: (row.matched_invoices as MatchedInvoice[]) || [],
    created_at: row.created_at instanceof Date
      ? (row.created_at as Date).toISOString()
      : row.created_at as string,
  };
}

export const reconcileJobService = {

  async listConfigs(): Promise<ReconcileJobConfig[]> {
    const result = await pool.query(
      `SELECT * FROM reconcile_job_configs ORDER BY created_at DESC`,
    );
    return result.rows.map(mapConfig);
  },

  async getConfigById(id: number): Promise<ReconcileJobConfig | null> {
    const result = await pool.query(
      `SELECT * FROM reconcile_job_configs WHERE id = $1`,
      [id],
    );
    return result.rows.length > 0 ? mapConfig(result.rows[0]) : null;
  },

  async createConfig(
    input: CreateConfigInput,
    userId: number,
  ): Promise<ReconcileJobConfig> {
    const name = input.name || 'Đối chiếu hóa đơn';
    const lookbackDays = input.lookback_days ?? 180;
    const scheduleHours = input.schedule_hours || [8, 12, 18];
    const isActive = input.is_active ?? true;

    const result = await pool.query(
      `INSERT INTO reconcile_job_configs (name, lookback_days, schedule_hours, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, lookbackDays, scheduleHours, isActive, userId],
    );
    return mapConfig(result.rows[0]);
  },

  async updateConfig(
    id: number,
    input: UpdateConfigInput,
    userId: number,
  ): Promise<ReconcileJobConfig | null> {
    const existing = await pool.query(
      `SELECT * FROM reconcile_job_configs WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return null;

    const current = existing.rows[0];
    const name = input.name ?? current.name;
    const lookbackDays = input.lookback_days ?? current.lookback_days;
    const scheduleHours = input.schedule_hours ?? current.schedule_hours;
    const isActive = input.is_active ?? current.is_active;

    const result = await pool.query(
      `UPDATE reconcile_job_configs
       SET name = $1, lookback_days = $2, schedule_hours = $3, is_active = $4,
           updated_by = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, lookbackDays, scheduleHours, isActive, userId, id],
    );
    return result.rows.length > 0 ? mapConfig(result.rows[0]) : null;
  },

  async deleteConfig(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM reconcile_job_configs WHERE id = $1 RETURNING id`,
      [id],
    );
    return result.rows.length > 0;
  },

  async toggleConfig(id: number): Promise<ReconcileJobConfig | null> {
    const result = await pool.query(
      `UPDATE reconcile_job_configs
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return result.rows.length > 0 ? mapConfig(result.rows[0]) : null;
  },

  async executeReconcile(
    lookbackDays: number,
  ): Promise<{ scanned_count: number; matched_count: number; matched_invoices: MatchedInvoice[] }> {
    const client = await pool.connect();
    try {
      const beforeCount = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM accountant_invoices
         WHERE trang_thai = 'không có'
           AND ngay >= CURRENT_DATE - $1::integer`,
        [lookbackDays],
      );
      const scannedCount = beforeCount.rows[0].cnt;

      const updateResult = await client.query(
        `WITH driver_invoice_flat AS (
          SELECT DISTINCT
            regexp_replace(
              regexp_replace(
                regexp_replace(di.so_xe, '^[^0-9]*', ''),
                '[-,\\s]', '', 'g'
              ),
              '/.*$', ''
            ) AS so_xe_normalized,
            di.ngay,
            regexp_replace(hd->>'so', '^0+', '') AS so_hoa_don_stripped
          FROM driver_invoices di
          CROSS JOIN LATERAL jsonb_array_elements(di.so_hoa_don) AS hd
          WHERE hd->>'so' IS NOT NULL
            AND hd->>'so' != ''
        )
        UPDATE accountant_invoices ai
        SET trang_thai = 'đã có'
        WHERE ai.trang_thai = 'không có'
          AND ai.ngay >= CURRENT_DATE - $1::integer
          AND EXISTS (
            SELECT 1 FROM driver_invoice_flat dif
            WHERE dif.so_xe_normalized = regexp_replace(
                    regexp_replace(
                      regexp_replace(ai.so_xe, '^[^0-9]*', ''),
                      '[-,\\s]', '', 'g'
                    ),
                    '/.*$', ''
                  )
              AND dif.ngay = ai.ngay
              AND (
                dif.so_hoa_don_stripped = regexp_replace(ai.so_hoa_don, '^0+', '')
                OR regexp_replace(ai.so_hoa_don, '^0+', '') LIKE dif.so_hoa_don_stripped || '%'
                OR dif.so_hoa_don_stripped LIKE regexp_replace(ai.so_hoa_don, '^0+', '') || '%'
                OR regexp_replace(ai.so_hoa_don, '^0+', '') LIKE '%' || dif.so_hoa_don_stripped || '%'
              )
          )
        RETURNING id, so_hoa_don, so_xe, ngay`,
        [lookbackDays],
      );

      const matchedInvoices: MatchedInvoice[] = updateResult.rows.map((r) => ({
        id: r.id as number,
        so_hoa_don: r.so_hoa_don as string,
        so_xe: r.so_xe as string,
        ngay: r.ngay instanceof Date
          ? (r.ngay as Date).toISOString().slice(0, 10)
          : (r.ngay as string),
      }));

      return {
        scanned_count: scannedCount,
        matched_count: matchedInvoices.length,
        matched_invoices: matchedInvoices,
      };
    } finally {
      client.release();
    }
  },

  async createLog(
    configId: number | null,
    triggerType: string,
    lookbackDays: number,
  ): Promise<number> {
    const result = await pool.query(
      `INSERT INTO reconcile_job_logs (config_id, trigger_type, started_at, status, lookback_days)
       VALUES ($1, $2, NOW(), 'running', $3)
       RETURNING id`,
      [configId, triggerType, lookbackDays],
    );
    return result.rows[0].id;
  },

  async updateLogSuccess(
    logId: number,
    scannedCount: number,
    matchedCount: number,
    matchedInvoices: MatchedInvoice[],
  ): Promise<void> {
    await pool.query(
      `UPDATE reconcile_job_logs
       SET finished_at = NOW(), status = 'success',
           scanned_count = $1, matched_count = $2,
           matched_invoices = $3::jsonb
       WHERE id = $4`,
      [scannedCount, matchedCount, JSON.stringify(matchedInvoices), logId],
    );
  },

  async updateLogFailed(logId: number, errorMessage: string): Promise<void> {
    await pool.query(
      `UPDATE reconcile_job_logs
       SET finished_at = NOW(), status = 'failed', error_message = $1
       WHERE id = $2`,
      [errorMessage, logId],
    );
  },

  async updateConfigLastRun(configId: number): Promise<void> {
    await pool.query(
      `UPDATE reconcile_job_configs SET last_run_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [configId],
    );
  },

  async getLogs(filters: LogFilters): Promise<{
    data: ReconcileJobLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (filters.config_id !== undefined) {
      whereClauses.push(`rl.config_id = $${paramIdx++}`);
      params.push(filters.config_id);
    }
    if (filters.status) {
      whereClauses.push(`rl.status = $${paramIdx++}`);
      params.push(filters.status);
    }

    const whereSQL = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM reconcile_job_logs rl ${whereSQL}`,
      params,
    );
    const total = countResult.rows[0].total;

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT rl.*, rc.name AS config_name
       FROM reconcile_job_logs rl
       LEFT JOIN reconcile_job_configs rc ON rc.id = rl.config_id
       ${whereSQL}
       ORDER BY rl.started_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      params,
    );

    return {
      data: dataResult.rows.map(mapLog),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
