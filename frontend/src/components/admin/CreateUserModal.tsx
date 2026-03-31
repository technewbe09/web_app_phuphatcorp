import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useCreateUser } from '../../hooks/useUsers';
import { useI18n } from '../../i18n/useI18n';
import { UserRole } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const schema = yup.object({
  full_name: yup.string().required('validation.required'),
  email: yup.string().required('validation.required').email('validation.email'),
  password: yup.string().required('validation.required').min(6, 'validation.minLength'),
  role: yup.string().required('validation.required'),
});

type FormData = yup.InferType<typeof schema>;

const roleOptions = [
  { value: UserRole.VIEWER, label: 'users.roles.VIEWER' },
  { value: UserRole.ACCOUNTANT, label: 'users.roles.ACCOUNTANT' },
  { value: UserRole.ADMIN, label: 'users.roles.ADMIN' },
];

export function CreateUserModal({ isOpen, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const createUser = useCreateUser();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { role: UserRole.VIEWER },
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await createUser.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('createUser.title')} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Input
          label={t('createUser.fullName')}
          error={errors.full_name?.message ? t(errors.full_name.message) : undefined}
          {...register('full_name')}
        />

        <Input
          label={t('createUser.email')}
          type="email"
          error={errors.email?.message ? t(errors.email.message) : undefined}
          {...register('email')}
        />

        <Input
          label={t('createUser.password')}
          type="password"
          error={errors.password?.message ? t(errors.password.message, { min: 6 }) : undefined}
          {...register('password')}
        />

        <Select
          label={t('createUser.role')}
          options={roleOptions}
          error={errors.role?.message ? t(errors.role.message) : undefined}
          {...register('role')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('createUser.cancel')}
          </Button>
          <Button type="submit" isLoading={createUser.isPending}>
            {t('createUser.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
