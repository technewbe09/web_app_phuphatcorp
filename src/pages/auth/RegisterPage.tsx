import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import { useRegister } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 4) return 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 'weak';
  if (score === 3) return 'fair';
  if (score === 4) return 'good';
  return 'strong';
}

function PasswordStrengthIndicator({ strength }: { strength: PasswordStrength }) {
  const { t } = useTranslation();
  const labels: Record<PasswordStrength, string> = {
    weak: t('auth.passwordStrength.weak'),
    fair: t('auth.passwordStrength.fair'),
    good: t('auth.passwordStrength.good'),
    strong: t('auth.passwordStrength.strong'),
  };
  const colors: Record<PasswordStrength, string> = {
    weak: 'bg-destructive',
    fair: 'bg-warning',
    good: 'bg-info',
    strong: 'bg-primary',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {(['weak', 'fair', 'good', 'strong'] as PasswordStrength[]).map((level) => (
          <div
            key={level}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              ['weak', 'fair', 'good', 'strong'].indexOf(strength) >= ['weak', 'fair', 'good', 'strong'].indexOf(level)
                ? colors[strength]
                : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{labels[strength]}</p>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const register = useRegister();

  const passwordStrength = getPasswordStrength(password);
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('common.passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('common.passwordMinLength'));
      return;
    }
    register.mutate(
      { name, email, password },
      {
        onSuccess: () => {
          toast.success(t('auth.register.title'));
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { message?: string } } };
          const message = err.response?.data?.message || t('auth.errors.emailExists');
          toast.error(message);
        },
      }
    );
  };

  return (
    <AuthLayout>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">{t('auth.register.title')}</CardTitle>
          <CardDescription className="text-base">{t('auth.register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-medium">
                {t('auth.register.name')}
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t('admin.users.form.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={register.isPending}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                {t('auth.register.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={register.isPending}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">
                {t('auth.register.password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                required
                disabled={register.isPending}
                className="h-11 text-base"
              />
              {password && <PasswordStrengthIndicator strength={passwordStrength} />}
              <p className="text-sm text-muted-foreground">{t('auth.register.passwordHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-medium">
                {t('auth.register.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                required
                disabled={register.isPending}
                className="h-11 text-base"
              />
              {touched.confirmPassword && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">{t('common.passwordMismatch')}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={register.isPending}
            >
              {register.isPending ? t('common.loading') : t('auth.register.submit')}
            </Button>

            <p className="text-base text-muted-foreground text-center">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t('auth.register.loginLink')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
