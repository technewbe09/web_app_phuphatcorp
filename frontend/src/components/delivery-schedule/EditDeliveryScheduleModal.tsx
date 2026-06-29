import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { deliveryScheduleApi, type DeliverySchedule, type UpdateSchedulePayload } from '../../api/deliveryScheduleApi';

interface Props {
  isOpen: boolean;
  record: DeliverySchedule | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

type FormValues = {
  ngay: string;
  stt: number;
  noi_giao: string;
  tan: string;
  so_xe: string;
  can_info: string;
  ghi_chu: string;
  loai: 'Giá tấn' | 'Giá chuyến' | '';
};

export function EditDeliveryScheduleModal({ isOpen, record, onClose, onSuccess, onError }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    if (record) {
      reset({
        ngay: record.ngay,
        stt: record.stt,
        noi_giao: record.noi_giao ?? '',
        tan: record.tan != null ? String(record.tan) : '',
        so_xe: record.so_xe ?? '',
        can_info: record.can_info ?? '',
        ghi_chu: record.ghi_chu ?? '',
        loai: record.loai ?? '',
      });
    }
  }, [record, reset]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateSchedulePayload) =>
      deliveryScheduleApi.updateById(record!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] });
      onSuccess('Cập nhật thành công!');
      onClose();
    },
    onError: (err: any) => {
      onError(err?.response?.data?.message ?? 'Không thể cập nhật bản ghi');
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      ngay: values.ngay,
      stt: Number(values.stt),
      noi_giao: values.noi_giao || null,
      tan: values.tan !== '' ? parseFloat(values.tan) : null,
      so_xe: values.so_xe || null,
      can_info: values.can_info || null,
      ghi_chu: values.ghi_chu || null,
      loai: values.loai || null,
    });
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Sửa lịch đi hàng
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Ngày */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Ngày <span className="text-red-500">*</span>
              </label>
              <DateInput
                {...register('ngay', { required: 'Ngày là bắt buộc' })}
                className="text-sm"
              />
              {errors.ngay && (
                <p className="text-xs text-red-500">{errors.ngay.message}</p>
              )}
            </div>

            {/* STT */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                STT <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                {...register('stt', { required: 'STT là bắt buộc', min: { value: 1, message: 'STT phải >= 1' } })}
                className="text-sm"
              />
              {errors.stt && (
                <p className="text-xs text-red-500">{errors.stt.message}</p>
              )}
            </div>
          </div>

          {/* Nơi giao */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Nơi giao</label>
            <Input
              type="text"
              {...register('noi_giao')}
              placeholder="Nhập nơi giao hàng"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tấn */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Tấn</label>
              <Input
                type="number"
                step="0.01"
                {...register('tan')}
                placeholder="0.00"
                className="text-sm"
              />
            </div>

            {/* Số xe */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Số xe</label>
              <Input
                type="text"
                {...register('so_xe')}
                placeholder="Nhập số xe"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cân */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Cân</label>
              <Input
                type="text"
                {...register('can_info')}
                placeholder="Thông tin cân"
                className="text-sm"
              />
            </div>

            {/* Loại */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Loại</label>
              <select
                {...register('loai')}
                className="w-full h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                <option value="">-- Chọn loại --</option>
                <option value="Giá tấn">Giá tấn</option>
                <option value="Giá chuyến">Giá chuyến</option>
              </select>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Ghi chú</label>
            <textarea
              {...register('ghi_chu')}
              rows={2}
              placeholder="Nhập ghi chú..."
              className="w-full px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
