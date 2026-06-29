import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { ScheduleTable } from '../../components/dispatch/ScheduleTable';
import { OutsideRouteTable } from '../../components/dispatch/OutsideRouteTable';
import { CreateScheduleModal } from '../../components/dispatch/CreateScheduleModal';
import { EditScheduleModal } from '../../components/dispatch/EditScheduleModal';
import {
  useDispatchSchedules,
  useCreateDispatchSchedule,
  useUpdateDispatchSchedule,
  useDeleteDispatchSchedule,
} from '../../hooks/useDispatchSchedules';
import type { CreateDispatchScheduleRequest, UpdateDispatchScheduleRequest, DispatchSchedule } from '../../api/dispatchApi';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function SchedulePage() {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DispatchSchedule | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useDispatchSchedules(selectedDate);
  const createSchedule = useCreateDispatchSchedule();
  const updateSchedule = useUpdateDispatchSchedule();
  const deleteSchedule = useDeleteDispatchSchedule();

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setDeleteError(msg);
      setTimeout(() => setDeleteError(null), 3000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleCreate = async (formData: CreateDispatchScheduleRequest) => {
    try {
      setCreateError(null);
      await createSchedule.mutateAsync(formData);
      setIsCreateOpen(false);
      showToast(t('dispatch.createModal.createSuccess' as never));
    } catch {
      setCreateError(t('dispatch.createModal.createError' as never));
    }
  };

  const handleEdit = (schedule: DispatchSchedule) => {
    setEditingSchedule(schedule);
  };

  const handleEditClose = () => {
    setEditingSchedule(null);
  };

  const handleEditSubmit = async (id: number, data: UpdateDispatchScheduleRequest) => {
    await updateSchedule.mutateAsync(
      { id, data, date: selectedDate },
      {
        onSuccess: () => {
          setEditingSchedule(null);
          showToast(t('dispatch.editModal.updateSuccess' as never));
        },
        onError: () => {
          showToast(t('dispatch.editModal.updateError' as never), true);
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteSchedule.mutate(
      { id, date: selectedDate },
      {
        onSuccess: () => showToast(t('dispatch.deleteModal.deleteSuccess' as never)),
        onError: () => showToast(t('dispatch.deleteModal.deleteError' as never), true),
      },
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('dispatch.schedule.title' as never)}
        </h1>
        <div className="flex items-center gap-3">
          <DateInput
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500 dark:focus:border-neutral-400 transition-colors"
          />
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('dispatch.schedule.createTrip' as never)}
          </Button>
        </div>
      </div>

      {/* Toast notifications */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
          {successMsg}
        </div>
      )}
      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {deleteError}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-neutral-500 dark:text-neutral-400">
            {t('dispatch.schedule.loadError' as never)}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('dispatch.schedule.retry' as never)}
          </Button>
        </div>
      )}

      {/* Tables — 2 columns on lg+, stack on mobile */}
      {!isError && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScheduleTable
              title={t('dispatch.schedule.tableXeNho' as never)}
              data={data?.xe_nho ?? []}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteSchedule.isPending}
            />
            <ScheduleTable
              title={t('dispatch.schedule.tableXeLon' as never)}
              data={data?.xe_lon ?? []}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteSchedule.isPending}
            />
          </div>
          <div className="mt-4">
            <OutsideRouteTable
              title={t('dispatch.schedule.tableTuyenNgoai' as never)}
              data={data?.tuyen_ngoai ?? []}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteSchedule.isPending}
            />
          </div>
        </>
      )}

      {/* Create modal */}
      <CreateScheduleModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        selectedDate={selectedDate}
        onSubmit={handleCreate}
        isSubmitting={createSchedule.isPending}
      />
      {createError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {createError}
        </div>
      )}

      {/* Edit modal */}
      <EditScheduleModal
        isOpen={editingSchedule !== null}
        onClose={handleEditClose}
        schedule={editingSchedule}
        onSubmit={handleEditSubmit}
        isSubmitting={updateSchedule.isPending}
      />
    </div>
  );
}
