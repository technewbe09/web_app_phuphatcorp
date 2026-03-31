import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useResetPassword } from '../../hooks/useUsers';
import { useI18n } from '../../i18n/useI18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
  onSuccess?: () => void;
}

const schema = yup.object({
  new_password: yup.string().required('validation.required').min(6, 'validation.minLength'),
  confirm_password: yup
    .string()
    .required('validation.required')
    .oneOf([yup.ref('new_password')], 'validation.passwordMatch'),
});

type FormData = yup.InferType<typeof schema>;

export function ResetPasswordModal({ isOpen, onClose, userId, userName, onSuccess }: Props) {
  const { t } = useI18n();
  const resetPassword = useResetPassword();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!userId) return;
    setServerError('');
    setSuccess('');
    try {
      await resetPassword.mutateAsync({ id: userId, new_password: data.new_password });
      setSuccess(t('resetPassword.success'));
      reset();
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
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
    setSuccess('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('resetPassword.title')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        <p className="text-sm text-neutral-600">
          Đặt lại mật khẩu cho <strong>{userName}</strong>
        </p>

        <Input
          label={t('resetPassword.newPassword')}
          type="password"
          error={errors.new_password?.message ? t(errors.new_password.message, { min: 6 }) : undefined}
          {...register('new_password')}
        />

        <Input
          label={t('resetPassword.confirmPassword')}
          type="password"
          error={errors.confirm_password?.message ? t(errors.confirm_password.message) : undefined}
          {...register('confirm_password')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('resetPassword.cancel')}
          </Button>
          <Button type="submit" isLoading={resetPassword.isPending}>
            {t('resetPassword.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
