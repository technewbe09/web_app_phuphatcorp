import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDeleteUser } from '../../hooks/useUsers';
import { useI18n } from '../../i18n/useI18n';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
  onSuccess?: () => void;
}

export function DeleteConfirmDialog({ isOpen, onClose, userId, userName, onSuccess }: Props) {
  const { t } = useI18n();
  const deleteUser = useDeleteUser();
  const [serverError, setServerError] = useState('');

  const handleConfirm = async () => {
    if (!userId) return;
    setServerError('');
    try {
      await deleteUser.mutateAsync(userId);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string } } };
        setServerError(e.response?.data?.message || t('messages.error'));
      } else {
        setServerError(t('messages.error'));
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('deleteUser.title')} size="sm">
      <div className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-neutral-700">
            {t('deleteUser.confirm', { name: userName })}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('deleteUser.cancel')}
          </Button>
          <Button variant="danger" isLoading={deleteUser.isPending} onClick={handleConfirm}>
            {t('deleteUser.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
