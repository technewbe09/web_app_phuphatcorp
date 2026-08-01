import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, X, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUploadRepairs } from '../../hooks/useVehicleRepairs';
import type { UploadBillRow, UploadError } from '../../api/vehicleRepairApi';
import { cn } from '../../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface ParsedBill {
  plate_number: string;
  repair_date: string;
  garage_name: string;
  notes: string;
  items: { item_name: string; parts_cost: string; labor_cost: string }[];
}

interface ParseResult {
  bills: ParsedBill[];
  totalRows: number;
}

function findCol(headers: string[], names: string[]): number {
  const normalizedNames = names.map((n) => n.toLowerCase().replace(/[\s_-]/g, ''));
  return headers.findIndex((h) => normalizedNames.includes(h?.toLowerCase().replace(/[\s_-]/g, '')));
}

function parseExcelDate(val: unknown): string {
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    const parts = val.trim().split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y && y.length === 2 ? `20${y}` : y;
      if (year && year.length === 4) return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return '';
}

function parseFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];

        if (rows.length < 2) {
          resolve({ bills: [], totalRows: 0 });
          return;
        }

        const headers = (rows[0] as string[]).map((h) => String(h ?? ''));
        const colPlate = findCol(headers, ['bien so', 'bienso', 'biển số', 'plate_number', 'plate']);
        const colDate = findCol(headers, ['ngay sua', 'ngaysua', 'ngày sửa', 'repair_date', 'date']);
        const colGarage = findCol(headers, ['ten gara', 'tengara', 'tên gara', 'gara', 'garage_name', 'garage']);
        const colItem = findCol(headers, ['hang muc', 'hangmuc', 'hạng mục', 'item_name', 'item']);
        const colParts = findCol(headers, ['tien phu tung', 'tienphutung', 'tiền phụ tùng', 'parts_cost', 'parts']);
        const colLabor = findCol(headers, ['tien cong', 'tiencong', 'tiền công', 'labor_cost', 'labor']);
        const colNotes = findCol(headers, ['ghi chu', 'ghichu', 'ghi chú', 'notes']);

        if (colPlate < 0 || colDate < 0 || colGarage < 0 || colItem < 0) {
          reject(new Error('Thiếu cột bắt buộc: Biển số, Ngày sửa, Tên gara, Hạng mục'));
          return;
        }

        const parsedRows: {
          plate_number: string;
          repair_date: string;
          garage_name: string;
          item_name: string;
          parts_cost: string;
          labor_cost: string;
          notes: string;
        }[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as (string | number | null)[];
          const plate = String(row[colPlate] ?? '').trim().replace(/[-\s.]/g, '');
          if (!plate) continue;

          const repairDate = parseExcelDate(row[colDate]);
          if (repairDate) {
            const dateParts = repairDate.split('-').map(Number);
            if (dateParts.length === 3 && !dateParts.some(isNaN)) {
              const d = new Date(repairDate);
              if (isNaN(d.getTime()) ||
                  d.getFullYear() !== dateParts[0] ||
                  d.getMonth() + 1 !== dateParts[1] ||
                  d.getDate() !== dateParts[2]) {
                throw new Error(`Hàng ${i + 1}: Ngày sửa không tồn tại: ${repairDate}`);
              }
            }
          }
          const garage = String(row[colGarage] ?? '').trim();
          const itemName = String(row[colItem] ?? '').trim();
          if (!itemName) continue;

          parsedRows.push({
            plate_number: plate,
            repair_date: repairDate,
            garage_name: garage,
            item_name: itemName,
            parts_cost: String(row[colParts] ?? 0),
            labor_cost: String(row[colLabor] ?? 0),
            notes: colNotes >= 0 ? String(row[colNotes] ?? '').trim() : '',
          });
        }

        const groupMap = new Map<string, ParsedBill>();
        for (const r of parsedRows) {
          const key = `${r.plate_number}|${r.repair_date}|${r.garage_name}`;
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              plate_number: r.plate_number,
              repair_date: r.repair_date,
              garage_name: r.garage_name,
              notes: r.notes,
              items: [],
            });
          }
          const bill = groupMap.get(key)!;
          bill.items.push({ item_name: r.item_name, parts_cost: r.parts_cost, labor_cost: r.labor_cost });
          if (r.notes && !bill.notes) bill.notes = r.notes;
        }

        resolve({ bills: Array.from(groupMap.values()), totalRows: parsedRows.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const headers = ['Biển số', 'Ngày sửa', 'Tên gara', 'Hạng mục', 'Tiền phụ tùng', 'Tiền công', 'Ghi chú'];
  const sample = [
    ['51H12345', '15/07/2026', 'Gara ABC', 'Thay dầu máy', 500000, 100000, 'Bảo dưỡng'],
    ['51H12345', '15/07/2026', 'Gara ABC', 'Thay lọc gió', 200000, 50000, 'Bảo dưỡng'],
    ['51H67890', '10/07/2026', 'Gara XYZ', 'Sửa phanh', 800000, 300000, ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 3 ? 22 : 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bill sửa xe');
  XLSX.writeFile(wb, 'mau_import_sua_xe.xlsx');
}

export function RepairUploadModal({ isOpen, onClose, onSuccess, onError }: Props) {
  const [step, setStep] = useState<'select' | 'preview' | 'errors'>('select');
  const [parsedBills, setParsedBills] = useState<ParsedBill[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [parseError, setParseError] = useState('');
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [loading, setLoading] = useState(false);

  const uploadMutation = useUploadRepairs();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    try {
      const result = await parseFile(file);
      if (result.bills.length === 0) {
        setParseError('Không tìm thấy dữ liệu hợp lệ trong file');
        return;
      }
      setParsedBills(result.bills);
      setTotalRows(result.totalRows);
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Lỗi parse file');
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const bills: UploadBillRow[] = parsedBills.map((b) => ({
        plate_number: b.plate_number,
        repair_date: b.repair_date,
        garage_name: b.garage_name,
        notes: b.notes || undefined,
        items: b.items.map((item) => ({
          item_name: item.item_name,
          parts_cost: parseInt(item.parts_cost, 10) || 0,
          labor_cost: parseInt(item.labor_cost, 10) || 0,
        })),
      }));
      await uploadMutation.mutateAsync(bills);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { data?: { errors?: UploadError[] }; message?: string; error?: string } } };
        if (e.response?.data?.data?.errors) {
          setUploadErrors(e.response.data.data.errors);
          setStep('errors');
          return;
        }
        const serverMsg = e.response?.data?.error || e.response?.data?.message || 'Lỗi import';
        onError(serverMsg);
      } else {
        onError('Lỗi kết nối');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setParsedBills([]);
    setParseError('');
    setUploadErrors([]);
    setLoading(false);
    onClose();
  };

  const calcTotal = (items: ParsedBill['items']) =>
    items.reduce((s, i) => s + (parseInt(i.parts_cost, 10) || 0) + (parseInt(i.labor_cost, 10) || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Excel — Bill Sửa xe" size="xl">
      <div className="space-y-4">
        {step === 'select' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Chọn file Excel (.xlsx) để import danh sách bill sửa xe
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1" />
                Tải file mẫu
              </Button>
            </div>

            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                parseError ? 'border-red-300 bg-red-50' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400',
              )}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="hidden"
                id="repair-upload-input"
              />
              <label htmlFor="repair-upload-input" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                  Kéo thả file Excel hoặc click để chọn
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Hỗ trợ .xlsx, .xls
                </p>
              </label>
            </div>
            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {parseError}
              </div>
            )}
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              Đã parse <strong>{parsedBills.length} bill</strong> từ <strong>{totalRows} dòng</strong> dữ liệu.
              Vui lòng kiểm tra trước khi import.
            </div>

            <div className="max-h-64 overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Biển số</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Ngày sửa</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Gara</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Hạng mục</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {parsedBills.slice(0, 20).map((bill, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-3 py-2 text-neutral-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-medium">{bill.plate_number}</td>
                      <td className="px-3 py-2">{bill.repair_date}</td>
                      <td className="px-3 py-2">{bill.garage_name}</td>
                      <td className="px-3 py-2 text-neutral-500">
                        {bill.items.map((it) => it.item_name).join(', ')}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {calcTotal(bill.items).toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedBills.length > 20 && (
                <p className="px-3 py-2 text-xs text-neutral-400">
                  ... và {parsedBills.length - 20} bill khác
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Hủy</Button>
              <Button onClick={handleImport} isLoading={loading || uploadMutation.isPending}>
                Import {parsedBills.length} bill
              </Button>
            </div>
          </>
        )}

        {step === 'errors' && (
          <>
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Import thất bại — {uploadErrors.length} lỗi được tìm thấy
            </div>

            <div className="max-h-64 overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Biển số</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {uploadErrors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-neutral-400">{err.row}</td>
                      <td className="px-3 py-2 font-mono">{err.plate_number}</td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('preview')}>Quay lại</Button>
              <Button variant="outline" onClick={handleClose}>Đóng</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
