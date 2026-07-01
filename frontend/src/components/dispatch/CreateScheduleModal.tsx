import { useState, useEffect } from 'react';
import { ChevronLeft, Truck, Car, MapPin, Navigation } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { CreateDispatchScheduleRequest } from '../../api/dispatchApi';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSubmit: (data: CreateDispatchScheduleRequest) => Promise<void>;
  isSubmitting: boolean;
  presetLoaiTuyen?: LoaiTuyen;
  presetLoaiXe?: LoaiXe;
}

type LoaiTuyen = 'Tuyến cố định' | 'Tuyến ngoài';
type XeType = 'Xe nhà' | 'Xe ngoài';
type LoaiXe = 'Xe lớn' | 'Xe nhỏ';

interface FormData {
  diem_nhan: string;
  diem_tra: string;
  gio_nhan: string;
  ghi_chu: string;
}

const initialForm: FormData = {
  diem_nhan: '',
  diem_tra: '',
  gio_nhan: '',
  ghi_chu: '',
};

interface FieldErrors {
  diem_nhan?: string;
  diem_tra?: string;
  gio_nhan?: string;
}

export function CreateScheduleModal({
  isOpen,
  onClose,
  selectedDate,
  onSubmit,
  isSubmitting,
  presetLoaiTuyen,
  presetLoaiXe,
}: CreateScheduleModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loai_tuyen, setLoaiTuyen] = useState<LoaiTuyen | null>(null);
  const [xe_type, setXeType] = useState<XeType | null>(null);
  const [loai_xe, setLoaiXe] = useState<LoaiXe | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isOpen) {
      setLoaiTuyen(presetLoaiTuyen ?? null);
      setLoaiXe(presetLoaiXe ?? null);
      setXeType(null);
      setForm(initialForm);
      setErrors({});
      if (presetLoaiTuyen && presetLoaiXe) {
        setStep(2);
      } else if (presetLoaiTuyen) {
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [isOpen, presetLoaiTuyen, presetLoaiXe]);

  const handleClose = () => {
    setStep(1);
    setLoaiTuyen(null);
    setXeType(null);
    setLoaiXe(null);
    setForm(initialForm);
    setErrors({});
    onClose();
  };

  const handleSelectLoaiTuyen = (tuyen: LoaiTuyen) => {
    setLoaiTuyen(tuyen);
    setForm(initialForm);
    setStep(2);
  };

  const handleSelectXeType = (type: XeType) => {
    setXeType(type);
    setForm(initialForm);
    if (loai_xe) {
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const handleSelectLoaiXe = (loai: LoaiXe) => {
    setLoaiXe(loai);
    setStep(4);
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !loai_tuyen || !xe_type || !loai_xe) return;

    await onSubmit({
      ngay: selectedDate,
      loai_tuyen,
      loai_xe,
      xe_type,
      diem_nhan: form.diem_nhan,
      diem_tra: form.diem_tra,
      gio_nhan: form.gio_nhan,
      ghi_chu: form.ghi_chu || null,
    });
  };

  const stepTitle =
    step === 1
      ? t('dispatch.createModal.step1Title' as never)
      : step === 2
        ? t('dispatch.createModal.step2Title' as never)
        : step === 3
          ? t('dispatch.createModal.step3Title' as never)
          : t('dispatch.createModal.step4Title' as never);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('dispatch.createModal.title' as never)}
      size="md"
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{stepTitle}</p>

      {/* Step 1 — Tuyến cố định / Tuyến ngoài */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSelectLoaiTuyen('Tuyến cố định')}
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-800 dark:hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <MapPin className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {t('dispatch.createModal.tuyenCoDinh' as never)}
            </span>
          </button>
          <button
            onClick={() => handleSelectLoaiTuyen('Tuyến ngoài')}
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-800 dark:hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Navigation className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {t('dispatch.createModal.tuyenNgoai' as never)}
            </span>
          </button>
        </div>
      )}

      {/* Step 2 — Xe nhà / Xe ngoài */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSelectXeType('Xe nhà')}
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-800 dark:hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Car className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {t('dispatch.createModal.xeNha' as never)}
              </span>
            </button>
            <button
              onClick={() => handleSelectXeType('Xe ngoài')}
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-800 dark:hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Truck className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {t('dispatch.createModal.xeNgoai' as never)}
              </span>
            </button>
          </div>
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('dispatch.createModal.back' as never)}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Xe nhỏ / Xe lớn */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSelectLoaiXe('Xe nhỏ')}
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-800 dark:hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Car className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {t('dispatch.createModal.xeNho' as never)}
              </span>
            </button>
            <button
              onClick={() => handleSelectLoaiXe('Xe lớn')}
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-neutral-800 dark:hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Truck className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {t('dispatch.createModal.xeLon' as never)}
              </span>
            </button>
          </div>
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('dispatch.createModal.back' as never)}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — Form */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('dispatch.createModal.diemNhan' as never)}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.diem_nhan}
                onChange={(e) => setForm((p) => ({ ...p, diem_nhan: e.target.value }))}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition-colors',
                  errors.diem_nhan
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-neutral-300 dark:border-neutral-600 focus:border-neutral-500 dark:focus:border-neutral-400',
                )}
              />
              {errors.diem_nhan && (
                <p className="mt-1 text-xs text-red-500">{errors.diem_nhan}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('dispatch.createModal.diemTra' as never)}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.diem_tra}
                onChange={(e) => setForm((p) => ({ ...p, diem_tra: e.target.value }))}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition-colors',
                  errors.diem_tra
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-neutral-300 dark:border-neutral-600 focus:border-neutral-500 dark:focus:border-neutral-400',
                )}
              />
              {errors.diem_tra && (
                <p className="mt-1 text-xs text-red-500">{errors.diem_tra}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t('dispatch.createModal.gioNhan' as never)}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={form.gio_nhan}
              onChange={(e) => setForm((p) => ({ ...p, gio_nhan: e.target.value }))}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none transition-colors',
                errors.gio_nhan
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-neutral-300 dark:border-neutral-600 focus:border-neutral-500 dark:focus:border-neutral-400',
              )}
            />
            {errors.gio_nhan && (
              <p className="mt-1 text-xs text-red-500">{errors.gio_nhan}</p>
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

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('dispatch.createModal.back' as never)}
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting
                ? t('dispatch.createModal.submitting' as never)
                : t('dispatch.createModal.submit' as never)}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
