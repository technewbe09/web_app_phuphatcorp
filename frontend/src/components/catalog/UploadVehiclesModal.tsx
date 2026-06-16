import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUploadVehicles } from '../../hooks/useVehicleCatalog';
import type { VehicleUploadError } from '../../api/vehicleCatalogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function normalizePlateNumber(raw: string): string | null {
  const cleaned = raw
    .replace(/^[^\d]*/, '')
    .replace(/[-,\s.]/g, '')
    .replace(/\/.*$/, '')
    .toUpperCase();

  if (!/^\d{2}[A-Z]\d{4,}$/.test(cleaned)) return null;

  return cleaned;
}

interface ParsedRow {
  driver_name: string;
  plate_number: string;
  normalized: string;
}

interface ClientError {
  row: number;
  driver_name: string;
  plate_number: string;
  reason: string;
}

export function UploadVehiclesModal({ isOpen, onClose, onSuccess, onError }: Props) {
  const uploadMutation = useUploadVehicles();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [clientErrors, setClientErrors] = useState<ClientError[]>([]);
  const [serverErrors, setServerErrors] = useState<VehicleUploadError[]>([]);
  const [fileError, setFileError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setClientErrors([]);
    setServerErrors([]);
    setFileError('');
    onClose();
  };

  const parseExcel = (f: File): Promise<{ rows: ParsedRow[]; errors: ClientError[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });

          const sheetName = wb.SheetNames.find(
            (s) => s.toLowerCase().trim() === 'xe',
          );

          if (!sheetName) {
            reject(new Error("Không tìm thấy sheet 'xe' trong file."));
            return;
          }

          const ws = wb.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
            header: 1,
            defval: null,
          });

          const rows: ParsedRow[] = [];
          const errors: ClientError[] = [];
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
            if (
              (col0 === 'MA' && normalized1 === 'soxe') ||
              (normalized0 === 'ma' && col1 === 'SỐ XE')
            ) {
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

            rows.push({ driver_name: col0, plate_number: col1, normalized });
          }

          if (rows.length === 0 && errors.length === 0) {
            reject(new Error("Không có dữ liệu hợp lệ trong sheet 'xe'."));
            return;
          }

          resolve({ rows, errors });
        } catch {
          reject(new Error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng.'));
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
      setClientErrors([]);
      return;
    }
    setFileError('');
    setServerErrors([]);

    try {
      const { rows, errors } = await parseExcel(f);
      setFile(f);
      setParsedRows(rows);
      setClientErrors(errors);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đọc file';
      setFileError(msg);
      setFile(null);
      setParsedRows([]);
      setClientErrors([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file || clientErrors.length > 0) return;
    setFileError('');
    setServerErrors([]);

    try {
      const result = await uploadMutation.mutateAsync(file);
      const msg =
        result.reactivated > 0
          ? `Đã import ${result.imported} xe, kích hoạt lại ${result.reactivated} xe.`
          : `Đã import ${result.imported} xe.`;
      onSuccess(msg);
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as {
          response?: {
            data?: { data?: { errors?: VehicleUploadError[] }; message?: string };
            status?: number;
          };
        };
        if (e.response?.status === 422 && e.response.data?.data?.errors) {
          setServerErrors(e.response.data.data.errors);
          return;
        }
        onError(e.response?.data?.message || 'Lỗi upload. Vui lòng thử lại.');
        handleClose();
      } else {
        onError('Lỗi kết nối. Vui lòng thử lại.');
        handleClose();
      }
    }
  };

  const allErrors = serverErrors.length > 0 ? serverErrors : clientErrors;
  const hasErrors = allErrors.length > 0;
  const validCount = parsedRows.length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Excel — Danh mục xe" size="lg">
      <div className="space-y-4">
        {/* Info */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 space-y-1">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">
            File Excel cần có sheet <span className="font-mono">xe</span> với 2 cột:
          </p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>
              <span className="font-medium">MA</span> — Mã tài xế
            </li>
            <li>
              <span className="font-medium">SỐ XE</span> — Biển số (định dạng XXY-XXXXX)
            </li>
          </ul>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-neutral-500 dark:border-neutral-400 bg-neutral-50 dark:bg-neutral-800/50'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
          }`}
        >
          <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Kéo thả file .xlsx vào đây
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            hoặc click để chọn file
          </p>
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

        {/* Selected file + preview */}
        {file && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">
                {file.name}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                {validCount} xe hợp lệ
              </span>
              {hasErrors && (
                <span className="text-xs text-red-500 dark:text-red-400 shrink-0">
                  {allErrors.length} lỗi
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setParsedRows([]);
                  setClientErrors([]);
                  setServerErrors([]);
                }}
                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {validCount > 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 px-1 space-y-0.5">
                <p className="font-medium">
                  Xem trước ({Math.min(3, validCount)} dòng đầu):
                </p>
                {parsedRows.slice(0, 3).map((r, i) => (
                  <p key={i}>
                    • {r.driver_name} — {r.normalized}
                  </p>
                ))}
                {validCount > 3 && (
                  <p className="text-neutral-400 dark:text-neutral-500">
                    ...và {validCount - 3} dòng khác
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* File error */}
        {fileError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>
          </div>
        )}

        {/* Errors table */}
        {hasErrors && (
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Có {allErrors.length} lỗi — không có dữ liệu nào được lưu:
            </p>
            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-red-900/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">
                      Dòng
                    </th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">
                      Tài xế
                    </th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">
                      Biển số gốc
                    </th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">
                      Lý do
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allErrors.map((err, i) => (
                    <tr
                      key={i}
                      className="border-t border-red-100 dark:border-red-900/40"
                    >
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                        {err.row}
                      </td>
                      <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                        {err.driver_name}
                      </td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 font-mono text-xs">
                        {err.plate_number}
                      </td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">
                        {err.reason}
                      </td>
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
            disabled={!file || validCount === 0 || hasErrors}
            onClick={handleUpload}
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
