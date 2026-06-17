import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUploadSuppliers } from '../../hooks/useSupplierCatalog';
import type { UploadSupplierRow, SupplierUploadError } from '../../api/supplierCatalogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function generateTemplate(): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Mã NCC', 'Tên nhà máy', 'Ghi chú'],
    ['2000000001', 'CLF', ''],
    ['2100000002', 'VFM', ''],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'NhaCungCap');
  XLSX.writeFile(wb, 'template_nha_cung_cap.xlsx');
}

export function UploadSuppliersModal({ isOpen, onClose, onSuccess }: Props) {
  const uploadMutation = useUploadSuppliers();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<UploadSupplierRow[]>([]);
  const [fileError, setFileError] = useState('');
  const [uploadErrors, setUploadErrors] = useState<SupplierUploadError[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setFileError('');
    setUploadErrors([]);
    onClose();
  };

  const parseExcel = (f: File): Promise<UploadSupplierRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

          if (rawRows.length === 0) {
            resolve([]);
            return;
          }

          const headerRow = (rawRows[0] as unknown[]).map((cell) =>
            String(cell ?? '').trim().toLowerCase()
          );

          const normalize = (s: string) => s.toLowerCase().replace(/[-–\s]+/g, '');

          const findCol = (...candidates: string[]): number => {
            for (const candidate of candidates) {
              const idx = headerRow.findIndex((h) => normalize(h) === normalize(candidate));
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const colCode = findCol('Mã NCC', 'Mã', 'ma ncc', 'mancc', 'supplier_code');
          const colName = findCol('Tên nhà máy', 'Tên', 'ten nha may', 'tennhamay', 'name');
          const colNotes = findCol('Ghi chú', 'ghi chu', 'ghichu', 'notes');

          if (colCode === -1 || colName === -1) {
            reject(new Error('File không có dữ liệu hợp lệ. Kiểm tra cột "Mã NCC" và "Tên nhà máy".'));
            return;
          }

          const dataRows = rawRows.slice(1) as unknown[][];

          const parsed: UploadSupplierRow[] = dataRows
            .filter((row) => {
              const code = String(row[colCode] ?? '').trim();
              return code !== '' && code !== 'null';
            })
            .map((row) => ({
              supplier_code: String(row[colCode] ?? '').trim(),
              name: String(row[colName] ?? '').trim(),
              notes: colNotes !== -1 && row[colNotes] != null && String(row[colNotes]).trim() !== ''
                ? String(row[colNotes]).trim()
                : null,
            }));

          resolve(parsed);
        } catch {
          reject(new Error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.'));
        }
      };
      reader.onerror = () => reject(new Error('Không thể đọc file.'));
      reader.readAsArrayBuffer(f);
    });
  };

  const handleFile = async (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      setFileError('Chỉ chấp nhận file .xlsx');
      setFile(null);
      setParsedRows([]);
      return;
    }
    setFileError('');
    setUploadErrors([]);

    try {
      const rows = await parseExcel(f);
      if (rows.length === 0) {
        setFileError('File không có dữ liệu hợp lệ. Kiểm tra cột "Mã NCC" và "Tên nhà máy".');
        setFile(null);
        return;
      }
      setFile(f);
      setParsedRows(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đọc file';
      setFileError(msg);
      setFile(null);
      setParsedRows([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file || parsedRows.length === 0) return;
    setFileError('');
    setUploadErrors([]);

    try {
      const result = await uploadMutation.mutateAsync(parsedRows);
      onSuccess(`Đã import ${result.inserted} nhà cung cấp thành công.`);
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as {
          response?: { data?: { data?: { errors?: SupplierUploadError[] }; message?: string }; status?: number };
        };
        if (e.response?.status === 422 && e.response.data?.data?.errors) {
          setUploadErrors(e.response.data.data.errors);
          return;
        }
        setFileError(e.response?.data?.message || 'Lỗi upload. Vui lòng thử lại.');
      } else {
        setFileError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import nhà cung cấp từ Excel" size="lg">
      <div className="space-y-4">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 space-y-1">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">Cột bắt buộc (nhận diện tự động theo tên cột):</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li><span className="font-medium">Mã NCC</span> <span className="text-red-500">*</span></li>
            <li><span className="font-medium">Tên nhà máy</span> <span className="text-red-500">*</span></li>
            <li>Ghi chú</li>
          </ul>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-neutral-500 dark:border-neutral-400 bg-neutral-50 dark:bg-neutral-800/50'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
          }`}
        >
          <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Kéo thả file .xlsx vào đây</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">hoặc click để chọn file</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {file && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                {parsedRows.length} nhà cung cấp
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setParsedRows([]); setUploadErrors([]); }}
                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {parsedRows.length > 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 px-1 space-y-0.5">
                <p className="font-medium">Xem trước ({Math.min(3, parsedRows.length)} dòng đầu):</p>
                {parsedRows.slice(0, 3).map((r, i) => (
                  <p key={i}>• {r.supplier_code} — {r.name}</p>
                ))}
                {parsedRows.length > 3 && (
                  <p className="text-neutral-400 dark:text-neutral-500">...và {parsedRows.length - 3} dòng khác</p>
                )}
              </div>
            )}
          </div>
        )}

        {fileError && (
          <p className="text-sm text-red-500 dark:text-red-400">{fileError}</p>
        )}

        <button
          type="button"
          onClick={generateTemplate}
          className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline"
        >
          Tải file mẫu
        </button>

        {uploadErrors.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Có {uploadErrors.length} lỗi — không có dòng nào được lưu:
            </p>
            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-red-900/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Dòng</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Mã NCC</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadErrors.map((err, i) => (
                    <tr key={i} className="border-t border-red-100 dark:border-red-900/40">
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{err.row}</td>
                      <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{err.supplier_code}</td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="button"
            isLoading={uploadMutation.isPending}
            disabled={!file || parsedRows.length === 0}
            onClick={handleUpload}
          >
            Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}
