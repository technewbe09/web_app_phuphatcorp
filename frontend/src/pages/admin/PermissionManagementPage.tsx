import { Fragment, useMemo, useState } from 'react';
import { usePermissionMatrix, useUpdateRolePermissions } from '../../hooks/usePermissions';
import { useI18n } from '../../i18n/useI18n';
import { Button } from '../../components/ui/Button';
import { Save, RotateCcw, Info } from 'lucide-react';
import type { PermissionMatrix } from '../../types/user';

function PermissionMatrix({
  data,
  localMatrix,
  onToggle,
}: {
  data: PermissionMatrix;
  localMatrix: Record<number, Set<number>>;
  onToggle: (roleId: number, permId: number) => void;
}) {
  const { t } = useI18n();

  // Group permissions by module
  const grouped: Record<string, typeof data.permissions> = {};
  for (const p of data.permissions) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase min-w-[200px] sticky left-0 bg-neutral-50 dark:bg-neutral-800/50 z-10">
              {t('permissions.title')}
            </th>
            {data.roles.map((role) => (
              <th
                key={role.id}
                className="text-center px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase min-w-[120px]"
              >
                <div>{role.name}</div>
                {role.is_system && role.code === 'ADMIN' && (
                  <div className="text-xs font-normal text-blue-500 normal-case">(admin)</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([module, perms]) => (
            <Fragment key={`module-${module}`}>
              {/* Module header row */}
              <tr
                key={`module-${module}`}
                className="bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800"
              >
                <td
                  colSpan={data.roles.length + 1}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider sticky left-0 bg-neutral-50 dark:bg-neutral-800/30"
                >
                  {t(`permissions.modules.${module}` as never) || module}
                </td>
              </tr>
              {/* Permission rows */}
              {perms.map((perm) => (
                <tr
                  key={perm.id}
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 sticky left-0 bg-white dark:bg-neutral-900 z-10">
                    <div className="font-medium text-sm">
                      {t(`permissions.permCodes.${perm.code.replace(/\./g, '_')}` as never) || perm.name}
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">{perm.code}</div>
                  </td>
                  {data.roles.map((role) => {
                    const isAdmin = role.code === 'ADMIN';
                    const checked = isAdmin
                      ? true
                      : (localMatrix[role.id]?.has(perm.id) ?? false);

                    return (
                      <td key={role.id} className="px-4 py-3 text-center">
                        <div className="relative inline-flex">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isAdmin}
                            onChange={() => !isAdmin && onToggle(role.id, perm.id)}
                            className="w-4 h-4 accent-neutral-800 dark:accent-neutral-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            title={
                              isAdmin
                                ? t('permissions.adminReadonly')
                                : `${t(`permissions.permCodes.${perm.code.replace(/\./g, '_')}` as never) || perm.name} — ${role.name}`
                            }
                          />
                          {isAdmin && (
                            <span
                              className="absolute -top-1 -right-1 text-blue-400 cursor-help"
                              title={t('permissions.adminReadonly')}
                            >
                              <Info className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PermissionManagementPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = usePermissionMatrix();
  const updatePerms = useUpdateRolePermissions();

  // Local dirty state: clone matrix to track unsaved changes
  const [localMatrix, setLocalMatrix] = useState<Record<number, Set<number>> | null>(null);

  const effectiveMatrix = useMemo(() => {
    if (localMatrix) return localMatrix;
    if (!data) return {};
    const m: Record<number, Set<number>> = {};
    for (const [roleId, permIds] of Object.entries(data.matrix)) {
      m[Number(roleId)] = new Set(permIds);
    }
    return m;
  }, [data, localMatrix]);

  const isDirty = localMatrix !== null;

  const handleToggle = (roleId: number, permId: number) => {
    setLocalMatrix((prev) => {
      const base = prev ?? (() => {
        const m: Record<number, Set<number>> = {};
        for (const [id, ids] of Object.entries(data!.matrix)) {
          m[Number(id)] = new Set(ids);
        }
        return m;
      })();
      const updated = { ...base };
      updated[roleId] = new Set(base[roleId] ?? []);
      if (updated[roleId].has(permId)) {
        updated[roleId].delete(permId);
      } else {
        updated[roleId].add(permId);
      }
      return updated;
    });
  };

  const handleDiscard = () => setLocalMatrix(null);

  const handleSave = async () => {
    if (!data || !localMatrix) return;
    const nonAdminRoles = data.roles.filter((r) => r.code !== 'ADMIN');
    for (const role of nonAdminRoles) {
      const permIds = [...(localMatrix[role.id] ?? [])];
      await updatePerms.mutateAsync({ roleId: role.id, permission_ids: permIds });
    }
    setLocalMatrix(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t('permissions.title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('permissions.subtitle')}
          </p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t('permissions.unsavedChanges')}
            </span>
            <Button variant="outline" onClick={handleDiscard}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('permissions.discardChanges')}
            </Button>
            <Button onClick={handleSave} isLoading={updatePerms.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {t('permissions.saveAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 flex justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
            <p className="text-sm text-neutral-500">Đang tải...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-neutral-500 dark:text-neutral-400">{t('permissions.loadError')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Matrix */}
      {!isLoading && !isError && data && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <PermissionMatrix
            data={data}
            localMatrix={effectiveMatrix}
            onToggle={handleToggle}
          />
        </div>
      )}

      {/* Save error */}
      {updatePerms.isError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {t('permissions.saveError')}
        </div>
      )}
    </div>
  );
}
