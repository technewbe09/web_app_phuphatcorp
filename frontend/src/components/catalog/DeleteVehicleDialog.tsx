import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDeleteVehicle } from '../../hooks/useVehicleCatalog';
import type { Vehicle } from '../../api/vehicleCatalogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  vehicle: Vehicle | null;
}

export function DeleteVehicleDialog({ isOpen, onClose, onSuccess, onError, vehicle }: Props) {
  const deleteMutation = useDeleteVehicle();

  if (!vehicle) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(vehicle.id);
      onSuccess(`Đã xóa xe ${vehicle.plate_number}.`);
      onClose();
    } catch {
      onError('Không thể xóa xe. Vui lòng thử lại.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Bạn có chắc muốn xóa xe <span className="font-medium text-neutral-900 dark:text-neutral-100">{vehicle.plate_number}</span>? Hành động này sẽ deactivate bản ghi.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={handleDelete}
          >
            Xóa
          </Button>
        </div>
      </div>
    </Modal>
  );
}
