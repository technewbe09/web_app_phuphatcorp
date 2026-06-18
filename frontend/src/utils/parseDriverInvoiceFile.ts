import * as XLSX from 'xlsx';

export interface ParsedInvoiceRow {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string | null;
  so_hoa_don: { so: string; ghi_chu: string }[];
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
    const serial = Math.floor(value);
    const date = XLSX.SSF.parse_date_code(serial);
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

function parseInvoiceNumbers(raw: string | null | undefined): { so: string; ghi_chu: string }[] {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split('+')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map((so) => ({ so, ghi_chu: '' }));
}

function normalizeSoXe(raw: string): string {
  return raw.replace(/[-,\s]/g, '');
}

function parseSheetRows(rawRows: unknown[][]): ParsedInvoiceRow[] {
  const parsedRows: ParsedInvoiceRow[] = [];

  for (let i = 5; i < rawRows.length; i++) {
    const cells = rawRows[i] as unknown[];

    const ma = String(cells[0] ?? '').trim();
    if (!ma) continue;

    const ten_tx = String(cells[1] ?? '').trim();

    const ngayRaw = cells[2];
    const ngay = parseExcelDate(ngayRaw);
    if (!ngay) continue;

    const so_xe = normalizeSoXe(String(cells[3] ?? ''));
    if (!so_xe) continue;

    const noi_giao = String(cells[4] ?? '').trim();

    const ghi_chu_raw = cells[5];
    const ghi_chu = ghi_chu_raw
      ? String(ghi_chu_raw).trim()
      : '';

    if (!ghi_chu) continue;

    const so_hoa_don = parseInvoiceNumbers(ghi_chu);

    parsedRows.push({
      ma,
      ten_tx: ten_tx || '',
      ngay,
      so_xe,
      noi_giao: noi_giao || '',
      ghi_chu,
      so_hoa_don,
    });
  }

  return parsedRows;
}

export function parseDriverInvoiceFile(file: File): Promise<ParseDriverInvoiceResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellStyles: true });

        const dataSheets = ['HCM', 'Tỉnh'];
        const allRows: ParsedInvoiceRow[] = [];

        let foundAny = false;
        for (const sheetName of dataSheets) {
          const sheet = wb.Sheets[sheetName];
          if (!sheet) continue;

          foundAny = true;
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: '',
            raw: true,
          });

          if (rawRows.length < 6) continue;

          const sheetRows = parseSheetRows(rawRows);
          allRows.push(...sheetRows);
        }

        if (!foundAny) {
          reject(new Error("Không tìm thấy sheet 'HCM' hoặc 'Tỉnh' trong file"));
          return;
        }

        const totalInvoices = allRows.reduce(
          (sum, row) => sum + row.so_hoa_don.length,
          0,
        );

        resolve({
          rows: allRows,
          totalRows: allRows.length,
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
