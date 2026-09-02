import { useState } from 'react';
import { FileText, ZoomIn } from 'lucide-react';
import type { DocumentFile } from '../../api/invoiceTrackingApi';
import { DocumentViewerModal } from './DocumentViewerModal';

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
        {documents.map((doc, idx) => {
          const isImage = doc.mime_type.startsWith('image/');
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDoc(doc)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100/70 transition hover:border-primary hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
            >
              {isImage ? (
                <>
                  <img
                    src={`data:${doc.mime_type};base64,${doc.file_data}`}
                    alt={doc.file_name}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <FileText className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="line-clamp-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    {doc.file_name}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <DocumentViewerModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </>
  );
}
