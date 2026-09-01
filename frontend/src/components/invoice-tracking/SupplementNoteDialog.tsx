import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SupplementNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
  isLoading?: boolean;
}

export function SupplementNoteDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: SupplementNoteDialogProps) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (note.trim().length < 5) {
      setError(t('invoice_tracking.supplement.noteRequired'));
      return;
    }
    onSubmit(note.trim());
    setNote('');
    setError('');
  };

  const handleClose = () => {
    setNote('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('invoice_tracking.supplement.title')} size="sm">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('invoice_tracking.supplement.noteLabel')}
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim().length >= 5) setError('');
            }}
            placeholder={t('invoice_tracking.supplement.notePlaceholder')}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          {error && <p className="mt-1.5 text-xs sm:text-sm text-red-500 font-medium">{error}</p>}
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
            variant="primary"
            className="w-full sm:w-auto h-11 sm:h-10"
          >
            {t('invoice_tracking.supplement.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
