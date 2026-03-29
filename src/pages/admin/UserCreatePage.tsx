import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useCreateUser } from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserRole, AccountStatus } from '@/types';

const roles: UserRole[] = ['admin', 'manager', 'staff', 'viewer'];

export default function UserCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createUser = useCreateUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('common.required');
    if (!email.trim()) newErrors.email = t('common.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('common.invalidEmail');
    if (!password) newErrors.password = t('common.required');
    else if (password.length < 8) newErrors.password = t('common.passwordMinLength');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createUser.mutate(
      { name, email, password, role },
      {
        onSuccess: () => {
          toast.success(t('common.createSuccess'));
          navigate('/admin/users');
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(err.response?.data?.message || t('common.error'));
        },
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.users.createTitle')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t('admin.users.form.nameLabel')}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t('admin.users.form.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createUser.isPending}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('admin.users.form.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('admin.users.form.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={createUser.isPending}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('admin.users.form.passwordLabel')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('admin.users.form.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={createUser.isPending}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('admin.users.form.roleLabel')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`admin.users.roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('admin.users.form.statusLabel')}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('admin.users.statuses.active')}</SelectItem>
                <SelectItem value="inactive">{t('admin.users.statuses.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/users')}
              disabled={createUser.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? t('common.loading') : t('admin.users.form.submitCreate')}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
