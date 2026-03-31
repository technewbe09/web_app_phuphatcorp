import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const forgotPassword = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword({ email }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  return (
    <AuthLayout>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">{t('auth.forgotPassword.title')}</CardTitle>
          <CardDescription className="text-base">{t('auth.forgotPassword.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-base text-muted-foreground">
                {t('auth.forgotPassword.successMessage')}
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full h-11 text-base">
                  {t('auth.forgotPassword.backToLogin')}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">
                  {t('auth.forgotPassword.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={forgotPassword.isPending}
                  className="h-11 text-base"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium bg-green-500 hover:bg-green-600 text-white"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? t('common.loading') : t('auth.forgotPassword.submit')}
              </Button>
              <p className="text-base text-muted-foreground text-center">
                <Link to="/login" className="text-green-600 font-semibold hover:underline">
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
