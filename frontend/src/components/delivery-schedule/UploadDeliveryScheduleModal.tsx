import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import dayjs from 'dayjs';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { deliveryScheduleApi, type UploadError } from '../../api/deliveryScheduleApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const DELIVERY_SCHEDULE_QUERY_KEY = ['delivery-schedules'];

export function UploadDeliveryScheduleModal({ isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [fileError, setFileError] = useState('');
  const [dateError, setDateError] = useState('');
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => deliveryScheduleApi.upload(formData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_SCHEDULE_QUERY_KEY });
      onSuccess(`Upload thành công: ${result.total_rows_inserted} dòng dữ liệu`);
      handleClose();
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const e = error as { response?: { data?: { details?: UploadError[]; message?: string } } };
        if (e.response?.data?.details && Array.isArray(e.response.data.details)) {
          setUploadErrors(e.response.data.details);
          modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setFileError(e.response?.data?.message || 'Upload thất bại. Vui lòng thử lại.');
      } else {
        setFileError('Lỗi kết nối. Vui lòng thử lại.');
      }
    },
  });

  const handleClose = () => {
    setFile(null);
    setFileError('');
    setDateError('');
    setUploadErrors([]);
    onClose();
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: { errors: { code: string }[] }[]) => {
    setUploadErrors([]);
    setFileError('');
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      if (err.code === 'file-too-large') {
        setFileError('File quá lớn (tối đa 10MB)');
      } else {
        setFileError('Chỉ chấp nhận file .xlsx');
      }
      setFile(null);
    } else if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const validate = (): boolean => {
    setDateError('');
    setFileError('');
    if (!file) {
      setFileError('Vui lòng chọn file Excel');
      return false;
    }
    if (!fromDate) {
      setDateError('Từ ngày là bắt buộc');
      return false;
    }
    if (!toDate) {
      setDateError('Đến ngày là bắt buộc');
      return false;
    }
    if (fromDate > toDate) {
      setDateError('Từ ngày phải <= Đến ngày');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const formData = new FormData();
    formData.append('file', file!);
    formData.append('from_date', fromDate);
    formData.append('to_date', toDate);
    uploadMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Lịch đi hàng" size="lg">
      <div ref={modalRef} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Upload errors */}
        {uploadErrors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Có {uploadErrors.length} lỗi trong dữ liệu — không có dòng nào được lưu:
              </p>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Sheet</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Dòng</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Ngày</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Cột</th>
                    <th className="px-3 py-2 text-left text-red-700 dark:text-red-400 font-medium">Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadErrors.map((err, i) => (
                    <tr key={i} className="border-t border-red-100 dark:border-red-900/40">
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 font-mono text-xs">{err.sheet}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{err.row}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{err.ngay}</td>
                      <td className="px-3 py-2 font-mono text-neutral-800 dark:text-neutral-200 text-xs">{err.field}</td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Từ ngày
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDateError(''); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Đến ngày
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDateError(''); }}
            />
          </div>
        </div>
        {dateError && (
          <p className="text-sm text-red-500 dark:text-red-400 -mt-2">{dateError}</p>
        )}

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-neutral-500 dark:border-neutral-400 bg-neutral-50 dark:bg-neutral-800/50'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Kéo thả file .xlsx vào đây</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">hoặc click để chọn file (tối đa 10MB)</p>
        </div>

        {/* Selected file */}
        {file && (
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">{file.name}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
              {(file.size / 1024).toFixed(0)} KB
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setFileError(''); setUploadErrors([]); }}
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="button"
            isLoading={uploadMutation.isPending}
            disabled={!file}
            onClick={handleSubmit}
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
