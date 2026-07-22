import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { useGetVehicles } from '../../hooks/useVehicleCatalog';
import { useCreateOilChange, useUpdateOilChange } from '../../hooks/useVehicleOilChanges';
import type { OilChangeRecord } from '../../api/vehicleOilChangeApi';
import { cn } from '../../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  record: OilChangeRecord | null;
  preselectedVehicleId?: number;
}

const OIL_TYPES = ['15W-40', '20W-50'];

export function OilChangeFormModal({ isOpen, onClose, onSuccess, onError, record, preselectedVehicleId }: Props) {
  const isEdit = !!record;
  const createMutation = useCreateOilChange();
  const updateMutation = useUpdateOilChange();

  const [form, setForm] = useState({
    vehicle_id: record?.vehicle_id ?? '' as string | number,
    change_date: record?.change_date ? record.change_date.split('T')[0] : '',
    odometer_at: record?.odometer_at?.toString() ?? '',
    oil_type: record?.oil_type ?? '',
    notes: record?.notes ?? '',
  });
  const [customOilType, setCustomOilType] = useState('');
  const [showCustomOil, setShowCustomOil] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: vehiclesData } = useGetVehicles('', 'active', undefined, 1, 200);
  const vehicles = vehiclesData?.vehicles ?? [];

  useEffect(() => {
    if (isOpen) {
      const oilType = record?.oil_type ?? '';
      const isPreset = OIL_TYPES.includes(oilType);
      setForm({
        vehicle_id: record?.vehicle_id ?? preselectedVehicleId ?? '',
        change_date: record?.change_date ? record.change_date.split('T')[0] : '',
        odometer_at: record?.odometer_at?.toString() ?? '',
        oil_type: isPreset ? oilType : 'other',
        notes: record?.notes ?? '',
      });
      setShowCustomOil(!!oilType && !isPreset);
      setCustomOilType(!isPreset && oilType ? oilType : '');
      setFieldErrors({});
    }
  }, [isOpen, record]);

  const handleClose = () => {
    setFieldErrors({});
    onClose();
  };

  const handleSubmit = async () => {
    setFieldErrors({});

    if (!form.vehicle_id) {
      setFieldErrors({ vehicle_id: 'Vui lòng chọn xe' });
      return;
    }
    if (!form.change_date) {
      setFieldErrors({ change_date: 'Vui lòng chọn ngày thay' });
      return;
    }
    if (!form.odometer_at || Number(form.odometer_at) < 0) {
      setFieldErrors({ odometer_at: 'Vui lòng nhập số km hợp lệ' });
      return;
    }

    const oilType = form.oil_type === 'other' ? customOilType : form.oil_type;

    try {
      if (isEdit && record) {
        await updateMutation.mutateAsync({
          id: record.id,
          data: {
            change_date: form.change_date,
            odometer_at: Number(form.odometer_at),
            oil_type: oilType || undefined,
            notes: form.notes || undefined,
          },
        });
        onSuccess('Đã cập nhật thay nhớt');
      } else {
        await createMutation.mutateAsync({
          vehicle_id: Number(form.vehicle_id),
          change_date: form.change_date,
          odometer_at: Number(form.odometer_at),
          oil_type: oilType || undefined,
          notes: form.notes || undefined,
        });
        onSuccess('Đã thêm thay nhớt');
      }
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string; errors?: { path: string; msg: string }[] } } };
        if (e.response?.data?.errors) {
          const errs: Record<string, string> = {};
          e.response.data.errors.forEach((item) => { errs[item.path] = item.msg; });
          setFieldErrors(errs);
          return;
        }
        onError(e.response?.data?.message || 'Lỗi. Vui lòng thử lại.');
      } else {
        onError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Sửa thay nhớt' : 'Thêm thay nhớt'} size="md">
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Xe <span className="text-red-500">*</span>
            </label>
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}
              disabled={isEdit}
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100',
                fieldErrors.vehicle_id ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700',
                isEdit && 'opacity-60 cursor-not-allowed',
              )}
            >
              <option value="">Chọn xe...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} - {v.driver_name}
                </option>
              ))}
            </select>
            {fieldErrors.vehicle_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.vehicle_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ngày thay <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.change_date}
                onChange={(v) => setForm((f) => ({ ...f, change_date: v }))}
                error={fieldErrors.change_date}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Số km <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.odometer_at}
                onChange={(e) => setForm((f) => ({ ...f, odometer_at: e.target.value }))}
                error={fieldErrors.odometer_at}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Loại nhớt
            </label>
            <select
              value={form.oil_type}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({ ...f, oil_type: val }));
                setShowCustomOil(val === 'other');
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            >
              <option value="">Chọn loại nhớt...</option>
              {OIL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="other">Khác (nhập tay)</option>
            </select>
            {showCustomOil && (
              <Input
                value={customOilType}
                onChange={(e) => setCustomOilType(e.target.value)}
                placeholder="Nhập loại nhớt..."
                className="mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
              placeholder="Nhập ghi chú..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="button" isLoading={isSubmitting} onClick={handleSubmit}>
              {isEdit ? 'Lưu' : 'Thêm mới'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
