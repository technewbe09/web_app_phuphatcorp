import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Search, Plus, Pencil, Trash2, Key, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import {
  useUsers,
  useDeleteUser,
  useResetUserPassword,
} from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
const statuses: AccountStatus[] = ['active', 'inactive'];

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(dateStr));
}

export default function UserListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);

  const filters = {
    page,
    limit,
    search: search || undefined,
    role: (roleFilter as UserRole) || undefined,
    status: (statusFilter as AccountStatus) || undefined,
  };

  const { data, isLoading, isError } = useUsers(filters);
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('common.deleteSuccess'));
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error(t('common.error'));
      },
    });
  };

  const handleResetPassword = () => {
    if (!resetTarget) return;
    resetPassword.mutate(resetTarget.id, {
      onSuccess: () => {
        toast.success(t('admin.users.resetPasswordDialog.success'));
        setResetTarget(null);
      },
      onError: () => {
        toast.error(t('common.error'));
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('admin.users.title')}</h1>
          <Button onClick={() => navigate('/admin/users/new')} className="gap-1.5">
            <Plus className="size-4" />
            {t('common.create')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.users.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v || ''); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('admin.users.filters.allRoles')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('admin.users.filters.allRoles')}</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`admin.users.roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || ''); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('admin.users.filters.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('admin.users.filters.allStatuses')}</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`admin.users.statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : isError ? (
          <div className="flex justify-center py-12">
            <p className="text-destructive">{t('common.error')}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-foreground">{t('admin.users.empty.title')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('admin.users.empty.description')}</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.users.columns.name')}</TableHead>
                    <TableHead>{t('admin.users.columns.email')}</TableHead>
                    <TableHead>{t('admin.users.columns.role')}</TableHead>
                    <TableHead>{t('admin.users.columns.status')}</TableHead>
                    <TableHead>{t('admin.users.columns.createdAt')}</TableHead>
                    <TableHead>{t('admin.users.columns.lastLogin')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {t(`admin.users.roles.${user.role}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'default' : 'destructive'}
                        >
                          {t(`admin.users.statuses.${user.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.lastLoginAt, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                            title={t('admin.users.actions.edit')}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setResetTarget({ id: user.id, name: user.name })}
                            title={t('admin.users.actions.resetPassword')}
                          >
                            <Key className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                            title={t('admin.users.actions.delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('common.page')} {page} / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.deleteDialog.description', { name: deleteTarget?.name })}
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

      {/* Reset Password Dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.resetPasswordDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.resetPasswordDialog.description', { name: resetTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.users.resetPasswordDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              {resetPassword.isPending ? t('common.loading') : t('admin.users.resetPasswordDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
