import { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useGetVehicles } from '../../hooks/useVehicles';
import { useGetTripCodes } from '../../hooks/useTripCodes';
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
  ma_chuyen: string;
  bien_so: string;
  tai_xe: string;
  ghi_chu: string;
  vehicle_id: number | null;
  trip_code_id: number | null;
}

interface FieldErrors {
  diem_nhan?: string;
  diem_tra?: string;
  gio_nhan?: string;
  bien_so?: string;
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
    ma_chuyen: '',
    bien_so: '',
    tai_xe: '',
    ghi_chu: '',
    vehicle_id: null,
    trip_code_id: null,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const { data: vehiclesData } = useGetVehicles();
  const { data: tripCodesData } = useGetTripCodes();

  const filteredVehicles =
    vehiclesData?.filter((v) => v.loai === schedule?.loai_xe && v.status === 'active') ?? [];

  const activeTripCodes = tripCodesData?.filter((tc) => tc.status === 'active') ?? [];

  // Pre-fill form when schedule changes
  useEffect(() => {
    if (schedule) {
      setForm({
        diem_nhan: schedule.diem_nhan,
        diem_tra: schedule.diem_tra,
        gio_nhan: schedule.gio_nhan,
        ma_chuyen: schedule.ma_chuyen ?? '',
        bien_so: schedule.bien_so,
        tai_xe: schedule.tai_xe ?? '',
        ghi_chu: schedule.ghi_chu ?? '',
        vehicle_id: schedule.vehicle_id,
        trip_code_id: schedule.trip_code_id,
      });
      setErrors({});
    }
  }, [schedule]);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = filteredVehicles.find((v) => v.id === parseInt(vehicleId, 10));
    if (vehicle) {
      setForm((prev) => ({
        ...prev,
        bien_so: vehicle.bien_so,
        tai_xe: vehicle.tai_xe[0] ?? '',
        vehicle_id: vehicle.id,
      }));
    } else {
      setForm((prev) => ({ ...prev, bien_so: '', tai_xe: '', vehicle_id: null }));
    }
  };

  const handleTripCodeSelect = (tripCodeId: string) => {
    const tc = activeTripCodes.find((tc) => tc.id === parseInt(tripCodeId, 10));
    if (tc) {
      setForm((prev) => ({ ...prev, ma_chuyen: tc.ma, trip_code_id: tc.id }));
    } else {
      setForm((prev) => ({ ...prev, ma_chuyen: '', trip_code_id: null }));
    }
  };

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
    if (schedule?.xe_type === 'Xe ngoài' && !form.bien_so.trim()) {
      newErrors.bien_so = t('dispatch.validation.bienSoRequired' as never);
    }
    if (schedule?.xe_type === 'Xe nhà' && !form.bien_so) {
      newErrors.bien_so = t('dispatch.validation.bienSoSelectRequired' as never);
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !schedule) return;
    await onSubmit(schedule.id, {
      bien_so: form.bien_so,
      tai_xe: form.tai_xe || null,
      ma_chuyen: form.ma_chuyen || null,
      diem_nhan: form.diem_nhan,
      diem_tra: form.diem_tra,
      gio_nhan: form.gio_nhan,
      ghi_chu: form.ghi_chu || null,
      vehicle_id: form.vehicle_id,
      trip_code_id: form.trip_code_id,
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
      {/* Context badges */}
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
        {/* Điểm nhận / Điểm trả */}
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

        {/* Giờ nhận / Mã chuyến */}
        <div className="grid grid-cols-2 gap-3">
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
              {t('dispatch.createModal.maChuyen' as never)}
            </label>
            <select
              value={form.trip_code_id?.toString() ?? ''}
              onChange={(e) => handleTripCodeSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500 dark:focus:border-neutral-400 transition-colors"
            >
              <option value="">{t('dispatch.createModal.maChuyenPlaceholder' as never)}</option>
              {activeTripCodes.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.ma} — {tc.tuyen}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Biển số */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('dispatch.createModal.bienSo' as never)} <span className="text-red-500">*</span>
          </label>
          {schedule?.xe_type === 'Xe nhà' ? (
            <select
              value={form.vehicle_id?.toString() ?? ''}
              onChange={(e) => handleVehicleSelect(e.target.value)}
              className={inputClass(!!errors.bien_so)}
            >
              <option value="">{t('dispatch.createModal.bienSoPlaceholder' as never)}</option>
              {filteredVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.bien_so}
                  {v.tai_xe.length > 0 ? ` — ${v.tai_xe[0]}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.bien_so}
              onChange={(e) => setForm((p) => ({ ...p, bien_so: e.target.value }))}
              placeholder={t('dispatch.createModal.bienSoInputPlaceholder' as never)}
              className={inputClass(!!errors.bien_so)}
            />
          )}
          {errors.bien_so && <p className="mt-1 text-xs text-red-500">{errors.bien_so}</p>}
        </div>

        {/* Tài xế */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('dispatch.createModal.taiXe' as never)}
          </label>
          {schedule?.xe_type === 'Xe nhà' ? (
            <input
              type="text"
              value={form.tai_xe}
              readOnly
              placeholder={t('dispatch.createModal.taiXePlaceholder' as never)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
            />
          ) : (
            <input
              type="text"
              value={form.tai_xe}
              onChange={(e) => setForm((p) => ({ ...p, tai_xe: e.target.value }))}
              placeholder={t('dispatch.createModal.taiXeInputPlaceholder' as never)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500 dark:focus:border-neutral-400 transition-colors"
            />
          )}
        </div>

        {/* Ghi chú */}
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

        {/* Actions */}
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
