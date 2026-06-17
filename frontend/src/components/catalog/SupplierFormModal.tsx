import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSupplierCatalog';
import type { Supplier, SupplierData } from '../../api/supplierCatalogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  supplier?: Supplier | null;
}

const schema = yup.object({
  supplier_code: yup.string().required('Mã NCC là bắt buộc').max(20, 'Mã NCC tối đa 20 ký tự'),
  name: yup.string().required('Tên nhà máy là bắt buộc').max(255, 'Tên nhà máy tối đa 255 ký tự'),
  notes: yup.string().nullable().optional(),
});

type FormValues = {
  supplier_code: string;
  name: string;
  notes?: string | null;
};

export function SupplierFormModal({ isOpen, onClose, onSuccess, onError, supplier }: Props) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      supplier_code: '',
      name: '',
      notes: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (supplier) {
      reset({
        supplier_code: supplier.supplier_code,
        name: supplier.name,
        notes: supplier.notes || '',
      });
    } else {
      reset({
        supplier_code: '',
        name: '',
        notes: '',
      });
    }
  }, [supplier, isOpen, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    const data: SupplierData = {
      supplier_code: values.supplier_code,
      name: values.name,
      notes: values.notes || null,
    };

    try {
      if (isEdit && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, data });
        onSuccess('Đã cập nhật nhà cung cấp.');
      } else {
        await createSupplier.mutateAsync(data);
        onSuccess('Đã thêm nhà cung cấp.');
      }
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { status?: number; data?: { message?: string } } };
        if (e.response?.status === 409) {
          onError(e.response?.data?.message || 'Mã NCC đã tồn tại');
          return;
        }
      }
      onError('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Mã NCC <span className="text-red-500">*</span>
          </label>
          <Input {...register('supplier_code')} placeholder="Mã nhà cung cấp" />
          {errors.supplier_code && (
            <p className="mt-1 text-xs text-red-500">{errors.supplier_code.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Tên nhà máy <span className="text-red-500">*</span>
          </label>
          <Input {...register('name')} placeholder="Tên nhà máy" />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Ghi chú
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Ghi chú..."
            className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={handleClose}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isPending} disabled={!isValid || isPending}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
