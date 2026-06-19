import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCreateInnerCityCustomer, useUpdateInnerCityCustomer } from '../../hooks/useInnerCityCustomers';
import type { InnerCityCustomer, InnerCityCustomerData } from '../../api/innerCityCustomerApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  customer: InnerCityCustomer | null;
}

function FormContent({ customer, onSuccess, onError, onClose }: Omit<Props, 'isOpen'>) {
  const createMutation = useCreateInnerCityCustomer();
  const updateMutation = useUpdateInnerCityCustomer();
  const isEdit = !!customer;

  const [form, setForm] = useState<InnerCityCustomerData>({
    customer_name: customer?.customer_name ?? '',
    customer_code: customer?.customer_code ?? '',
    notes: customer?.notes ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setFieldErrors({});

    if (!form.customer_name.trim() || !form.customer_code.trim()) {
      const errs: Record<string, string> = {};
      if (!form.customer_name.trim()) errs.customer_name = 'Tên khách hàng là bắt buộc';
      if (!form.customer_code.trim()) errs.customer_code = 'Mã khách hàng là bắt buộc';
      setFieldErrors(errs);
      return;
    }

    try {
      if (isEdit && customer) {
        await updateMutation.mutateAsync({ id: customer.id, data: form });
        onSuccess('Cập nhật khách hàng thành công.');
      } else {
        await createMutation.mutateAsync(form);
        onSuccess('Thêm khách hàng thành công.');
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string; errors?: { path: string; msg: string }[] }; status?: number } };
        if (e.response?.status === 409) {
          setFieldErrors({ customer_code: 'Mã khách hàng đã tồn tại' });
          return;
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Mã khách hàng <span className="text-red-500">*</span>
        </label>
        <Input
          value={form.customer_code}
          onChange={(e) => setForm((f) => ({ ...f, customer_code: e.target.value }))}
          placeholder="VD: KH001"
          error={fieldErrors.customer_code}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Tên khách hàng <span className="text-red-500">*</span>
        </label>
        <Input
          value={form.customer_name}
          onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
          placeholder="Nhập tên khách hàng"
          error={fieldErrors.customer_name}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Ghi chú
        </label>
        <Input
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Ghi chú thêm..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>
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
  );
}

export function InnerCityCustomerFormModal({ isOpen, onClose, onSuccess, onError, customer }: Props) {
  const isEdit = !!customer;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Sửa khách hàng nội thành' : 'Thêm khách hàng nội thành'} size="md">
      {isOpen && (
        <FormContent
          key={customer?.id ?? 'new'}
          customer={customer}
          onSuccess={onSuccess}
          onError={onError}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
