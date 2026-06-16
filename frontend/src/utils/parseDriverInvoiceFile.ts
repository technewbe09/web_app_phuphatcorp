import * as XLSX from 'xlsx';

export interface ParsedInvoiceRow {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string | null;
  so_hoa_don: string[];
}

export interface ParseDriverInvoiceResult {
  rows: ParsedInvoiceRow[];
  totalRows: number;
  totalInvoices: number;
}

function parseExcelDate(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && value > 40000 && value < 60000) {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    return trimmed;
  }
  return '';
}

function parseInvoiceNumbers(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split('+')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

function normalizeSoXe(raw: string): string {
  return raw.replace(/[-,\s]/g, '');
}

export function parseDriverInvoiceFile(file: File): Promise<ParseDriverInvoiceResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellStyles: true });

        const sheet = wb.Sheets['XE NHỎ'];
        if (!sheet) {
          reject(new Error("Không tìm thấy sheet 'XE NHỎ' trong file"));
          return;
        }

        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
          raw: true,
        });

        if (rawRows.length < 8) {
          resolve({ rows: [], totalRows: 0, totalInvoices: 0 });
          return;
        }

        const parsedRows: ParsedInvoiceRow[] = [];

        for (let i = 7; i < rawRows.length; i++) {
          const row = rawRows[i];
          const cells = row as unknown[];

          const ma = String(cells[1] ?? '').trim();
          const ten_tx = String(cells[2] ?? '').trim();
          const ngayRaw = cells[3];
          const so_xe = normalizeSoXe(String(cells[4] ?? ''));
          const noi_giao = String(cells[5] ?? '').trim();
          const ghi_chu_raw = cells[6];

          const ngay = parseExcelDate(ngayRaw);

          if (!ma) continue;

          const ghi_chu = ghi_chu_raw
            ? String(ghi_chu_raw).trim()
            : '';

          if (!ghi_chu) continue;

          const so_hoa_don = parseInvoiceNumbers(ghi_chu);

          parsedRows.push({
            ma: ma || '',
            ten_tx: ten_tx || '',
            ngay,
            so_xe: so_xe || '',
            noi_giao: noi_giao || '',
            ghi_chu,
            so_hoa_don,
          });
        }

        const totalInvoices = parsedRows.reduce(
          (sum, row) => sum + row.so_hoa_don.length,
          0,
        );

        resolve({
          rows: parsedRows,
          totalRows: parsedRows.length,
          totalInvoices,
        });
      } catch {
        reject(new Error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.'));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file.'));
    reader.readAsArrayBuffer(file);
  });
}
