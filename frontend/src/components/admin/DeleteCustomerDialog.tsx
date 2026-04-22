import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDeleteCustomer } from '../../hooks/useCustomers';
import { useI18n } from '../../i18n/useI18n';
import type { Customer } from '../../api/customersApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  customer: Customer | null;
}

export function DeleteCustomerDialog({ isOpen, onClose, onSuccess, onError, customer }: Props) {
  const { t } = useI18n();
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = async () => {
    if (!customer) return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
      onSuccess(t('customers.delete.success'));
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { status?: number; data?: { message?: string } } };
        if (e.response?.status === 404) {
          onError(t('customers.errors.notFound'));
          return;
        }
        onError(e.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      } else {
        onError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('customers.delete.title')} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Bạn có chắc muốn xóa khách hàng{' '}
              <span className="font-semibold">"{customer?.diem_tra_hang}"</span> không?
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('customers.delete.warning')}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={deleteCustomer.isPending}>
            Hủy
          </Button>
          <Button variant="danger" isLoading={deleteCustomer.isPending} onClick={handleDelete}>
            {t('customers.delete.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
