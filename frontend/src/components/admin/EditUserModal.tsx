import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useUpdateUser } from '../../hooks/useUsers';
import { useI18n } from '../../i18n/useI18n';
import { UserRole } from '../../types/user';
import type { UserPublic } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserPublic | null;
  onSuccess?: () => void;
}

const schema = yup.object({
  full_name: yup.string().required('validation.required'),
  role: yup.string().required('validation.required'),
  is_active: yup.boolean().required(),
});

type FormData = yup.InferType<typeof schema>;

const roleOptions = [
  { value: UserRole.VIEWER, label: 'users.roles.VIEWER' },
  { value: UserRole.ACCOUNTANT, label: 'users.roles.ACCOUNTANT' },
  { value: UserRole.ADMIN, label: 'users.roles.ADMIN' },
];

export function EditUserModal({ isOpen, onClose, user, onSuccess }: Props) {
  const { t } = useI18n();
  const updateUser = useUpdateUser();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      full_name: user?.full_name || '',
      role: user?.role || UserRole.VIEWER,
      is_active: true,
    },
  });

  // Reset form when user changes
  useState(() => {
    if (user) {
      reset({
        full_name: user.full_name,
        role: user.role,
        is_active: true,
      });
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setServerError('');
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
        },
      });
      reset();
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

  const handleClose = () => {
    reset();
    setServerError('');
    onClose();
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('editUser.title')} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Input
          label={t('editUser.fullName')}
          error={errors.full_name?.message ? t(errors.full_name.message) : undefined}
          {...register('full_name')}
        />

        <Input
          label={t('editUser.email')}
          value={user.email}
          disabled
        />

        <Select
          label={t('editUser.role')}
          options={roleOptions}
          error={errors.role?.message ? t(errors.role.message) : undefined}
          {...register('role')}
        />

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-neutral-700">
            {t('editUser.status')}
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              {...register('is_active')}
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-800"></div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('editUser.cancel')}
          </Button>
          <Button type="submit" isLoading={updateUser.isPending}>
            {t('editUser.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
