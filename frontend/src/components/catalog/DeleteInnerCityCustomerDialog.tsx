import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDeleteInnerCityCustomer } from '../../hooks/useInnerCityCustomers';
import type { InnerCityCustomer } from '../../api/innerCityCustomerApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  customer: InnerCityCustomer | null;
}

export function DeleteInnerCityCustomerDialog({ isOpen, onClose, onSuccess, onError, customer }: Props) {
  const deleteMutation = useDeleteInnerCityCustomer();

  if (!customer) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(customer.id);
      onSuccess(`Đã xóa khách hàng ${customer.customer_name}.`);
      onClose();
    } catch {
      onError('Không thể xóa khách hàng. Vui lòng thử lại.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Bạn có chắc muốn xóa khách hàng{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{customer.customer_name}</span>
          {' '}({customer.customer_code})? Hành động này sẽ deactivate bản ghi.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant="danger" isLoading={deleteMutation.isPending} onClick={handleDelete}>Xóa</Button>
        </div>
      </div>
    </Modal>
  );
}
