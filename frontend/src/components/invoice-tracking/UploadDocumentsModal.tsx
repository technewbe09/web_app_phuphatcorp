import { useState, useRef } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface FileItem {
  file: File;
  preview?: string;
  error?: string;
}

interface UploadDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (files: File[], note: string) => void;
  isLoading?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;

export function UploadDocumentsModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: UploadDocumentsModalProps) {
  const { t } = useI18n();
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [note, setNote] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): FileItem[] => {
    return files.map((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { file, error: t('invoice_tracking.upload.errorType') };
      }
      if (file.size > MAX_SIZE) {
        return { file, error: t('invoice_tracking.upload.errorSize') };
      }
      return { file };
    });
  };

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const totalFiles = fileItems.length + fileArray.length;

    if (totalFiles > MAX_FILES) {
      setFileItems((prev) => [
        ...prev,
        { file: fileArray[0], error: t('invoice_tracking.upload.errorCount') },
      ]);
      return;
    }

    const validated = validateFiles(fileArray);
    setFileItems((prev) => [...prev, ...validated]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = (index: number) => {
    setFileItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const validFiles = fileItems.filter((f) => !f.error).map((f) => f.file);
    if (validFiles.length === 0) return;
    onSubmit(validFiles, note);
    setFileItems([]);
    setNote('');
  };

  const handleClose = () => {
    setFileItems([]);
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('invoice_tracking.upload.title')} size="md">
      <div className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-5 sm:p-7 text-center transition ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-neutral-300 hover:border-primary dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          }`}
        >
          <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-neutral-400" />
          <p className="mt-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('invoice_tracking.upload.dropzone')}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-neutral-500">{t('invoice_tracking.upload.supported')}</p>
          <p className="text-[11px] sm:text-xs text-neutral-400">{t('invoice_tracking.upload.max')}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {fileItems.length > 0 && (
          <div className="max-h-40 sm:max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {fileItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-800/40"
              >
                <span className="flex-1 truncate text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.file.name}</span>
                <span className="text-[11px] text-neutral-400 shrink-0">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {item.error ? (
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" title={item.error} />
                ) : (
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-neutral-400 hover:text-red-500 rounded transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('invoice_tracking.upload.noteLabel')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('invoice_tracking.upload.notePlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto h-11 sm:h-10"
          >
            {t('invoice_tracking.action.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={fileItems.filter((f) => !f.error).length === 0}
            className="w-full sm:w-auto h-11 sm:h-10"
          >
            {t('invoice_tracking.upload.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
