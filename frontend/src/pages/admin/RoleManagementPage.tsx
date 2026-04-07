import { useState } from 'react';
import { Plus, Pencil, PowerOff, Power, Eye } from 'lucide-react';
import { useRoles, useToggleRole } from '../../hooks/useRoles';
import { useI18n } from '../../i18n/useI18n';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CreateRoleModal } from '../../components/admin/CreateRoleModal';
import { EditRoleModal } from '../../components/admin/EditRoleModal';
import { DeactivateRoleDialog } from '../../components/admin/DeactivateRoleDialog';
import type { Role } from '../../types/user';

export function RoleManagementPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const { data: roles, isLoading, isError, refetch } = useRoles();
  const toggleRole = useToggleRole();

  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deactivateRole, setDeactivateRole] = useState<Role | null>(null);

  const canManage = hasPermission('roles.manage');

  const handleActivate = async (role: Role) => {
    try {
      await toggleRole.mutateAsync({ id: role.id, is_active: true });
    } catch {
      // error handled silently — toast would be added here
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t('roles.title')}
          </h1>
          {roles && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {roles.length} {t('roles.title').toLowerCase()}
            </p>
          )}
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('roles.addRole')}
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {[t('roles.roleName'), t('roles.roleCode'), t('roles.permissionCount'), t('roles.userCount'), t('roles.status'), ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-neutral-500 dark:text-neutral-400">{t('roles.loadError')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && roles?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-neutral-500 dark:text-neutral-400">{t('roles.noRoles')}</p>
          {canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('roles.createFirst')}
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && roles && roles.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('roles.roleName')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('roles.roleCode')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('roles.permissionCount')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('roles.userCount')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('roles.status')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('users.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {role.name}
                      </span>
                      {role.is_system && (
                        <Badge variant="info" className="ml-2 text-xs">
                          {t('roles.systemRole')}
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate max-w-xs">
                        {role.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
                      {role.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                    {role.permission_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                    {role.user_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={role.is_active ? 'success' : 'default'}>
                      {role.is_active ? `● ${t('roles.active')}` : `○ ${t('roles.inactive')}`}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* ADMIN: view only */}
                      {role.code === 'ADMIN' ? (
                        <Button size="sm" variant="ghost" title={t('users.actions.view')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title={t('roles.editRole')}
                              onClick={() => setEditRole(role)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canManage && role.is_active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title={t('roles.deactivateRole')}
                              onClick={() => setDeactivateRole(role)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <PowerOff className="w-4 h-4" />
                            </Button>
                          )}
                          {canManage && !role.is_active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title={t('roles.activateRole')}
                              onClick={() => handleActivate(role)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateRoleModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <EditRoleModal isOpen={!!editRole} onClose={() => setEditRole(null)} role={editRole} />
      <DeactivateRoleDialog
        isOpen={!!deactivateRole}
        onClose={() => setDeactivateRole(null)}
        role={deactivateRole}
      />
    </div>
  );
}
