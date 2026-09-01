import { useState } from 'react';
import { FileText, X, ZoomIn } from 'lucide-react';
import type { DocumentFile } from '../../api/invoiceTrackingApi';

interface DocumentPreviewProps {
  documents: DocumentFile[];
}

export function DocumentPreview({ documents }: DocumentPreviewProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);

  if (documents.length === 0) {
    return <p className="text-xs sm:text-sm text-neutral-500 italic py-2">Chưa có chứng từ đính kèm</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {documents.map((doc, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedDoc(doc)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100/70 transition hover:border-primary hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {doc.mime_type.startsWith('image/') ? (
              <>
                <img
                  src={`data:${doc.mime_type};base64,${doc.file_data}`}
                  alt={doc.file_name}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                <FileText className="h-7 w-7 text-neutral-400 group-hover:text-primary transition-colors" />
                <span className="line-clamp-2 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                  {doc.file_name}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[95vw] sm:max-w-[90vw] overflow-hidden rounded-xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px] sm:max-w-md">
                {selectedDoc.file_name}
              </span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-2 sm:p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              {selectedDoc.mime_type.startsWith('image/') ? (
                <img
                  src={`data:${selectedDoc.mime_type};base64,${selectedDoc.file_data}`}
                  alt={selectedDoc.file_name}
                  className="max-h-[75vh] w-auto object-contain rounded"
                />
              ) : (
                <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 text-center">
                  <FileText className="h-16 w-16 text-neutral-400" />
                  <p className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {selectedDoc.file_name}
                  </p>
                  <p className="text-xs text-neutral-400">Xem trực tiếp PDF không hỗ trợ trong chế độ xem nhanh</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
