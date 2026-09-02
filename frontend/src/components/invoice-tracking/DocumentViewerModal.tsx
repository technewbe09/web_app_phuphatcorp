import { useEffect } from 'react';
import { FileText, X, Download, ExternalLink } from 'lucide-react';
import type { DocumentFile } from '../../api/invoiceTrackingApi';

interface DocumentViewerModalProps {
  document: DocumentFile | null;
  onClose: () => void;
}

export function DocumentViewerModal({ document: doc, onClose }: DocumentViewerModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && doc) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, onClose]);

  if (!doc) return null;

  const handleDownload = () => {
    if (!doc.file_data) return;
    const link = document.createElement('a');
    link.href = `data:${doc.mime_type};base64,${doc.file_data}`;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPdfTab = () => {
    if (!doc.file_data) return;
    try {
      const byteCharacters = atob(doc.file_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.mime_type });
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
    } catch (e) {
      console.error('Failed to open PDF tab:', e);
    }
  };

  const isImage = doc.mime_type?.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] max-w-[95vw] sm:max-w-[90vw] overflow-hidden rounded-xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 sm:px-4 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px] sm:max-w-md">
            {doc.file_name}
          </span>
          <div className="flex items-center gap-1">
            {doc.mime_type === 'application/pdf' && doc.file_data && (
              <button
                type="button"
                onClick={handleOpenPdfTab}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                title="Mở trong tab mới"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            {doc.file_data && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                title="Tải về máy"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
          {isImage && doc.file_data ? (
            <img
              src={`data:${doc.mime_type};base64,${doc.file_data}`}
              alt={doc.file_name}
              className="max-h-[75vh] w-auto object-contain rounded"
            />
          ) : (
            <div className="flex h-56 w-72 flex-col items-center justify-center gap-3 text-center p-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-full">
                  {doc.file_name}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Định dạng {doc.mime_type || 'Tài liệu'}</p>
              </div>
              {doc.mime_type === 'application/pdf' && doc.file_data && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleOpenPdfTab}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở trong tab mới
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
