import { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { DispatchSchedule, UpdateDispatchScheduleRequest } from '../../api/dispatchApi';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DispatchSchedule | null;
  onSubmit: (id: number, data: UpdateDispatchScheduleRequest) => Promise<void>;
  isSubmitting: boolean;
}

interface FormData {
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu: string;
}

interface FieldErrors {
  diem_nhan?: string;
  diem_tra?: string;
  gio_nhan?: string;
}

export function EditScheduleModal({
  isOpen,
  onClose,
  schedule,
  onSubmit,
  isSubmitting,
}: EditScheduleModalProps) {
  const { t } = useI18n();

  const [form, setForm] = useState<FormData>({
    diem_nhan: '',
    diem_tra: '',
    gio_nhan: '',
    ghi_chu: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (schedule) {
      setForm({
        diem_nhan: schedule.diem_nhan,
        diem_tra: schedule.diem_tra,
        gio_nhan: schedule.gio_nhan,
        ghi_chu: schedule.ghi_chu ?? '',
      });
      setErrors({});
    }
  }, [schedule]);

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!form.diem_nhan.trim()) {
      newErrors.diem_nhan = t('dispatch.validation.diemNhanRequired' as never);
    }
    if (!form.diem_tra.trim()) {
      newErrors.diem_tra = t('dispatch.validation.diemTraRequired' as never);
    }
    if (!form.gio_nhan) {
      newErrors.gio_nhan = t('dispatch.validation.gioNhanRequired' as never);
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !schedule) return;
    await onSubmit(schedule.id, {
      diem_nhan: form.diem_nhan,
      diem_tra: form.diem_tra,
      gio_nhan: form.gio_nhan,
      ghi_chu: form.ghi_chu || null,
    });
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition-colors',
      hasError
        ? 'border-red-400 focus:border-red-500'
        : 'border-neutral-300 dark:border-neutral-600 focus:border-neutral-500 dark:focus:border-neutral-400',
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('dispatch.editModal.title' as never)}
      size="md"
    >
      {schedule && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[schedule.loai_tuyen, schedule.xe_type, schedule.loai_xe].map((label) => (
            <span
              key={label}
              className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('dispatch.createModal.diemNhan' as never)} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.diem_nhan}
              onChange={(e) => setForm((p) => ({ ...p, diem_nhan: e.target.value }))}
              className={inputClass(!!errors.diem_nhan)}
            />
            {errors.diem_nhan && <p className="mt-1 text-xs text-red-500">{errors.diem_nhan}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('dispatch.createModal.diemTra' as never)} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.diem_tra}
              onChange={(e) => setForm((p) => ({ ...p, diem_tra: e.target.value }))}
              className={inputClass(!!errors.diem_tra)}
            />
            {errors.diem_tra && <p className="mt-1 text-xs text-red-500">{errors.diem_tra}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('dispatch.createModal.gioNhan' as never)} <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={form.gio_nhan}
            onChange={(e) => setForm((p) => ({ ...p, gio_nhan: e.target.value }))}
            className={inputClass(!!errors.gio_nhan)}
          />
          {errors.gio_nhan && <p className="mt-1 text-xs text-red-500">{errors.gio_nhan}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('dispatch.createModal.ghiChu' as never)}
          </label>
          <textarea
            value={form.ghi_chu}
            onChange={(e) => setForm((p) => ({ ...p, ghi_chu: e.target.value }))}
            placeholder={t('dispatch.createModal.ghiChuPlaceholder' as never)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500 dark:focus:border-neutral-400 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('dispatch.deleteModal.cancel' as never)}
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting
              ? t('dispatch.editModal.submitting' as never)
              : t('dispatch.editModal.submit' as never)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
