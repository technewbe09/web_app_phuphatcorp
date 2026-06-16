import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { cn } from '../../utils/cn';
import type { DispatchSchedule } from '../../api/dispatchApi';

interface ScheduleTableProps {
  title: string;
  data: DispatchSchedule[];
  isLoading: boolean;
  onEdit: (schedule: DispatchSchedule) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function ScheduleTable({ title, data, isLoading, onEdit, onDelete, isDeleting }: ScheduleTableProps) {
  const { t } = useI18n();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeletingId(id);
    onDelete(id);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase whitespace-nowrap">
                {t('dispatch.schedule.columns.diemNhan' as never)}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase whitespace-nowrap">
                {t('dispatch.schedule.columns.diemTra' as never)}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase whitespace-nowrap">
                {t('dispatch.schedule.columns.gioNhan' as never)}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase whitespace-nowrap">
                {t('dispatch.schedule.columns.ghiChu' as never)}
              </th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {t('dispatch.schedule.emptyState' as never)}
                  </p>
                  <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
                    {t('dispatch.schedule.emptyStateSub' as never)}
                  </p>
                </td>
              </tr>
            )}
            {!isLoading &&
              data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group"
                >
                  <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{row.diem_nhan}</td>
                  <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{row.diem_tra}</td>
                  <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">{row.gio_nhan}</td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 max-w-[150px] truncate">
                    {row.ghi_chu || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(row)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100',
                          'text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400',
                        )}
                        title={t('dispatch.editModal.title' as never)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={isDeleting && deletingId === row.id}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100',
                          'text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400',
                          isDeleting && deletingId === row.id && 'opacity-50 cursor-not-allowed',
                        )}
                        title={t('dispatch.deleteModal.title' as never)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
