import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';
import dayjs from 'dayjs';
import { Button } from '../ui/Button';
import { deliveryScheduleApi, type DeliverySchedule } from '../../api/deliveryScheduleApi';

interface Props {
  isOpen: boolean;
  record: DeliverySchedule | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function DeleteDeliveryScheduleModal({ isOpen, record, onClose, onSuccess, onError }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deliveryScheduleApi.deleteById(record!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] });
      onSuccess('Đã xóa bản ghi thành công!');
      onClose();
    },
    onError: (err: any) => {
      onError(err?.response?.data?.message ?? 'Không thể xóa bản ghi');
    },
  });

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Xác nhận xóa
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Bạn có chắc chắn muốn xóa bản ghi này không?
          </p>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Ngày:</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {dayjs(record.ngay).format('DD/MM/YYYY')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">STT:</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{record.stt}</span>
            </div>
            {record.noi_giao && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Nơi giao:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200 max-w-[180px] truncate text-right">{record.noi_giao}</span>
              </div>
            )}
            {record.so_xe && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Số xe:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{record.so_xe}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-red-500">Hành động này không thể hoàn tác.</p>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Đang xóa...' : 'Xóa bản ghi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
