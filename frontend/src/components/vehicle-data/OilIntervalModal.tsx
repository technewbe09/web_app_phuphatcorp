import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUpdateOilInterval } from '../../hooks/useVehicleOilChanges';
import type { OilChangeDueVehicle } from '../../api/vehicleOilChangeApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  vehicle: OilChangeDueVehicle;
}

export function OilIntervalModal({ isOpen, onClose, onSuccess, onError, vehicle }: Props) {
  const updateMutation = useUpdateOilInterval();
  const [intervalKm, setIntervalKm] = useState(vehicle.interval_km.toString());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setIntervalKm(vehicle.interval_km.toString());
      setFieldErrors({});
    }
  }, [isOpen, vehicle]);

  const handleSubmit = async () => {
    setFieldErrors({});

    const val = parseInt(intervalKm, 10);
    if (isNaN(val) || val < 0) {
      setFieldErrors({ interval: 'Vui lòng nhập số km hợp lệ (>= 0)' });
      return;
    }

    try {
      await updateMutation.mutateAsync({ vehicleId: vehicle.vehicle_id, intervalKm: val });
      onSuccess(`Đã cập nhật ngưỡng thay nhớt cho xe ${vehicle.plate_number}`);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string } } };
        onError(e.response?.data?.message || 'Lỗi. Vui lòng thử lại.');
      } else {
        onError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thiết lập ngưỡng thay nhớt" size="sm">
      <div className="space-y-4">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          <span className="font-mono font-medium">{vehicle.plate_number}</span>
          {vehicle.driver_name && <span> - {vehicle.driver_name}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Ngưỡng km thay nhớt <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={intervalKm}
            onChange={(e) => setIntervalKm(e.target.value)}
            error={fieldErrors.interval}
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Mặc định: 5000km
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="button" isLoading={updateMutation.isPending} onClick={handleSubmit}>
            Lưu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
