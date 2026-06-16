import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUploadDriverInvoices } from '../../hooks/useDriverInvoices';
import { parseDriverInvoiceFile, type ParsedInvoiceRow } from '../../utils/parseDriverInvoiceFile';
import { DuplicateConfirmDialog } from './DuplicateConfirmDialog';
import type { DuplicateInfo } from '../../api/driverInvoiceApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function DriverInvoiceUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const uploadMutation = useUploadDriverInvoices();

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedInvoiceRow[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [fileError, setFileError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [newCount, setNewCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setTotalInvoices(0);
    setFileError('');
    setDuplicates([]);
    onClose();
  };

  const handleFile = async (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      setFileError('File không hợp lệ. Vui lòng chọn file .xlsx');
      return;
    }

    setFileError('');
    setDuplicates([]);
    setIsParsing(true);

    try {
      const result = await parseDriverInvoiceFile(f);
      if (result.rows.length === 0) {
        setFileError('File không chứa dữ liệu hóa đơn');
        setFile(null);
        return;
      }
      setFile(f);
      setParsedRows(result.rows);
      setTotalInvoices(result.totalInvoices);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đọc file';
      setFileError(msg);
      setFile(null);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
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

    try {
      const result = await uploadMutation.mutateAsync({
        rows: parsedRows.map((r) => ({
          ma: r.ma,
          ten_tx: r.ten_tx,
          ngay: r.ngay,
          so_xe: r.so_xe,
          noi_giao: r.noi_giao,
          ghi_chu: r.ghi_chu,
          so_hoa_don: r.so_hoa_don,
        })),
        originalFilename: file.name,
        skipDuplicates: false,
      });

      if (result.duplicates.length > 0) {
        const msg = result.duplicates.length > 0
          ? `Đã import ${result.inserted} bản ghi, bỏ qua ${result.duplicates.length} dòng trùng`
          : `Đã import ${result.inserted} bản ghi`;
        onSuccess(msg);
      } else {
        onSuccess(`Đã import ${result.inserted} bản ghi`);
      }
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { status?: number; data?: { data?: { duplicates?: DuplicateInfo[]; new_count?: number } } } };
        if (e.response?.status === 409 && e.response.data?.data?.duplicates) {
          setDuplicates(e.response.data.data.duplicates);
          setNewCount(e.response.data.data.new_count ?? 0);
          return;
        }
        setFileError('Lỗi upload. Vui lòng thử lại.');
      } else {
        setFileError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  const handleSkipDuplicates = async () => {
    if (!file || parsedRows.length === 0) return;
    setFileError('');

    try {
      const result = await uploadMutation.mutateAsync({
        rows: parsedRows.map((r) => ({
          ma: r.ma,
          ten_tx: r.ten_tx,
          ngay: r.ngay,
          so_xe: r.so_xe,
          noi_giao: r.noi_giao,
          ghi_chu: r.ghi_chu,
          so_hoa_don: r.so_hoa_don,
        })),
        originalFilename: file.name,
        skipDuplicates: true,
      });

      const msg = result.duplicates.length > 0
        ? `Đã import ${result.inserted} bản ghi, bỏ qua ${result.duplicates.length} dòng trùng`
        : `Đã import ${result.inserted} bản ghi`;
      onSuccess(msg);
      handleClose();
    } catch {
      setFileError('Lỗi kết nối. Vui lòng thử lại.');
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Tải lên hóa đơn từ tài xế" size="xl">
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

          {/* Parsing state */}
          {isParsing && (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin" />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Đang đọc file...</span>
            </div>
          )}

          {/* Selected file + preview */}
          {file && !isParsing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                  {parsedRows.length} dòng
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setParsedRows([]); }}
                  className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Tổng: <span className="font-medium text-neutral-900 dark:text-neutral-100">{parsedRows.length}</span> dòng
                </span>
                <span className="text-neutral-600 dark:text-neutral-400">
                  Hóa đơn: <span className="font-medium text-neutral-900 dark:text-neutral-100">{totalInvoices}</span> số
                </span>
              </div>

              {/* Preview table (10 dòng đầu) */}
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                  Xem trước ({Math.min(10, parsedRows.length)} dòng đầu):
                </p>
                <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">#</th>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">Mã</th>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">Tên TX</th>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">Ngày</th>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">Số xe</th>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">Nơi giao</th>
                        <th className="px-3 py-2 text-left text-neutral-500 dark:text-neutral-400 font-medium">HĐ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                          <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{row.ma}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{row.ten_tx}</td>
                          <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{row.ngay}</td>
                          <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{row.so_xe}</td>
                          <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 max-w-48 truncate" title={row.noi_giao}>
                            {row.noi_giao}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              [{row.so_hoa_don.length}]
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 10 && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                    Và {parsedRows.length - 10} dòng khác...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {fileError && (
            <p className="text-sm text-red-500 dark:text-red-400">{fileError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              isLoading={uploadMutation.isPending}
              disabled={!file || parsedRows.length === 0 || isParsing}
              onClick={handleUpload}
            >
              Xác nhận import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate confirm dialog */}
      {duplicates.length > 0 && (
        <DuplicateConfirmDialog
          duplicates={duplicates}
          newCount={newCount}
          onSkip={handleSkipDuplicates}
          onCancel={() => setDuplicates([])}
        />
      )}
    </>
  );
}
