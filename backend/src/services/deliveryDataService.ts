import * as XLSX from 'xlsx';
import * as crypto from 'crypto';
import { pool } from '../config/database';
import type { PoolClient } from 'pg';

interface DeliveryDataRow {
  channel: string;
  sub_channel: string;
  dien_giai_ct: string;
  dien_giai: string;
  slot: string;
  waybill_no: string;
  slot_no: string;
  user_tao_hd: string;
  user_tao_pxk: string;
  po_number: string;
  warehouse_no: string;
  warehouse_name: string;
  ma_pxk: string;
  so_chung_tu: string;
  so_seri: string;
  dia_chi: string;
  ten_hang_hoa: string;
  ma_dvt: string;
  sp_trong_luong: number | null;
  hd_trong_luong: number | null;
  ma_ncc: string;
  ma_kh: string;
  ten_kh: string;
  ma_hang: string;
  ten_hang_en: string;
  loai_hang: string;
  ma_lh_giao: string;
  so_luong: number | null;
  so_tau_xe: string;
  tai_xe: string;
  so_cont: string;
  ngay_hd: string | null;
  so_hd: string;
  thong_tin_bs: string;
}

interface BatchInfo {
  batch_id: string;
  original_filename: string;
  total_rows: number;
  total_invoices: number;
  matched_count: number;
  unmatched_count: number;
  min_date: string;
  max_date: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

interface ImportResult {
  batch_id: string;
  new_rows: number;
  duplicate_rows: number;
  new_invoices: number;
  duplicate_invoices: number;
  matched_count: number;
  unmatched_count: number;
  min_date: string;
  max_date: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function excelSerialToDate(serial: number): string {
  const date = new Date((serial - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeSoXe(soXe: string): string {
  return soXe.replace(/[-,\s]/g, '');
}

function parseExcel(fileBuffer: Buffer, originalFilename: string): {
  rows: DeliveryDataRow[];
  parseErrors: string[];
} {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], parseErrors: ['File Excel không có sheet nào'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

  if (raw.length < 5) {
    return { rows: [], parseErrors: ['File Excel không có dữ liệu (cần ít nhất 5 dòng)'] };
  }

  const rows: DeliveryDataRow[] = [];
  const parseErrors: string[] = [];

  for (let i = 4; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every((c) => c === '' || c === undefined || c === null)) continue;

    let ngayHd: string | null = null;
    const rawNgay = r[31];
    if (rawNgay !== '' && rawNgay !== undefined && rawNgay !== null) {
      const num = Number(rawNgay);
      if (!isNaN(num) && num > 10000) {
        try {
          ngayHd = excelSerialToDate(num);
        } catch {
          parseErrors.push(`Dòng ${i + 1}: Không thể parse ngày "${rawNgay}"`);
        }
      } else {
        ngayHd = String(rawNgay);
      }
    }

    const spTrongLuong = r[18] !== '' && r[18] !== undefined ? Number(r[18]) : null;
    const hdTrongLuong = r[19] !== '' && r[19] !== undefined ? Number(r[19]) : null;
    const soLuong = r[27] !== '' && r[27] !== undefined ? Number(r[27]) : null;

    rows.push({
      channel: String(r[0] ?? ''),
      sub_channel: String(r[1] ?? ''),
      dien_giai_ct: String(r[2] ?? ''),
      dien_giai: String(r[3] ?? ''),
      slot: String(r[4] ?? ''),
      waybill_no: String(r[5] ?? ''),
      slot_no: String(r[6] ?? ''),
      user_tao_hd: String(r[7] ?? ''),
      user_tao_pxk: String(r[8] ?? ''),
      po_number: String(r[9] ?? ''),
      warehouse_no: String(r[10] ?? ''),
      warehouse_name: String(r[11] ?? ''),
      ma_pxk: String(r[12] ?? ''),
      so_chung_tu: String(r[13] ?? ''),
      so_seri: String(r[14] ?? ''),
      dia_chi: String(r[15] ?? ''),
      ten_hang_hoa: String(r[16] ?? ''),
      ma_dvt: String(r[17] ?? ''),
      sp_trong_luong: isNaN(spTrongLuong as number) ? null : spTrongLuong,
      hd_trong_luong: isNaN(hdTrongLuong as number) ? null : hdTrongLuong,
      ma_ncc: String(r[20] ?? ''),
      ma_kh: String(r[21] ?? ''),
      ten_kh: String(r[22] ?? ''),
      ma_hang: String(r[23] ?? ''),
      ten_hang_en: String(r[24] ?? ''),
      loai_hang: String(r[25] ?? ''),
      ma_lh_giao: String(r[26] ?? ''),
      so_luong: isNaN(soLuong as number) ? null : soLuong,
      so_tau_xe: String(r[28] ?? ''),
      tai_xe: String(r[29] ?? ''),
      so_cont: String(r[30] ?? ''),
      ngay_hd: ngayHd,
      so_hd: String(r[32] ?? ''),
      thong_tin_bs: String(r[33] ?? ''),
    });
  }

  return { rows, parseErrors };
}

export const deliveryDataService = {
  async checkDuplicates(
    client: PoolClient,
    rows: DeliveryDataRow[],
  ): Promise<Set<string>> {
    const ngayHdArr: string[] = [];
    const soTauXeArr: string[] = [];
    const soHdArr: string[] = [];

    for (const row of rows) {
      ngayHdArr.push(row.ngay_hd || '');
      soTauXeArr.push(row.so_tau_xe);
      soHdArr.push(row.so_hd);
    }

    const result = await client.query<{ ngay: string; so_tau_xe: string; so_hd: string }>(
      `SELECT dd.ngay_hd::text as ngay, dd.so_tau_xe, dd.so_hd
       FROM delivery_data dd
       JOIN unnest($1::text[], $2::text[], $3::text[])
         AS t(ngay, so_xe, so_hd)
         ON dd.ngay_hd::text = t.ngay
            AND dd.so_tau_xe = t.so_xe
            AND dd.so_hd = t.so_hd`,
      [ngayHdArr, soTauXeArr, soHdArr],
    );

    return new Set(result.rows.map((r) => `${r.ngay}|${r.so_tau_xe}|${r.so_hd}`));
  },

  async importFromExcel(
    fileBuffer: Buffer,
    originalFilename: string,
    userId: number,
  ): Promise<ImportResult> {
    const { rows, parseErrors } = parseExcel(fileBuffer, originalFilename);

    if (rows.length === 0) {
      throw { code: 'EMPTY_FILE', message: parseErrors[0] || 'File không có dữ liệu' };
    }

    const batchId = crypto.randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const duplicateSet = await this.checkDuplicates(client, rows);
      const newRows = rows.filter(
        (r) => !duplicateSet.has(`${r.ngay_hd || ''}|${r.so_tau_xe}|${r.so_hd}`),
      );
      const duplicateRows = rows.length - newRows.length;

      const colCount = 34;
      const numArrays: (string | number | null)[][] = Array.from({ length: colCount }, () => []);

      for (const row of newRows) {
        numArrays[0].push(row.channel);
        numArrays[1].push(row.sub_channel);
        numArrays[2].push(row.dien_giai_ct);
        numArrays[3].push(row.dien_giai);
        numArrays[4].push(row.slot);
        numArrays[5].push(row.waybill_no);
        numArrays[6].push(row.slot_no);
        numArrays[7].push(row.user_tao_hd);
        numArrays[8].push(row.user_tao_pxk);
        numArrays[9].push(row.po_number);
        numArrays[10].push(row.warehouse_no);
        numArrays[11].push(row.warehouse_name);
        numArrays[12].push(row.ma_pxk);
        numArrays[13].push(row.so_chung_tu);
        numArrays[14].push(row.so_seri);
        numArrays[15].push(row.dia_chi);
        numArrays[16].push(row.ten_hang_hoa);
        numArrays[17].push(row.ma_dvt);
        numArrays[18].push(row.sp_trong_luong);
        numArrays[19].push(row.hd_trong_luong);
        numArrays[20].push(row.ma_ncc);
        numArrays[21].push(row.ma_kh);
        numArrays[22].push(row.ten_kh);
        numArrays[23].push(row.ma_hang);
        numArrays[24].push(row.ten_hang_en);
        numArrays[25].push(row.loai_hang);
        numArrays[26].push(row.ma_lh_giao);
        numArrays[27].push(row.so_luong);
        numArrays[28].push(row.so_tau_xe);
        numArrays[29].push(row.tai_xe);
        numArrays[30].push(row.so_cont);
        numArrays[31].push(row.ngay_hd);
        numArrays[32].push(row.so_hd);
        numArrays[33].push(row.thong_tin_bs);
      }

      const batchIds = Array(newRows.length).fill(batchId);
      const filenames = Array(newRows.length).fill(originalFilename);
      const userIds = Array(newRows.length).fill(userId);

      if (newRows.length > 0) {
        await client.query(
        `INSERT INTO delivery_data (
          batch_id, channel, sub_channel, dien_giai_ct, dien_giai,
          slot, waybill_no, slot_no, user_tao_hd, user_tao_pxk,
          po_number, warehouse_no, warehouse_name, ma_pxk, so_chung_tu,
          so_seri, dia_chi, ten_hang_hoa, ma_dvt, sp_trong_luong,
          hd_trong_luong, ma_ncc, ma_kh, ten_kh, ma_hang,
          ten_hang_en, loai_hang, ma_lh_giao, so_luong, so_tau_xe,
          tai_xe, so_cont, ngay_hd, so_hd, thong_tin_bs,
          original_filename, uploaded_by
        )
        SELECT * FROM unnest(
          $1::varchar[], $2::text[], $3::text[], $4::text[], $5::text[],
          $6::text[], $7::text[], $8::text[], $9::text[], $10::text[],
          $11::text[], $12::text[], $13::text[], $14::text[], $15::text[],
          $16::text[], $17::text[], $18::text[], $19::text[], $20::numeric[],
          $21::numeric[], $22::varchar[], $23::varchar[], $24::varchar[], $25::varchar[],
          $26::text[], $27::text[], $28::text[], $29::numeric[], $30::varchar[],
          $31::varchar[], $32::text[], $33::date[], $34::text[], $35::text[],
          $36::varchar[], $37::int[]
        )`,
        [
          batchIds, numArrays[0], numArrays[1], numArrays[2], numArrays[3],
          numArrays[4], numArrays[5], numArrays[6], numArrays[7], numArrays[8],
          numArrays[9], numArrays[10], numArrays[11], numArrays[12], numArrays[13],
          numArrays[14], numArrays[15], numArrays[16], numArrays[17], numArrays[18],
          numArrays[19], numArrays[20], numArrays[21], numArrays[22], numArrays[23],
          numArrays[24], numArrays[25], numArrays[26], numArrays[27], numArrays[28],
          numArrays[29], numArrays[30], numArrays[31], numArrays[32], numArrays[33],
          filenames, userIds,
        ],
      );
      }

      let minDate = '';
      let maxDate = '';
      let totalInvoices = 0;
      let matchedCount = 0;

      if (newRows.length > 0) {
        const dateResult = await client.query<{ min_date: string; max_date: string }>(
          `SELECT MIN(ngay_hd)::text as min_date, MAX(ngay_hd)::text as max_date
           FROM delivery_data WHERE batch_id = $1 AND ngay_hd IS NOT NULL`,
          [batchId],
        );

        minDate = dateResult.rows[0]?.min_date || '';
        maxDate = dateResult.rows[0]?.max_date || '';

        {
          const invoiceResult = await client.query(
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
                regexp_replace(elem, '^0+', '') AS so_hoa_don_stripped
              FROM driver_invoices di
              CROSS JOIN jsonb_array_elements_text(di.so_hoa_don) AS elem
              WHERE elem IS NOT NULL
                AND elem != ''
            ),
            delivery_invoices AS (
              SELECT DISTINCT
                dd.ngay_hd,
                regexp_replace(
                  regexp_replace(
                    regexp_replace(dd.so_tau_xe, '^[^0-9]*', ''),
                    '[-,\\s]', '', 'g'
                  ),
                  '/.*$', ''
                ) AS so_xe_normalized,
                trim(dd.so_hd) AS so_hd,
                regexp_replace(trim(dd.so_hd), '^0+', '') AS so_hd_stripped
              FROM delivery_data dd
              WHERE dd.batch_id = $1
                AND dd.so_hd IS NOT NULL
                AND trim(dd.so_hd) != ''
                AND dd.dien_giai NOT ILIKE '%thay thế%'
                AND dd.dien_giai NOT ILIKE '%điều chỉnh%'
                AND NOT EXISTS (
                  SELECT 1 FROM accountant_invoices ai
                  WHERE ai.ngay = dd.ngay_hd
                    AND ai.so_xe = regexp_replace(
                          regexp_replace(
                            regexp_replace(dd.so_tau_xe, '^[^0-9]*', ''),
                            '[-,\\s]', '', 'g'
                          ),
                          '/.*$', ''
                        )
                    AND ai.so_hoa_don = trim(dd.so_hd)
                )
            )
            INSERT INTO accountant_invoices (batch_id, ngay, so_xe, so_hoa_don, trang_thai)
            SELECT
              $1,
              di.ngay_hd,
              di.so_xe_normalized,
              di.so_hd,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM driver_invoice_flat dif
                  WHERE dif.so_xe_normalized = di.so_xe_normalized
                    AND dif.ngay::date = di.ngay_hd::date
                    AND (
                      dif.so_hoa_don_stripped = di.so_hd_stripped
                      OR di.so_hd_stripped LIKE dif.so_hoa_don_stripped || '%'
                      OR dif.so_hoa_don_stripped LIKE di.so_hd_stripped || '%'
                      OR di.so_hd_stripped LIKE '%' || dif.so_hoa_don_stripped || '%'
                    )
                ) THEN 'đã có'
                ELSE 'không có'
              END
            FROM delivery_invoices di
            RETURNING trang_thai`,
            [batchId],
          );

          totalInvoices = invoiceResult.rows.length;
          matchedCount = invoiceResult.rows.filter((r) => r.trang_thai === 'đã có').length;
        }
      }

      // Count duplicate invoices by comparing with existing accountant_invoices
      let duplicateInvoices = 0;
      if (newRows.length > 0) {
        const dupInvResult = await client.query<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM (
             SELECT DISTINCT dd.ngay_hd,
               regexp_replace(regexp_replace(regexp_replace(dd.so_tau_xe, '^[^0-9]*', ''), '[-,\\s]', '', 'g'), '/.*$', '') AS so_xe_norm,
               trim(dd.so_hd) AS so_hd
             FROM delivery_data dd
             WHERE dd.batch_id = $1
               AND dd.so_hd IS NOT NULL
               AND trim(dd.so_hd) != ''
               AND dd.dien_giai NOT ILIKE '%thay thế%'
               AND dd.dien_giai NOT ILIKE '%điều chỉnh%'
               AND EXISTS (
                 SELECT 1 FROM accountant_invoices ai
                 WHERE ai.ngay = dd.ngay_hd
                   AND ai.so_xe = regexp_replace(regexp_replace(regexp_replace(dd.so_tau_xe, '^[^0-9]*', ''), '[-,\\s]', '', 'g'), '/.*$', '')
                   AND ai.so_hoa_don = trim(dd.so_hd)
               )
           ) sub`,
          [batchId],
        );
        duplicateInvoices = parseInt(dupInvResult.rows[0].count, 10);
      }

      await client.query('COMMIT');

      const result: ImportResult = {
        batch_id: batchId,
        new_rows: newRows.length,
        duplicate_rows: duplicateRows,
        new_invoices: totalInvoices,
        duplicate_invoices: duplicateInvoices,
        matched_count: matchedCount,
        unmatched_count: totalInvoices - matchedCount,
        min_date: minDate,
        max_date: maxDate,
      };

      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async listBatches(page = 1, limit = 20): Promise<PaginatedResult<BatchInfo>> {
    const offset = (page - 1) * limit;

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT batch_id) as count FROM delivery_data`,
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const batchesResult = await pool.query(
      `WITH batch_stats AS (
        SELECT
          batch_id,
          MAX(original_filename) as original_filename,
          COUNT(*)::int as total_rows,
          MIN(ngay_hd) as min_date,
          MAX(ngay_hd) as max_date,
          MAX(uploaded_by) as uploaded_by,
          MAX(uploaded_at) as uploaded_at
        FROM delivery_data
        GROUP BY batch_id
      )
      SELECT
        bs.batch_id,
        bs.original_filename,
        bs.total_rows,
        COALESCE(ai.invoice_count, 0)::int as total_invoices,
        COALESCE(ai.matched_count, 0)::int as matched_count,
        COALESCE(ai.unmatched_count, 0)::int as unmatched_count,
        bs.min_date::text as min_date,
        bs.max_date::text as max_date,
        COALESCE(u.full_name, u.username, 'Unknown') as uploaded_by_name,
        bs.uploaded_at::text as uploaded_at
      FROM batch_stats bs
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) as invoice_count,
          COUNT(*) FILTER (WHERE trang_thai = 'đã có') as matched_count,
          COUNT(*) FILTER (WHERE trang_thai = 'không có') as unmatched_count
        FROM accountant_invoices
        WHERE batch_id = bs.batch_id
      ) ai ON true
      LEFT JOIN users u ON bs.uploaded_by = u.id
      ORDER BY bs.uploaded_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return {
      data: batchesResult.rows.map((r) => ({
        batch_id: r.batch_id as string,
        original_filename: r.original_filename as string,
        total_rows: r.total_rows as number,
        total_invoices: r.total_invoices as number,
        matched_count: r.matched_count as number,
        unmatched_count: r.unmatched_count as number,
        min_date: r.min_date as string,
        max_date: r.max_date as string,
        uploaded_by_name: r.uploaded_by_name as string,
        uploaded_at: r.uploaded_at as string,
      })),
      pagination: { page, limit, total, totalPages },
    };
  },

