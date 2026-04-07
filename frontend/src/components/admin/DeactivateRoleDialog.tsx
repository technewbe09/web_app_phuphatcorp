import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToggleRole, useRoleUsers } from '../../hooks/useRoles';
import { useI18n } from '../../i18n/useI18n';
import { AlertTriangle } from 'lucide-react';
import type { Role } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
}

export function DeactivateRoleDialog({ isOpen, onClose, role }: Props) {
  const { t } = useI18n();
  const toggleRole = useToggleRole();
  const [serverError, setServerError] = useState('');

  const { data: usersData, isLoading: isLoadingUsers } = useRoleUsers(
    isOpen && role ? role.id : null,
  );
  const affectedUsers = usersData?.total ?? 0;

  useEffect(() => {
    if (!isOpen) setServerError('');
  }, [isOpen]);

  // If 0 users, auto-deactivate when dialog opens without showing confirm
  useEffect(() => {
    if (isOpen && role && !isLoadingUsers && affectedUsers === 0) {
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoadingUsers, affectedUsers]);

  const handleConfirm = async () => {
    if (!role) return;
    setServerError('');
    try {
      await toggleRole.mutateAsync({ id: role.id, is_active: false });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e.response?.data?.message || t('messages.error'));
    }
  };

  if (!role) return null;

  // Don't show dialog while counting users (auto-deactivate case)
  if (isLoadingUsers || (!isLoadingUsers && affectedUsers === 0)) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('roles.deactivateConfirmTitle')}
      size="sm"
    >
      <div className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {serverError}
          </div>
        )}

        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('roles.deactivateConfirmWithUsers', { name: role.name, count: affectedUsers })}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('roles.deactivateConfirmWarning')}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('createUser.cancel')}
          </Button>
          <Button
            variant="danger"
            isLoading={toggleRole.isPending}
            onClick={handleConfirm}
          >
            {t('roles.deactivateConfirmButton', { count: affectedUsers })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
