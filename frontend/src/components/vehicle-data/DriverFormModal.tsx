import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCreateDriver, useUpdateDriver } from '../../hooks/useDrivers';
import type { Driver } from '../../api/driverApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  editRow?: Driver | null;
}

const schema = yup.object({
  ten_ky_hieu: yup
    .string()
    .required('Tên ký hiệu là bắt buộc')
    .max(100, 'Tên ký hiệu tối đa 100 ký tự'),
  ho_ten: yup.string().max(255, 'Họ tên tối đa 255 ký tự').optional(),
  lien_he: yup.string().max(100, 'Liên hệ tối đa 100 ký tự').optional(),
  cccd: yup.string().max(50, 'CCCD tối đa 50 ký tự').optional(),
  ghi_chu: yup.string().optional(),
});

type FormData = yup.InferType<typeof schema>;

export function DriverFormModal({ isOpen, onClose, onSuccess, editRow }: Props) {
  const isEdit = !!editRow;
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const [tenKyHieuError, setTenKyHieuError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (isOpen) {
      if (editRow) {
        reset({
          ten_ky_hieu: editRow.ten_ky_hieu,
          ho_ten: editRow.ho_ten ?? '',
          lien_he: editRow.lien_he ?? '',
          cccd: editRow.cccd ?? '',
          ghi_chu: editRow.ghi_chu ?? '',
        });
      } else {
        reset({ ten_ky_hieu: '', ho_ten: '', lien_he: '', cccd: '', ghi_chu: '' });
      }
      setTenKyHieuError('');
    }
  }, [isOpen, editRow, reset]);

  const onSubmit = async (data: FormData) => {
    setTenKyHieuError('');
    const payload = {
      ten_ky_hieu: data.ten_ky_hieu,
      ho_ten: data.ho_ten || null,
      lien_he: data.lien_he || null,
      cccd: data.cccd || null,
      ghi_chu: data.ghi_chu || null,
    };

    try {
      if (isEdit && editRow) {
        await updateDriver.mutateAsync({ id: editRow.id, data: payload });
        onSuccess('Cập nhật tài xế thành công!');
      } else {
        await createDriver.mutateAsync(payload);
        onSuccess('Tạo tài xế thành công!');
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string }; status?: number } };
        if (e.response?.status === 409) {
          setTenKyHieuError(e.response.data?.message || 'Tên ký hiệu đã tồn tại');
          return;
        }
      }
      setTenKyHieuError('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  const handleClose = () => {
    reset();
    setTenKyHieuError('');
    onClose();
  };

  const isPending = createDriver.isPending || updateDriver.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Chỉnh sửa tài xế' : 'Tạo mới tài xế'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            label="Tên ký hiệu *"
            error={tenKyHieuError || errors.ten_ky_hieu?.message}
            {...register('ten_ky_hieu')}
          />
          {isEdit && !tenKyHieuError && (
            <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Thay đổi tên ký hiệu có thể ảnh hưởng đến lịch sử dữ liệu xe.
              </p>
            </div>
          )}
        </div>

        <Input
          label="Họ tên"
          error={errors.ho_ten?.message}
          {...register('ho_ten')}
        />

        <Input
          label="Liên hệ"
          placeholder="Số điện thoại / email..."
          error={errors.lien_he?.message}
          {...register('lien_he')}
        />

        <Input
          label="CCCD"
          error={errors.cccd?.message}
          {...register('cccd')}
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Ghi chú
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none"
            {...register('ghi_chu')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
