import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useUserById, useUpdateUser, useDeleteUser } from '@/hooks/useAdminUsers';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { UserRole, AccountStatus } from '@/types';

const roles: UserRole[] = ['admin', 'manager', 'staff', 'viewer'];

export default function UserEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useUserById(id);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [initialized, setInitialized] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const user = data?.user;

  if (user && !initialized) {
    setName(user.name);
    setRole(user.role);
    setStatus(user.status);
    setInitialized(true);
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    updateUser.mutate(
      { id, data: { name, role, status } },
      {
        onSuccess: () => {
          toast.success(t('common.updateSuccess'));
          navigate('/admin/users');
        },
        onError: () => {
          toast.error(t('common.error'));
        },
      }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    deleteUser.mutate(id, {
      onSuccess: () => {
        toast.success(t('common.deleteSuccess'));
        navigate('/admin/users');
      },
      onError: () => {
        toast.error(t('common.error'));
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !user) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <p className="text-destructive">{t('common.error')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.users.editTitle')}</h1>
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
              disabled={updateUser.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('admin.users.form.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">{t('common.invalidEmail')}</p>
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
              disabled={updateUser.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? t('common.loading') : t('admin.users.form.submitUpdate')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={updateUser.isPending}
              className="ml-auto"
            >
              {t('common.delete')}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.deleteDialog.description', { name: user.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.users.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? t('common.loading') : t('admin.users.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
