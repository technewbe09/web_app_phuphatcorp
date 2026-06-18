import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUpdateDriverInvoice } from '../../hooks/useDriverInvoices';
import type { DriverInvoice, InvoiceNumber } from '../../api/driverInvoiceApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  invoice: DriverInvoice | null;
}

interface FormValues {
  ma: string;
  ten_tx: string;
  ngay: string;
  so_xe: string;
  noi_giao: string;
  ghi_chu: string;
}

export function DriverInvoiceEditModal({ isOpen, onClose, onSuccess, invoice }: Props) {
  const updateMutation = useUpdateDriverInvoice();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const [soHoaDon, setSoHoaDon] = useState<InvoiceNumber[]>([]);

  useEffect(() => {
    if (invoice) {
      reset({
        ma: invoice.ma,
        ten_tx: invoice.ten_tx,
        ngay: invoice.ngay,
        so_xe: invoice.so_xe,
        noi_giao: invoice.noi_giao,
        ghi_chu: invoice.ghi_chu || '',
      });
      setSoHoaDon(invoice.so_hoa_don.map((n: { so: string; ghi_chu: string }) => ({ ...n })));
    }
  }, [invoice, reset]);

  const handleAddNumber = () => {
    setSoHoaDon((prev) => [...prev, { so: '', ghi_chu: '' }]);
  };

  const handleRemoveNumber = (index: number) => {
    setSoHoaDon((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeNumber = (index: number, value: string) => {
    setSoHoaDon((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], so: value };
      return next;
    });
  };

  const handleChangeNote = (index: number, value: string) => {
    setSoHoaDon((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ghi_chu: value };
      return next;
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!invoice) return;
    try {
      const result = await updateMutation.mutateAsync({
        id: invoice.id,
        data: {
          ...values,
          ghi_chu: values.ghi_chu || null,
          so_hoa_don: soHoaDon.filter((n) => n.so.trim() !== '' && /^\d+$/.test(n.so.trim())),
        },
      });
      const msg = result.reconciled_count && result.reconciled_count > 0
        ? `Cập nhật thành công, cập nhật ${result.reconciled_count} hóa đơn đối chiếu`
        : 'Cập nhật hóa đơn thành công';
      onSuccess(msg);
      onClose();
    } catch {
      onSuccess('Không thể cập nhật hóa đơn');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sửa hóa đơn" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Mã"
            error={errors.ma?.message}
            {...register('ma', { required: 'Mã là bắt buộc' })}
          />
          <Input
            label="Tên TX"
            error={errors.ten_tx?.message}
            {...register('ten_tx', { required: 'Tên TX là bắt buộc' })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ngày"
            type="date"
            error={errors.ngay?.message}
            {...register('ngay', { required: 'Ngày là bắt buộc' })}
          />
          <Input
            label="Số xe"
            error={errors.so_xe?.message}
            {...register('so_xe', { required: 'Số xe là bắt buộc' })}
          />
        </div>
        <Input
          label="Nơi giao"
          error={errors.noi_giao?.message}
          {...register('noi_giao', { required: 'Nơi giao là bắt buộc' })}
        />
        <Input
          label="Ghi chú"
          error={errors.ghi_chu?.message}
          {...register('ghi_chu')}
        />

        {/* Invoice numbers editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Số hóa đơn ({soHoaDon.length})
            </span>
            <button
              type="button"
              onClick={handleAddNumber}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {soHoaDon.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-3 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg">
                Chưa có số hóa đơn nào
              </p>
            ) : (
              soHoaDon.map((num, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Số HĐ #${i + 1}`}
                    value={num.so}
                    onChange={(e) => handleChangeNumber(i, e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Ghi chú..."
                    value={num.ghi_chu}
                    onChange={(e) => handleChangeNote(i, e.target.value)}
                    className="w-36"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNumber(i)}
                    className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
