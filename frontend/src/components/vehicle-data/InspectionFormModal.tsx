import { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useGetVehicles } from '../../hooks/useVehicleCatalog';
import { useCreateInspection, useUpdateInspection } from '../../hooks/useVehicleInspections';
import type { InspectionRecord } from '../../api/vehicleInspectionApi';
import { cn } from '../../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  inspection: InspectionRecord | null;
}

export function InspectionFormModal({ isOpen, onClose, onSuccess, onError, inspection }: Props) {
  const isEdit = !!inspection;
  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();

  const [form, setForm] = useState({
    vehicle_id: inspection?.vehicle_id ?? '' as string | number,
    inspection_date: inspection?.inspection_date ? inspection.inspection_date.split('T')[0] : '',
    expiry_date: inspection?.expiry_date ? inspection.expiry_date.split('T')[0] : '',
    notes: inspection?.notes ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: vehiclesData } = useGetVehicles('', 'active', 1, 200);
  const vehicles = vehiclesData?.vehicles ?? [];

  useEffect(() => {
    if (isOpen) {
      setForm({
        vehicle_id: inspection?.vehicle_id ?? '',
        inspection_date: inspection?.inspection_date ? inspection.inspection_date.split('T')[0] : '',
        expiry_date: inspection?.expiry_date ? inspection.expiry_date.split('T')[0] : '',
        notes: inspection?.notes ?? '',
      });
      setFieldErrors({});
      setUploadedFiles([]);
    }
  }, [isOpen, inspection]);

  const handleClose = () => {
    setFieldErrors({});
    setUploadedFiles([]);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, image: 'File quá lớn (tối đa 10MB)' }));
        return;
      }
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setFieldErrors((prev) => ({ ...prev, image: 'Chỉ chấp nhận file ảnh hoặc PDF' }));
        return;
      }
    }
    setFieldErrors((prev) => ({ ...prev, image: '' }));
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setFieldErrors({});

    if (!form.vehicle_id) {
      setFieldErrors({ vehicle_id: 'Vui lòng chọn xe' });
      return;
    }
    if (!form.inspection_date) {
      setFieldErrors({ inspection_date: 'Vui lòng chọn ngày đăng kiểm' });
      return;
    }
    if (!form.expiry_date) {
      setFieldErrors({ expiry_date: 'Vui lòng chọn ngày hết hạn' });
      return;
    }
    if (new Date(form.expiry_date) <= new Date(form.inspection_date)) {
      setFieldErrors({ expiry_date: 'Ngày hết hạn phải sau ngày đăng kiểm' });
      return;
    }

    try {
      if (isEdit && inspection) {
        await updateMutation.mutateAsync({
          id: inspection.id,
          data: {
            inspection_date: form.inspection_date,
            expiry_date: form.expiry_date,
            notes: form.notes || undefined,
          },
        });
        onSuccess('Đã cập nhật đăng kiểm');
      } else {
        await createMutation.mutateAsync({
          vehicle_id: Number(form.vehicle_id),
          inspection_date: form.inspection_date,
          expiry_date: form.expiry_date,
          notes: form.notes || undefined,
        });
        onSuccess('Đã thêm đăng kiểm');
      }
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string; errors?: { path: string; msg: string }[] } } };
        if (e.response?.data?.errors) {
          const errs: Record<string, string> = {};
          e.response.data.errors.forEach((item) => { errs[item.path] = item.msg; });
          setFieldErrors(errs);
          return;
        }
        onError(e.response?.data?.message || 'Lỗi. Vui lòng thử lại.');
      } else {
        onError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Sửa đăng kiểm' : 'Thêm đăng kiểm mới'} size="lg">
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Xe <span className="text-red-500">*</span>
            </label>
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}
              disabled={isEdit}
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100',
                fieldErrors.vehicle_id ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700',
                isEdit && 'opacity-60 cursor-not-allowed',
              )}
            >
              <option value="">Chọn xe...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} - {v.driver_name}
                </option>
              ))}
            </select>
            {fieldErrors.vehicle_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.vehicle_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ngày đăng kiểm <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.inspection_date}
                onChange={(e) => setForm((f) => ({ ...f, inspection_date: e.target.value }))}
                error={fieldErrors.inspection_date}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ngày hết hạn <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                error={fieldErrors.expiry_date}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
              placeholder="Nhập ghi chú..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Ảnh scan (tùy chọn)
            </label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                fieldErrors.image ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500',
              )}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="inspection-image-upload"
              />
              <label htmlFor="inspection-image-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Kéo thả ảnh hoặc click để chọn
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Tối đa 10MB/file, định dạng JPG, PNG, PDF
                </p>
              </label>
            </div>
            {fieldErrors.image && <p className="text-xs text-red-500 mt-1">{fieldErrors.image}</p>}
            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-20 h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                    />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-neutral-500 truncate w-20 mt-1">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="button" isLoading={isSubmitting} onClick={handleSubmit}>
              {isEdit ? 'Lưu' : 'Thêm mới'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
