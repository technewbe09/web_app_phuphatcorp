import { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useGetDriverDocuments, useUploadDocument, useDeleteDocument } from '../../hooks/useDriverDocuments';
import { driverApi } from '../../api/driverApi';
import type { Driver } from '../../api/driverApi';
import { formatDate } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DriverDocumentsModal({ isOpen, onClose, driver }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const driverId = driver?.id ?? null;
  const { data: docs, isLoading } = useGetDriverDocuments(isOpen ? driverId : null);
  const uploadDocument = useUploadDocument(driverId ?? 0);
  const deleteDocument = useDeleteDocument(driverId ?? 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    if (!file) return;
    setUploadError('');

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File không được vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        await uploadDocument.mutateAsync({
          file_name: file.name,
          mime_type: file.type || null,
          file_data: base64,
          file_size: file.size,
        });
      } catch {
        setUploadError('Upload thất bại. Vui lòng thử lại.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async (docId: number, fileName: string) => {
    if (!driverId) return;
    try {
      const doc = await driverApi.downloadDocument(driverId, docId);
      const byteCharacters = atob(doc.file_data);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: doc.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail — user can retry
    }
  };

  const handleDelete = async (docId: number) => {
    setDeletingId(docId);
    try {
      await deleteDocument.mutateAsync(docId);
    } finally {
      setDeletingId(null);
    }
  };

  const driverLabel = driver
    ? driver.ho_ten
      ? `${driver.ten_ky_hieu} — ${driver.ho_ten}`
      : driver.ten_ky_hieu
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tài liệu — ${driverLabel}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Upload button */}
        <div className="flex items-center justify-between">
          <div />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              isLoading={uploadDocument.isPending}
              onClick={() => {
                setUploadError('');
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload tài liệu
            </Button>
          </div>
        </div>

        {uploadError && (
          <p className="text-sm text-red-500 dark:text-red-400">{uploadError}</p>
        )}

        {/* Document list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : !docs || docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-neutral-400 dark:text-neutral-500">
            <FileText className="w-8 h-8" />
            <p className="text-sm">Chưa có tài liệu nào. Nhấn "Upload tài liệu" để thêm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left py-2 pr-3 font-medium text-neutral-500 dark:text-neutral-400">Tên file</th>
                  <th className="text-right py-2 pr-3 font-medium text-neutral-500 dark:text-neutral-400 w-24">Kích thước</th>
                  <th className="text-right py-2 pr-3 font-medium text-neutral-500 dark:text-neutral-400 w-28">Ngày upload</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="py-2 pr-3 text-neutral-900 dark:text-neutral-100 max-w-[14rem] truncate" title={doc.file_name}>
                      {doc.file_name}
                    </td>
                    <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleDownload(doc.id, doc.file_name)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                          title="Tải xuống"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
