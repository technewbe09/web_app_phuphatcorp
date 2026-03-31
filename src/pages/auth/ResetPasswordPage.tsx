import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetPassword = useMutation({
    mutationFn: (newPassword: string) => authApi.resetPassword({ token, newPassword }),
    onSuccess: () => {
      toast.success(t('auth.resetPassword.successMessage'));
      navigate('/login');
    },
    onError: () => {
      toast.error(t('auth.resetPassword.invalidToken'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('common.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('common.passwordMinLength'));
      return;
    }
    resetPassword.mutate(newPassword);
  };

  if (!token) {
    return (
      <AuthLayout>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{t('auth.resetPassword.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-destructive">{t('auth.resetPassword.invalidToken')}</p>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">{t('auth.resetPassword.title')}</CardTitle>
          <CardDescription className="text-base">{t('auth.resetPassword.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-base font-medium">
                {t('auth.resetPassword.newPassword')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={resetPassword.isPending}
                className="h-11 text-base"
              />
              <p className="text-sm text-muted-foreground">{t('auth.resetPassword.passwordHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-medium">
                {t('auth.resetPassword.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={resetPassword.isPending}
                className="h-11 text-base"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">{t('common.passwordMismatch')}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium bg-green-500 hover:bg-green-600 text-white"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? t('common.loading') : t('auth.resetPassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
