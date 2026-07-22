import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, FileText, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { useGetVehicles } from '../../hooks/useVehicleCatalog';
import { useCreateRepair, useUpdateRepair } from '../../hooks/useVehicleRepairs';
import { vehicleRepairApi } from '../../api/vehicleRepairApi';
import type { RepairItem, RepairImage } from '../../api/vehicleRepairApi';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';

interface RepairFormState {
  vehicle_id: string | number;
  repair_date: string;
  garage_name: string;
  notes: string;
  items: { item_name: string; parts_cost: string; labor_cost: string }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  repairId?: number;
  viewMode?: boolean;
  preselectedVehicleId?: number;
}

function emptyItem() {
  return { item_name: '', parts_cost: '', labor_cost: '' };
}

function isImageFile(mimeType: string | null): boolean {
  return mimeType ? mimeType.startsWith('image/') : false;
}

export function RepairFormModal({ isOpen, onClose, onSuccess, onError, repairId, viewMode = false, preselectedVehicleId }: Props) {
  const isView = viewMode;
  const createMutation = useCreateRepair();
  const updateMutation = useUpdateRepair();

  const [form, setForm] = useState<RepairFormState>({
    vehicle_id: '',
    repair_date: '',
    garage_name: '',
    notes: '',
    items: [emptyItem()],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, Record<string, string>>>({});
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<RepairImage[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const { data: vehiclesData } = useGetVehicles('', 'active', 'Xe nhà', 1, 200);
  const vehicles = vehiclesData?.vehicles ?? [];

  useEffect(() => {
    if (isOpen) {
      if (isView && repairId) {
        vehicleRepairApi.fetchById(repairId).then((r) => {
          setForm({
            vehicle_id: r.vehicle_id ?? '',
            repair_date: r.repair_date ? r.repair_date.split('T')[0] : '',
            garage_name: r.garage_name ?? '',
            notes: r.notes ?? '',
            items: (r.items && r.items.length > 0)
              ? r.items.map((item) => ({
                  item_name: item.item_name,
                  parts_cost: item.parts_cost > 0 ? String(item.parts_cost) : '',
                  labor_cost: item.labor_cost > 0 ? String(item.labor_cost) : '',
                }))
              : [emptyItem()],
          });
          setExistingImages(r.images ?? []);
        });
        setFieldErrors({});
        setItemErrors({});
        setNewFiles([]);
        return;
      }

      if (repairId && !isView) {
        vehicleRepairApi.fetchById(repairId).then((r) => {
          setForm({
            vehicle_id: r.vehicle_id ?? '',
            repair_date: r.repair_date ? r.repair_date.split('T')[0] : '',
            garage_name: r.garage_name ?? '',
            notes: r.notes ?? '',
            items: (r.items && r.items.length > 0)
              ? r.items.map((item) => ({
                  item_name: item.item_name,
                  parts_cost: item.parts_cost > 0 ? String(item.parts_cost) : '',
                  labor_cost: item.labor_cost > 0 ? String(item.labor_cost) : '',
                }))
              : [emptyItem()],
          });
          setExistingImages(r.images ?? []);
        });
      } else {
        setForm({
          vehicle_id: preselectedVehicleId ?? '',
          repair_date: '',
          garage_name: '',
          notes: '',
          items: [emptyItem()],
        });
        setExistingImages([]);
      }
      setFieldErrors({});
      setItemErrors({});
      setNewFiles([]);
    }
  }, [isOpen, repairId, preselectedVehicleId, isView]);

  const handleClose = () => {
    setFieldErrors({});
    setItemErrors({});
    setNewFiles([]);
    setExistingImages([]);
    onClose();
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const calcItemTotal = (item: { parts_cost: string; labor_cost: string }) => {
    return (parseInt(item.parts_cost, 10) || 0) + (parseInt(item.labor_cost, 10) || 0);
  };

  const grandTotal = form.items.reduce((sum, item) => sum + calcItemTotal(item), 0);

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
    if (!repairId) return;
    try {
      await vehicleRepairApi.deleteImage(repairId, imageId);
      setExistingImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch {
      onError('Không thể xóa file');
    }
  };

  const uploadFiles = async (repairId: number) => {
    for (const file of newFiles) {
      await vehicleRepairApi.uploadImage(repairId, file);
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setItemErrors({});

    const errs: Record<string, string> = {};
    if (!form.vehicle_id) errs.vehicle_id = 'Vui lòng chọn xe';
    if (!form.repair_date) errs.repair_date = 'Vui lòng chọn ngày sửa';
    if (!form.garage_name.trim()) errs.garage_name = 'Vui lòng nhập tên gara';

    const itemErrs: Record<string, Record<string, string>> = {};
    form.items.forEach((item, idx) => {
      const ie: Record<string, string> = {};
      if (!item.item_name.trim()) ie.item_name = 'Vui lòng nhập tên hạng mục';
      if (parseInt(item.parts_cost, 10) < 0) ie.parts_cost = 'Số tiền không được âm';
      if (parseInt(item.labor_cost, 10) < 0) ie.labor_cost = 'Số tiền không được âm';
      if (Object.keys(ie).length > 0) itemErrs[String(idx)] = ie;
    });

    if (Object.keys(errs).length > 0 || Object.keys(itemErrs).length > 0) {
      setFieldErrors(errs);
      setItemErrors(itemErrs);
      return;
    }

    const payload = {
      vehicle_id: Number(form.vehicle_id),
      repair_date: form.repair_date,
      garage_name: form.garage_name.trim(),
      notes: form.notes.trim() || undefined,
      items: form.items.map((item) => ({
        item_name: item.item_name.trim(),
        parts_cost: parseInt(item.parts_cost, 10) || 0,
        labor_cost: parseInt(item.labor_cost, 10) || 0,
      })),
    };

    try {
      if (repairId && !isView) {
        const updated = await updateMutation.mutateAsync({ id: repairId, data: payload });
        if (newFiles.length > 0) {
          setUploadingFiles(true);
          await uploadFiles(updated.id);
          setUploadingFiles(false);
        }
        onSuccess('Đã cập nhật bill sửa xe');
      } else {
        const created = await createMutation.mutateAsync(payload);
        if (newFiles.length > 0) {
          setUploadingFiles(true);
          await uploadFiles(created.id);
          setUploadingFiles(false);
        }
        onSuccess('Đã thêm bill sửa xe');
      }
      handleClose();
    } catch (err: unknown) {
      setUploadingFiles(false);
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string; errors?: { path: string; msg: string }[] } } };
        if (e.response?.data?.errors) {
          const apiErrs: Record<string, string> = {};
          e.response.data.errors.forEach((item) => { apiErrs[item.path] = item.msg; });
          setFieldErrors(apiErrs);
          return;
        }
        onError(e.response?.data?.message || 'Lỗi. Vui lòng thử lại.');
      } else {
        onError('Lỗi kết nối. Vui lòng thử lại.');
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || uploadingFiles;
  const isEdit = !!(repairId && !isView);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isView ? 'Chi tiết sửa xe' : isEdit ? 'Sửa bill sửa xe' : 'Thêm sửa xe mới'} size="lg">
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
                (isEdit || isView) && 'opacity-60 cursor-not-allowed',
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
                Ngày sửa <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.repair_date}
                onChange={(v) => setForm((f) => ({ ...f, repair_date: v }))}
                error={fieldErrors.repair_date}
                disabled={isView}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tên gara <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.garage_name}
                onChange={(e) => setForm((f) => ({ ...f, garage_name: e.target.value }))}
                disabled={isView}
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100',
                  fieldErrors.garage_name ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700',
                  isView && 'opacity-60 cursor-not-allowed',
                )}
                placeholder="Nhập tên gara..."
              />
              {fieldErrors.garage_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.garage_name}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Hạng mục sửa chữa <span className="text-red-500">*</span>
              </label>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Tên hạng mục</div>
                <div className="col-span-2">Tiền phụ tùng</div>
                <div className="col-span-2">Tiền công</div>
                <div className="col-span-1 text-right">Tổng</div>
                {!isView && <div className="col-span-1"></div>}
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {form.items.map((item, idx) => {
                  const itemErr = itemErrors[String(idx)] || {};
                  const itemTotal = calcItemTotal(item);
                  const canDelete = form.items.length > 1;

                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-start">
                      <div className="col-span-1 pt-2 text-sm text-neutral-500 dark:text-neutral-400">
                        {idx + 1}
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                          disabled={isView}
                          className={cn(
                            'w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100',
                            itemErr.item_name ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700',
                            isView && 'opacity-60 cursor-not-allowed',
                          )}
                          placeholder="Tên hạng mục..."
                        />
                        {itemErr.item_name && <p className="text-xs text-red-500 mt-0.5">{itemErr.item_name}</p>}
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.parts_cost}
                          onChange={(e) => updateItem(idx, 'parts_cost', e.target.value)}
                          disabled={isView}
                          className={cn(
                            'w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100',
                            itemErr.parts_cost ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700',
                            isView && 'opacity-60 cursor-not-allowed',
                          )}
                          placeholder="0"
                          min="0"
                        />
                        {itemErr.parts_cost && <p className="text-xs text-red-500 mt-0.5">{itemErr.parts_cost}</p>}
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.labor_cost}
                          onChange={(e) => updateItem(idx, 'labor_cost', e.target.value)}
                          disabled={isView}
                          className={cn(
                            'w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100',
                            itemErr.labor_cost ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700',
                            isView && 'opacity-60 cursor-not-allowed',
                          )}
                          placeholder="0"
                          min="0"
                        />
                        {itemErr.labor_cost && <p className="text-xs text-red-500 mt-0.5">{itemErr.labor_cost}</p>}
                      </div>
                      <div className="col-span-1 pt-2 text-right text-sm text-neutral-600 dark:text-neutral-400">
                        {itemTotal > 0 ? formatCurrency(itemTotal) : '-'}
                      </div>
                      {!isView && (
                        <div className="col-span-1 pt-1.5 flex justify-end">
                          <button
                            onClick={() => removeItem(idx)}
                            disabled={!canDelete}
                            className={cn(
                              'p-1 rounded transition-colors',
                              canDelete
                                ? 'text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'text-neutral-200 dark:text-neutral-700 cursor-not-allowed',
                            )}
                            title={canDelete ? 'Xóa hạng mục' : 'Phải có ít nhất 1 hạng mục'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isView && (
                <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm hạng mục
                  </button>
                </div>
              )}
            </div>

            {fieldErrors.items && <p className="text-xs text-red-500 mt-1">{fieldErrors.items}</p>}

            <div className="flex justify-end mt-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">Tổng cộng:</span>
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(grandTotal)}
              </span>
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
              Ảnh đính kèm
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
                  id="repair-image-upload"
                />
                <label htmlFor="repair-image-upload" className="cursor-pointer">
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
            {(existingImages.length > 0 || newFiles.length > 0) && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group">
                    {isImageFile(img.mime_type) ? (
                      <a href={`/api/vehicle-repairs/files/${img.filename}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`/api/vehicle-repairs/files/${img.filename}`}
                          alt={img.original_filename}
                          className="w-20 h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <a
                        href={`/api/vehicle-repairs/files/${img.filename}`}
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
            )}
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