  async deleteBatch(batchId: string): Promise<{ deleted_rows: number; deleted_invoices: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceResult = await client.query<{ count: string }>(
        'DELETE FROM accountant_invoices WHERE batch_id = $1 RETURNING id',
        [batchId],
      );
      const deletedInvoices = invoiceResult.rows.length;

      const dataResult = await client.query<{ count: string }>(
        'DELETE FROM delivery_data WHERE batch_id = $1 RETURNING id',
        [batchId],
      );
      const deletedRows = dataResult.rows.length;

      await client.query('COMMIT');

      return { deleted_rows: deletedRows, deleted_invoices: deletedInvoices };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getBatchStats(batchId: string): Promise<BatchInfo | null> {
    const result = await pool.query(
      `WITH batch_stats AS (
        SELECT
          batch_id,
          MAX(original_filename) as original_filename,
          COUNT(*)::int as total_rows,
          MIN(ngay_hd) as min_date,
          MAX(ngay_hd) as max_date,
          MAX(uploaded_by) as uploaded_by,
          MAX(uploaded_at) as uploaded_at
        FROM delivery_data
        WHERE batch_id = $1
        GROUP BY batch_id
      )
      SELECT
        bs.batch_id,
        bs.original_filename,
        bs.total_rows,
        COALESCE(ai.invoice_count, 0)::int as total_invoices,
        COALESCE(ai.matched_count, 0)::int as matched_count,
        COALESCE(ai.unmatched_count, 0)::int as unmatched_count,
        bs.min_date::text as min_date,
        bs.max_date::text as max_date,
        COALESCE(u.full_name, u.username, 'Unknown') as uploaded_by_name,
        bs.uploaded_at::text as uploaded_at
      FROM batch_stats bs
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) as invoice_count,
          COUNT(*) FILTER (WHERE trang_thai = 'đã có') as matched_count,
          COUNT(*) FILTER (WHERE trang_thai = 'không có') as unmatched_count
        FROM accountant_invoices
        WHERE batch_id = $1
      ) ai ON true
      LEFT JOIN users u ON bs.uploaded_by = u.id`,
      [batchId],
    );

    if (result.rows.length === 0) return null;

    const r = result.rows[0];
    return {
      batch_id: r.batch_id as string,
      original_filename: r.original_filename as string,
      total_rows: r.total_rows as number,
      total_invoices: r.total_invoices as number,
      matched_count: r.matched_count as number,
      unmatched_count: r.unmatched_count as number,
      min_date: r.min_date as string,
      max_date: r.max_date as string,
      uploaded_by_name: r.uploaded_by_name as string,
      uploaded_at: r.uploaded_at as string,
    };
  },

  async getBatchRows(batchIds: string[]): Promise<{
    batch_ids: string[];
    original_filenames: string[];
    total_rows: number;
    rows: unknown[][];
  }> {
    const result = await pool.query(
      `SELECT
        batch_id,
        channel,
        sub_channel,
        dien_giai_ct,
        dien_giai,
        slot,
        waybill_no,
        slot_no,
        user_tao_hd,
        user_tao_pxk,
        po_number,
        warehouse_no,
        warehouse_name,
        ma_pxk,
        so_chung_tu,
        so_seri,
        dia_chi,
        ten_hang_hoa,
        ma_dvt,
        sp_trong_luong,
        hd_trong_luong,
        ma_ncc,
        ma_kh,
        ten_kh,
        ma_hang,
        ten_hang_en,
        loai_hang,
        ma_lh_giao,
        so_luong,
        so_tau_xe,
        tai_xe,
        so_cont,
        TO_CHAR(ngay_hd, 'DD/MM/YYYY') as ngay_hd,
        so_hd,
        thong_tin_bs,
        original_filename
      FROM delivery_data
      WHERE batch_id = ANY($1::varchar[])
      ORDER BY batch_id, id`,
      [batchIds],
    );

    if (result.rows.length === 0) {
      throw { code: 'NO_DATA', message: 'Batch đã chọn không có dữ liệu' };
    }

    const rows: unknown[][] = result.rows.map((r: Record<string, unknown>) => [
      r.channel,
      r.sub_channel,
      r.dien_giai_ct,
      r.dien_giai,
      r.slot,
      r.waybill_no,
      r.slot_no,
      r.user_tao_hd,
      r.user_tao_pxk,
      r.po_number,
      r.warehouse_no,
      r.warehouse_name,
      r.ma_pxk,
      r.so_chung_tu,
      r.so_seri,
      r.dia_chi,
      r.ten_hang_hoa,
      r.ma_dvt,
      r.sp_trong_luong,
      r.hd_trong_luong,
      r.ma_ncc,
      r.ma_kh,
      r.ten_kh,
      r.ma_hang,
      r.ten_hang_en,
      r.loai_hang,
      r.ma_lh_giao,
      r.so_luong,
      r.so_tau_xe,
      r.tai_xe,
      r.so_cont,
      r.ngay_hd,
      r.so_hd,
      r.thong_tin_bs,
    ]);

    const filenames = [...new Set(result.rows.map((r: Record<string, unknown>) => r.original_filename as string))];
    const foundBatchIds = [...new Set(result.rows.map((r: Record<string, unknown>) => r.batch_id as string))];

    return {
      batch_ids: foundBatchIds,
      original_filenames: filenames,
      total_rows: rows.length,
      rows,
    };
  },
};
