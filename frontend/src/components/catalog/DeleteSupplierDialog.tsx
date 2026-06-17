import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDeleteSupplier } from '../../hooks/useSupplierCatalog';
import type { Supplier } from '../../api/supplierCatalogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  supplier: Supplier | null;
}

export function DeleteSupplierDialog({ isOpen, onClose, onSuccess, onError, supplier }: Props) {
  const deleteMutation = useDeleteSupplier();

  if (!supplier) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(supplier.id);
      onSuccess(`Đã xóa nhà cung cấp ${supplier.supplier_code}.`);
      onClose();
    } catch {
      onError('Không thể xóa nhà cung cấp. Vui lòng thử lại.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Bạn có chắc muốn xóa nhà cung cấp{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {supplier.supplier_code}
          </span>{' '}
          — {supplier.name}? Hành động này sẽ deactivate bản ghi.
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
