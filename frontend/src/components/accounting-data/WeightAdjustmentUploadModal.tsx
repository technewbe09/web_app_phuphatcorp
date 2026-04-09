import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUploadWeightAdjustments } from '../../hooks/useWeightAdjustments';
import type { UploadWeightAdjustmentRow, WeightAdjustmentUploadError } from '../../api/weightAdjustmentApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function generateTemplate(): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Mã hàng hóa', 'Tên hàng hóa', 'Giá trị cũ', 'Giá trị điều chỉnh']]);
  XLSX.utils.book_append_sheet(wb, ws, 'DieuChinhTrongLuong');
  XLSX.writeFile(wb, 'template_dieu_chinh_trong_luong.xlsx');
}

export function WeightAdjustmentUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const uploadMutation = useUploadWeightAdjustments();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<UploadWeightAdjustmentRow[]>([]);
  const [fileError, setFileError] = useState('');
  const [uploadErrors, setUploadErrors] = useState<WeightAdjustmentUploadError[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setFileError('');
    setUploadErrors([]);
    onClose();
  };

  const parseExcel = (f: File): Promise<UploadWeightAdjustmentRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

          const parsed: UploadWeightAdjustmentRow[] = rawRows
            .filter((row) => {
              const ma = String(row['Mã hàng hóa'] ?? '').trim();
              return ma !== '' && ma !== 'null';
            })
            .map((row) => ({
              ma_hang: String(row['Mã hàng hóa'] ?? '').trim(),
              ten_hang: String(row['Tên hàng hóa'] ?? '').trim(),
              gia_tri_cu: row['Giá trị cũ'] != null && row['Giá trị cũ'] !== '' ? Number(row['Giá trị cũ']) : null,
              gia_tri_dieu_chinh: Number(row['Giá trị điều chỉnh'] ?? 0),
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
        setFileError('File không có dữ liệu hợp lệ. Kiểm tra cột "Mã hàng hóa".');
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
      onSuccess(`Đã import ${result.inserted} bản ghi.`);
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { data?: { errors?: WeightAdjustmentUploadError[] }; message?: string }; status?: number } };
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Excel — Điều chỉnh trọng lượng" size="lg">
      <div className="space-y-4">
        {/* Drop zone */}
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

        {/* Selected file + preview */}
        {file && (
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">{file.name}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">{parsedRows.length} bản ghi</span>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setParsedRows([]); setUploadErrors([]); }}
              className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File error */}
        {fileError && (
          <p className="text-sm text-red-500 dark:text-red-400">{fileError}</p>
        )}

        {/* Template download */}
        <button
          type="button"
          onClick={generateTemplate}
          className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline"
        >
          Tải file mẫu
        </button>

        {/* Upload errors table */}
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
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Mã hàng</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadErrors.map((err, i) => (
                    <tr key={i} className="border-t border-red-100 dark:border-red-900/40">
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{err.row}</td>
                      <td className="px-3 py-2 font-mono text-neutral-800 dark:text-neutral-200">{err.ma_hang}</td>
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
