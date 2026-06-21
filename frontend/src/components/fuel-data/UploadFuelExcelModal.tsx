import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUploadFuelExcel } from '../../hooks/useFuelRecords';
import type { UploadError } from '../../types/fuelRecord';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function UploadFuelExcelModal({ isOpen, onClose, onSuccess, onError }: Props) {
  const uploadMutation = useUploadFuelExcel();
  const [file, setFile] = useState<File | null>(null);
  const [serverErrors, setServerErrors] = useState<UploadError[]>([]);
  const [fileError, setFileError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setServerErrors([]);
    setFileError('');
    onClose();
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      setFileError('Chỉ chấp nhận file .xlsx');
      setFile(null);
      return;
    }
    setFileError('');
    setServerErrors([]);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setFileError('');
    setServerErrors([]);

    try {
      const result = await uploadMutation.mutateAsync(file);
      if (result.errors > 0 && result.imported === 0) {
        setServerErrors(result.details || []);
        return;
      }
      const msg = result.errors > 0
        ? `Đã import ${result.imported} bản ghi, ${result.errors} lỗi`
        : `Đã import ${result.imported} bản ghi`;
      onSuccess(msg);
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as {
          response?: { data?: { data?: { details?: UploadError[] }; message?: string }; status?: number };
        };
        if (e.response?.status === 422 && e.response.data?.data?.details) {
          setServerErrors(e.response.data.data.details);
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Excel — Dữ liệu dầu" size="lg">
      <div className="space-y-4">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 space-y-1">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">
            File Excel cần có sheet theo tháng với các cột:
          </p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li><span className="font-medium">NGÀY</span> — Ngày đổ dầu</li>
            <li><span className="font-medium">SỐ XE</span> — Biển số xe</li>
            <li><span className="font-medium">SỐ KM CŨ / KM ĐỔ</span> — Odometer</li>
            <li><span className="font-medium">LÍT</span> — Số lít đã đổ</li>
            <li><span className="font-medium">ĐƠN GIÁ / THÀNH TIỀN</span></li>
            <li><span className="font-medium">định vị</span> — GPS (tùy chọn)</li>
          </ul>
          <p className="text-neutral-500 mt-1">
            Dữ liệu tháng cũ sẽ bị thay thế khi upload lại.
          </p>
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
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setServerErrors([]); }}
              className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {fileError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>
          </div>
        )}

        {serverErrors.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Có {serverErrors.length} lỗi:
            </p>
            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-red-900/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Dòng</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Biển số</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {serverErrors.map((err, i) => (
                    <tr key={i} className="border-t border-red-100 dark:border-red-900/40">
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{err.row}</td>
                      <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 font-mono text-xs">{err.plate_number}</td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
          <Button type="button" isLoading={uploadMutation.isPending} disabled={!file} onClick={handleUpload}>
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
