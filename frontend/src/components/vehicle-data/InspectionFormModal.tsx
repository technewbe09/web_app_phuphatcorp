import { useState, useEffect } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { useGetVehicles } from '../../hooks/useVehicleCatalog';
import { useCreateInspection, useUpdateInspection } from '../../hooks/useVehicleInspections';
import { vehicleInspectionApi } from '../../api/vehicleInspectionApi';
import type { InspectionRecord, InspectionImage } from '../../api/vehicleInspectionApi';
import { cn } from '../../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  inspection?: InspectionRecord | null;
  viewInspectionId?: number;
  viewMode?: boolean;
  preselectedVehicleId?: number;
}

function isImageFile(mimeType: string | null): boolean {
  return mimeType ? mimeType.startsWith('image/') : false;
}

export function InspectionFormModal({ isOpen, onClose, onSuccess, onError, inspection, viewInspectionId, viewMode = false, preselectedVehicleId }: Props) {
  const isEdit = !!(inspection && !viewMode);
  const isView = viewMode;
  const actualViewId = viewInspectionId || inspection?.id;
  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();

  const [form, setForm] = useState({
    vehicle_id: '' as string | number,
    inspection_date: '',
    expiry_date: '',
    notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<InspectionImage[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);


  const { data: vehiclesData } = useGetVehicles('', 'active', undefined, 1, 200);
  const vehicles = vehiclesData?.vehicles ?? [];

  useEffect(() => {
    if (isOpen) {
      if (isView && actualViewId) {
        vehicleInspectionApi.fetchById(actualViewId).then((r) => {
          setForm({
            vehicle_id: r.vehicle_id ?? '',
            inspection_date: r.inspection_date ? r.inspection_date.split('T')[0] : '',
            expiry_date: r.expiry_date ? r.expiry_date.split('T')[0] : '',
            notes: r.notes ?? '',
          });
          setExistingImages(r.images ?? []);
        });
        setFieldErrors({});
        setNewFiles([]);
        return;
      }

      setForm({
        vehicle_id: preselectedVehicleId ?? inspection?.vehicle_id ?? '',
        inspection_date: inspection?.inspection_date ? inspection.inspection_date.split('T')[0] : '',
        expiry_date: inspection?.expiry_date ? inspection.expiry_date.split('T')[0] : '',
        notes: inspection?.notes ?? '',
      });
      setFieldErrors({});
      setNewFiles([]);

      if (inspection?.images) {
        setExistingImages(inspection.images);
      } else if (inspection) {
        vehicleInspectionApi.fetchById(inspection.id).then((r) => {
          setExistingImages(r.images ?? []);
        });
      } else {
        setExistingImages([]);
      }
    }
  }, [isOpen, inspection, preselectedVehicleId, isView, actualViewId]);

  const handleClose = () => {
    setFieldErrors({});
    setNewFiles([]);
    setExistingImages([]);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, image: 'File quá lớn (tối đa 50MB)' }));
        return;
      }
    }
    setFieldErrors((prev) => ({ ...prev, image: '' }));
    setNewFiles((prev) => [...prev, ...files]);
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!inspection) return;
    try {
      await vehicleInspectionApi.deleteImage(inspection.id, imageId);
      setExistingImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch {
      onError('Không thể xóa file');
    }
  };

  const uploadFiles = async (inspectionId: number) => {
    for (const file of newFiles) {
      await vehicleInspectionApi.uploadImage(inspectionId, file);
    }
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
        if (newFiles.length > 0) {
          setUploadingFiles(true);
          await uploadFiles(inspection.id);
          setUploadingFiles(false);
        }
        onSuccess('Đã cập nhật đăng kiểm');
      } else {
        const created = await createMutation.mutateAsync({
          vehicle_id: Number(form.vehicle_id),
          inspection_date: form.inspection_date,
          expiry_date: form.expiry_date,
          notes: form.notes || undefined,
        });
        if (newFiles.length > 0) {
          setUploadingFiles(true);
          await uploadFiles(created.id);
          setUploadingFiles(false);
        }
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
      setUploadingFiles(false);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || uploadingFiles;

  const renderFilePreview = (
    <div className="flex gap-2 mt-3 flex-wrap">
      {existingImages.map((img) => (
        <div key={img.id} className="relative group">
          {isImageFile(img.mime_type) ? (
            <a href={`/api/vehicle-inspections/files/${img.filename}`} target="_blank" rel="noopener noreferrer">
              <img
                src={`/api/vehicle-inspections/files/${img.filename}`}
                alt={img.original_filename}
                className="w-20 h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 hover:opacity-80 transition-opacity"
              />
            </a>
          ) : (
            <a
              href={`/api/vehicle-inspections/files/${img.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-20 h-20 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <FileText className="w-6 h-6 text-neutral-400" />
              <span className="text-[10px] text-neutral-400">Xem</span>
            </a>
          )}
          {!isView && (
            <button
              onClick={() => handleDeleteExistingImage(img.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Xóa file"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <p className="text-xs text-neutral-500 truncate w-20 mt-1" title={img.original_filename}>
            {img.original_filename.length > 15 ? img.original_filename.slice(0, 12) + '...' : img.original_filename}
          </p>
        </div>
      ))}
      {newFiles.map((file, idx) => (
        <div key={`new-${idx}`} className="relative group">
          {file.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="w-20 h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1">
              <FileText className="w-6 h-6 text-neutral-400" />
              <span className="text-[10px] text-neutral-400">Mới</span>
            </div>
          )}
          <button
            onClick={() => removeNewFile(idx)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Xóa file"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-xs text-neutral-500 truncate w-20 mt-1" title={file.name}>
            {file.name.length > 15 ? file.name.slice(0, 12) + '...' : file.name}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isView ? 'Chi tiết đăng kiểm' : isEdit ? 'Sửa đăng kiểm' : 'Thêm đăng kiểm mới'} size="lg">
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Xe <span className="text-red-500">*</span>
            </label>
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}
              disabled={isEdit || isView}
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
              <DateInput
                value={form.inspection_date}
                onChange={(v) => setForm((f) => ({ ...f, inspection_date: v }))}
                error={fieldErrors.inspection_date}
                disabled={isView}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ngày hết hạn <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.expiry_date}
                onChange={(v) => setForm((f) => ({ ...f, expiry_date: v }))}
                error={fieldErrors.expiry_date}
                disabled={isView}
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
              disabled={isView}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none disabled:opacity-60"
              placeholder="Nhập ghi chú..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              File đính kèm
            </label>
            {!isView && (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                  fieldErrors.image ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500',
                )}
              >
                <input
                  type="file"
                  accept="*/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="inspection-image-upload"
                />
                <label htmlFor="inspection-image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Kéo thả file hoặc click để chọn
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    Tối đa 50MB/file, mọi định dạng
                  </p>
                </label>
              </div>
            )}
            {fieldErrors.image && <p className="text-xs text-red-500 mt-1">{fieldErrors.image}</p>}
            {(existingImages.length > 0 || newFiles.length > 0) && renderFilePreview}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {isView ? (
              <Button variant="outline" type="button" onClick={handleClose}>
                Đóng
              </Button>
            ) : (
              <>
                <Button variant="outline" type="button" onClick={handleClose}>
                  Hủy
                </Button>
                <Button type="button" isLoading={isSubmitting} onClick={handleSubmit}>
                  {isEdit ? 'Lưu' : 'Thêm mới'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
