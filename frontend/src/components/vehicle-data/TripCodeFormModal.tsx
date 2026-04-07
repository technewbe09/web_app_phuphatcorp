import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCreateTripCode, useUpdateTripCode } from '../../hooks/useTripCodes';
import type { TripCode } from '../../api/tripCodeApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  editRow?: TripCode | null;
}

const schema = yup.object({
  ma: yup.string().required('Mã là bắt buộc').max(100, 'Mã tối đa 100 ký tự'),
  tuyen: yup.string().required('Tuyến là bắt buộc').max(255, 'Tuyến tối đa 255 ký tự'),
  so_tien: yup
    .number()
    .nullable()
    .transform((v, orig) => (orig === '' || orig === null || orig === undefined ? null : v))
    .min(0, 'Số tiền không được âm')
    .optional(),
  so_luot: yup
    .number()
    .required('Số lượt là bắt buộc')
    .min(1, 'Số lượt phải >= 1')
    .integer('Số lượt phải là số nguyên'),
  boc_xep: yup.string().oneOf(['yes', 'no'], "Bốc xếp phải là 'yes' hoặc 'no'").required(),
  ghi_chu: yup.string().nullable().max(1000, 'Ghi chú tối đa 1000 ký tự').optional(),
});

type FormData = yup.InferType<typeof schema>;

export function TripCodeFormModal({ isOpen, onClose, onSuccess, editRow }: Props) {
  const isEdit = !!editRow;
  const createTripCode = useCreateTripCode();
  const updateTripCode = useUpdateTripCode();
  const [maError, setMaError] = useState('');

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
          ma: editRow.ma,
          tuyen: editRow.tuyen,
          so_tien: editRow.so_tien ?? undefined,
          so_luot: editRow.so_luot ?? 1,
          boc_xep: editRow.boc_xep === 'yes' ? 'yes' : 'no',
          ghi_chu: editRow.ghi_chu ?? '',
        });
      } else {
        reset({ ma: '', tuyen: '', so_tien: undefined, so_luot: 1, boc_xep: 'no', ghi_chu: '' });
      }
    }
  }, [isOpen, editRow, reset]);

  const onSubmit = async (data: FormData) => {
    setMaError('');
    const payload = {
      ma: data.ma,
      tuyen: data.tuyen,
      so_tien: data.so_tien ?? null,
      so_luot: data.so_luot,
      boc_xep: data.boc_xep,
      ghi_chu: data.ghi_chu || null,
    };

    try {
      if (isEdit && editRow) {
        await updateTripCode.mutateAsync({ id: editRow.id, data: payload });
        onSuccess('Cập nhật mã chuyến thành công!');
      } else {
        await createTripCode.mutateAsync(payload);
        onSuccess('Tạo mã chuyến thành công!');
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string }; status?: number } };
        if (e.response?.status === 409) {
          setMaError(e.response.data?.message || 'Mã đã tồn tại');
          return;
        }
      }
      setMaError('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  const handleClose = () => {
    reset();
    setMaError('');
    onClose();
  };

  const isPending = createTripCode.isPending || updateTripCode.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Chỉnh sửa Mã chuyến' : 'Tạo mới Mã chuyến'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Mã *"
          error={maError || errors.ma?.message}
          {...register('ma')}
        />

        <Input
          label="Tuyến *"
          error={errors.tuyen?.message}
          {...register('tuyen')}
        />

        <div>
          <Input
            label="Số tiền"
            type="number"
            min={0}
            step="any"
            error={errors.so_tien?.message}
            {...register('so_tien')}
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">VNĐ</p>
        </div>

        <Input
          label="Số lượt"
          type="number"
          min={1}
          step={1}
          error={errors.so_luot?.message}
          {...register('so_luot', { valueAsNumber: true })}
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Bốc xếp</label>
          <select
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            {...register('boc_xep')}
          >
            <option value="no">Không</option>
            <option value="yes">Có</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ghi chú</label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            rows={3}
            {...register('ghi_chu')}
          />
          {errors.ghi_chu?.message && (
            <p className="mt-1 text-sm text-red-500">{errors.ghi_chu.message}</p>
          )}
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
