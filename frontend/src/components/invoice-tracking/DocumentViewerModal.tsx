import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type DocumentFile, invoiceTrackingApi } from '../../api/invoiceTrackingApi';
import { useI18n } from '../../i18n/useI18n';

interface DocumentViewerModalProps {
  document: DocumentFile | null;
  documents?: DocumentFile[];
  onClose: () => void;
  onNavigate?: (doc: DocumentFile) => void;
}

export function DocumentViewerModal({
  document: doc,
  documents = [],
  onClose,
  onNavigate,
}: DocumentViewerModalProps) {
  const { t } = useI18n();
  const isImage = !!doc?.mime_type?.startsWith('image/');
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.25;

  const currentIndex =
    doc && documents.length > 0
      ? documents.findIndex(
          (d) =>
            (d.filename && d.filename === doc.filename) ||
            (d.original_filename && d.original_filename === doc.original_filename) ||
            (d.file_name && d.file_name === doc.file_name),
        )
      : -1;

  const hasMultiple = documents.length > 1 && currentIndex >= 0;
  const hasPrev = hasMultiple && currentIndex > 0;
  const hasNext = hasMultiple && currentIndex < documents.length - 1;

  // Reset rotation and zoom when switching documents
  useEffect(() => {
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, [doc?.filename, doc?.original_filename, doc?.file_name]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(documents[currentIndex - 1]);
    }
  }, [hasPrev, onNavigate, documents, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(documents[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, documents, currentIndex]);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  const handleResetRotation = useCallback(() => {
    setRotation(0);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!isImage) return;
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isImage, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle Keyboard navigation (ESC, ArrowLeft, ArrowRight, R/L for rotate, +/-/0 for zoom)
  useEffect(() => {
    if (!doc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (isImage && (e.key === 'r' || e.key === 'R')) {
        handleRotateRight();
      } else if (isImage && (e.key === 'l' || e.key === 'L')) {
        handleRotateLeft();
      } else if (isImage && (e.key === '=' || e.key === '+')) {
        handleZoomIn();
      } else if (isImage && (e.key === '-' || e.key === '_')) {
        handleZoomOut();
      } else if (isImage && e.key === '0') {
        handleResetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, onClose, handlePrev, handleNext, isImage, handleRotateRight, handleRotateLeft, handleZoomIn, handleZoomOut, handleResetZoom]);

  if (!doc) return null;

  const fileName = doc.original_filename || doc.file_name || 'Chứng từ';
  const fileUrl = doc.filename ? `/api/invoice-tracking/files/${doc.filename}` : null;

  const handleDownload = () => {
    invoiceTrackingApi.downloadDocumentFile(doc, fileName);
  };

  const handleOpenPdfTab = () => {
    if (doc.filename) {
      window.open(`/api/invoice-tracking/files/${doc.filename}`, '_blank');
    } else if (doc.file_data) {
      try {
        const byteCharacters = atob(doc.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: doc.mime_type });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (e) {
        console.error('Failed to open PDF tab:', e);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem chứng từ"
    >
      <div
        className="relative max-h-[92vh] max-w-[95vw] sm:max-w-[90vw] overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:px-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 truncate max-w-[180px] sm:max-w-md">
            {hasMultiple && (
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono font-semibold text-neutral-600 dark:text-neutral-300 shrink-0">
                {currentIndex + 1} / {documents.length}
              </span>
            )}
            <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {fileName}
            </span>
            {doc.source_plate_number && (
              <span className="px-2 py-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] font-medium shrink-0 flex items-center gap-1">
                <Copy className="w-2.5 h-2.5 text-sky-400" />
                <span>Từ xe {doc.source_plate_number}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Image Rotation Controls */}
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  title={t('invoice_tracking.viewer.rotateLeft' as never) || 'Xoay trái 90° (L)'}
                  aria-label="Xoay trái 90°"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  title={t('invoice_tracking.viewer.rotateRight' as never) || 'Xoay phải 90° (R)'}
                  aria-label="Xoay phải 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                {rotation !== 0 && (
                  <button
                    type="button"
                    onClick={handleResetRotation}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-mono font-medium transition cursor-pointer"
                    title={t('invoice_tracking.viewer.resetRotation' as never) || 'Đặt lại góc xoay ban đầu (0°)'}
                    aria-label="Đặt lại góc xoay"
                  >
                    {rotation}°
                  </button>
                )}

                {/* Zoom In / Zoom Out Controls */}
                <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={t('invoice_tracking.viewer.zoomOut' as never) || 'Thu nhỏ (-)'}
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={t('invoice_tracking.viewer.zoomIn' as never) || 'Phóng to (+)'}
                  aria-label="Phóng to"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {zoom !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-mono font-medium transition cursor-pointer"
                    title={t('invoice_tracking.viewer.resetZoom' as never) || 'Đặt lại thu phóng (100%)'}
                    aria-label="Đặt lại thu phóng"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                )}
              </>
            )}

            {doc.mime_type === 'application/pdf' && (
              <button
                type="button"
                onClick={handleOpenPdfTab}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                title="Mở trong tab mới"
                aria-label="Mở PDF trong tab mới"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Tải về máy"
              aria-label="Tải về máy"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer with Navigation arrows */}
        <div className="relative p-2 sm:p-4 flex items-center justify-center overflow-auto max-h-[80vh] min-h-[220px]">
          {/* Back Button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`absolute left-2 sm:left-4 z-10 p-2 sm:p-2.5 rounded-full bg-black/60 text-white shadow-lg backdrop-blur-xs transition-all ${
                hasPrev
                  ? 'hover:bg-black/80 hover:scale-105 cursor-pointer opacity-85 hover:opacity-100'
                  : 'opacity-20 cursor-not-allowed'
              }`}
              title="Hình trước (←)"
              aria-label="Hình trước"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Media Rendering */}
          <div className="flex items-center justify-center w-full h-full px-8 sm:px-12">
            {isImage && (fileUrl || doc.file_data) ? (
              <img
                src={fileUrl || `data:${doc.mime_type};base64,${doc.file_data}`}
                alt={fileName}
                draggable={false}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
                className={`max-h-[75vh] w-auto max-w-full object-contain rounded-lg select-none ${
                  isDragging ? 'transition-none' : 'transition-transform duration-200 ease-in-out'
                }`}
              />
            ) : (
              <div className="flex h-56 w-72 flex-col items-center justify-center gap-3 text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-full">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">Định dạng {doc.mime_type || 'Tài liệu'}</p>
                </div>
                {doc.mime_type === 'application/pdf' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleOpenPdfTab}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Mở trong tab mới
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className={`absolute right-2 sm:right-4 z-10 p-2 sm:p-2.5 rounded-full bg-black/60 text-white shadow-lg backdrop-blur-xs transition-all ${
                hasNext
                  ? 'hover:bg-black/80 hover:scale-105 cursor-pointer opacity-85 hover:opacity-100'
                  : 'opacity-20 cursor-not-allowed'
              }`}
              title="Hình tiếp theo (→)"
              aria-label="Hình tiếp theo"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
