import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCreateWeightAdjustment, useUpdateWeightAdjustment } from '../../hooks/useWeightAdjustments';
import type { WeightAdjustment } from '../../api/weightAdjustmentApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  editRow: WeightAdjustment | null;
}

interface FormData {
  ma_hang: string;
  ten_hang: string;
  gia_tri_cu: string;
  gia_tri_dieu_chinh: string;
}

interface FormErrors {
  ma_hang?: string;
  ten_hang?: string;
  gia_tri_cu?: string;
  gia_tri_dieu_chinh?: string;
}

const EMPTY_FORM: FormData = {
  ma_hang: '',
  ten_hang: '',
  gia_tri_cu: '',
  gia_tri_dieu_chinh: '',
};

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!form.ma_hang.trim()) {
    errors.ma_hang = 'Mã hàng hóa là bắt buộc';
  } else if (form.ma_hang.length > 100) {
    errors.ma_hang = 'Tối đa 100 ký tự';
  }
  if (!form.ten_hang.trim()) {
    errors.ten_hang = 'Tên hàng hóa là bắt buộc';
  } else if (form.ten_hang.length > 255) {
    errors.ten_hang = 'Tối đa 255 ký tự';
  }
  if (form.gia_tri_cu !== '' && form.gia_tri_cu !== null) {
    const val = parseFloat(form.gia_tri_cu);
    if (isNaN(val) || val < 0) {
      errors.gia_tri_cu = 'Giá trị phải >= 0';
    }
  }
  if (!form.gia_tri_dieu_chinh.trim()) {
    errors.gia_tri_dieu_chinh = 'Giá trị điều chỉnh là bắt buộc';
  } else {
    const val = parseFloat(form.gia_tri_dieu_chinh);
    if (isNaN(val) || val < 0) {
      errors.gia_tri_dieu_chinh = 'Giá trị phải >= 0';
    }
  }
  return errors;
}

export function WeightAdjustmentFormModal({ isOpen, onClose, onSuccess, editRow }: Props) {
  const createMutation = useCreateWeightAdjustment();
  const updateMutation = useUpdateWeightAdjustment();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const isEdit = editRow !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (editRow) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          ma_hang: editRow.ma_hang,
          ten_hang: editRow.ten_hang,
          gia_tri_cu: editRow.gia_tri_cu != null ? String(editRow.gia_tri_cu) : '',
          gia_tri_dieu_chinh: String(editRow.gia_tri_dieu_chinh),
        });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(EMPTY_FORM);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrors({});
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitError('');
    }
  }, [isOpen, editRow]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      ma_hang: form.ma_hang.trim(),
      ten_hang: form.ten_hang.trim(),
      gia_tri_cu: form.gia_tri_cu !== '' ? parseFloat(form.gia_tri_cu) : null,
      gia_tri_dieu_chinh: parseFloat(form.gia_tri_dieu_chinh),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: editRow.id, data: payload });
        onSuccess('Cập nhật thành công!');
      } else {
        await createMutation.mutateAsync(payload);
        onSuccess('Thêm thành công!');
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string }; status?: number } };
        if (e.response?.status === 409) {
          setSubmitError('Mã hàng hóa đã tồn tại');
        } else {
          setSubmitError(e.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
        }
      } else {
        setSubmitError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Sửa điều chỉnh trọng lượng' : 'Thêm điều chỉnh trọng lượng'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {submitError}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Mã hàng hóa <span className="text-red-500">*</span>
          </label>
          <Input
            value={form.ma_hang}
            onChange={(e) => handleChange('ma_hang', e.target.value)}
            placeholder="VD: HH001"
            disabled={isPending}
          />
          {errors.ma_hang && (
            <p className="text-xs text-red-500 dark:text-red-400">{errors.ma_hang}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Tên hàng hóa <span className="text-red-500">*</span>
          </label>
          <Input
            value={form.ten_hang}
            onChange={(e) => handleChange('ten_hang', e.target.value)}
            placeholder="VD: Gạo 25kg"
            disabled={isPending}
          />
          {errors.ten_hang && (
            <p className="text-xs text-red-500 dark:text-red-400">{errors.ten_hang}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Giá trị cũ
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            value={form.gia_tri_cu}
            onChange={(e) => handleChange('gia_tri_cu', e.target.value)}
            placeholder="Nhập giá trị cũ (tùy chọn)"
            disabled={isPending}
          />
          {errors.gia_tri_cu && (
            <p className="text-xs text-red-500 dark:text-red-400">{errors.gia_tri_cu}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Giá trị điều chỉnh <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            value={form.gia_tri_dieu_chinh}
            onChange={(e) => handleChange('gia_tri_dieu_chinh', e.target.value)}
            placeholder="Nhập giá trị điều chỉnh"
            disabled={isPending}
          />
          {errors.gia_tri_dieu_chinh && (
            <p className="text-xs text-red-500 dark:text-red-400">{errors.gia_tri_dieu_chinh}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
