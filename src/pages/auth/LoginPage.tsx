import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { message?: string } } };
          const message = err.response?.data?.message || t('auth.errors.invalidCredentials');
          toast.error(message);
        },
      }
    );
  };

  return (
    <AuthLayout>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">{t('auth.login.title')}</CardTitle>
          <CardDescription className="text-base">{t('auth.login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                {t('auth.login.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={login.isPending}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">
                {t('auth.login.password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={login.isPending}
                className="h-11 text-base"
              />
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-base text-primary hover:underline font-medium transition-colors"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={login.isPending}
            >
              {login.isPending ? t('common.loading') : t('auth.login.submit')}
            </Button>

            <p className="text-base text-muted-foreground text-center">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t('auth.login.registerLink')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
