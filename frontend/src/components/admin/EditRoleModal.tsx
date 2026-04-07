import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useUpdateRole } from '../../hooks/useRoles';
import { useI18n } from '../../i18n/useI18n';
import type { Role } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
}

interface FormData {
  name: string;
  description: string;
}

export function EditRoleModal({ isOpen, onClose, role }: Props) {
  const { t } = useI18n();
  const updateRole = useUpdateRole();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    if (role) {
      reset({ name: role.name, description: role.description || '' });
    }
  }, [role, reset]);

  const onSubmit = async (data: FormData) => {
    if (!role) return;
    setServerError('');
    try {
      await updateRole.mutateAsync({
        id: role.id,
        payload: { name: data.name, description: data.description || undefined },
      });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e.response?.data?.message || t('messages.error'));
    }
  };

  const handleClose = () => {
    setServerError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${t('roles.editRole')} — ${role?.name ?? ''}`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {serverError}
          </div>
        )}

        <Input
          label={t('roles.roleName') + ' *'}
          error={errors.name?.message}
          {...register('name', {
            required: t('roles.validation.nameRequired'),
            minLength: { value: 2, message: t('roles.validation.nameMinLength') },
            maxLength: { value: 100, message: t('roles.validation.nameMaxLength') },
          })}
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('roles.roleCode')} (readonly)
          </label>
          <div className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-sm font-mono text-neutral-500 dark:text-neutral-400">
            {role?.code || '—'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('roles.roleDescription')}
          </label>
          <textarea
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent text-sm resize-none"
            rows={3}
            {...register('description', {
              maxLength: { value: 500, message: t('roles.validation.descriptionMaxLength') },
            })}
          />
          {errors.description?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('createUser.cancel')}
          </Button>
          <Button type="submit" isLoading={updateRole.isPending}>
            {t('editUser.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
