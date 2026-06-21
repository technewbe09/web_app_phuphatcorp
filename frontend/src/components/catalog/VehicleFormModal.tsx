import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCreateVehicle, useUpdateVehicle } from '../../hooks/useVehicleCatalog';
import type { Vehicle } from '../../api/vehicleCatalogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  vehicle: Vehicle | null;
}

export function VehicleFormModal({ isOpen, onClose, onSuccess, onError, vehicle }: Props) {
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const isEdit = !!vehicle;

  const [form, setForm] = useState({ driver_name: vehicle?.driver_name ?? '', plate_number: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setForm({ driver_name: '', plate_number: '' });
    setFieldErrors({});
    onClose();
  };

  const handleSubmit = async () => {
    setFieldErrors({});

    if (!form.driver_name.trim()) {
      setFieldErrors({ driver_name: 'Tên tài xế là bắt buộc' });
      return;
    }

    if (!isEdit && !form.plate_number.trim()) {
      setFieldErrors({ plate_number: 'Biển số là bắt buộc' });
      return;
    }

    try {
      if (isEdit && vehicle) {
        const result = await updateMutation.mutateAsync({ id: vehicle.id, data: { driver_name: form.driver_name } });
        onSuccess(`Đã cập nhật xe ${result.plate_number}.`);
      } else {
        const result = await createMutation.mutateAsync({ driver_name: form.driver_name, plate_number: form.plate_number });
        onSuccess(`Đã thêm xe ${result.plate_number}.`);
      }
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as {
          response?: { data?: { message?: string; errors?: { path: string; msg: string }[] }; status?: number };
        };
        if (e.response?.status === 409 || e.response?.status === 400) {
          if (e.response?.data?.message) {
            onError(e.response.data.message);
            return;
          }
        }
        if (e.response?.data?.errors) {
          const errs: Record<string, string> = {};
          e.response.data.errors.forEach((item) => {
            errs[item.path] = item.msg;
          });
          setFieldErrors(errs);
          return;
        }
        onError(e.response?.data?.message || 'Lỗi. Vui lòng thử lại.');
      } else {
        onError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Sửa xe' : 'Thêm xe mới'} size="sm">
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Tên tài xế <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.driver_name}
              onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
              placeholder="Nhập tên tài xế"
              error={fieldErrors.driver_name}
            />
          </div>
          {isEdit ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Biển số: <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{vehicle!.plate_number}</span>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Biển số <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.plate_number}
                onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value }))}
                placeholder="VD: 51H-88294"
                error={fieldErrors.plate_number}
              />
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Định dạng: XXYXXXXX (sẽ tự động chuẩn hóa)
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              type="button"
              isLoading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {isEdit ? 'Lưu' : 'Thêm mới'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
