import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useCreateFuelRecord, useUpdateFuelRecord } from '../../hooks/useFuelRecords';
import { fuelRecordApi } from '../../api/fuelRecordApi';
import type { FuelRecord, CreateFuelRecordInput, FuelRecordImage } from '../../types/fuelRecord';
import type { Vehicle } from '../../api/vehicleCatalogApi';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  record: FuelRecord | null;
  vehicles: Vehicle[];
}

export function EditFuelRecordModal({ isOpen, onClose, onSuccess, onError, record, vehicles }: Props) {
  const createMutation = useCreateFuelRecord();
  const updateMutation = useUpdateFuelRecord();
  const isEdit = record !== null;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [createdRecordId, setCreatedRecordId] = useState<number | null>(null);
  const [images, setImages] = useState<FuelRecordImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRecordId = record?.id ?? createdRecordId;
  const showImages = isEdit || createdRecordId !== null;

  const [form, setForm] = useState<CreateFuelRecordInput>({
    vehicle_id: 0,
    record_date: '',
    odometer_old: 0,
    odometer_new: 0,
    liters: 0,
    gps_old: null,
    gps_new: null,
    gps_liters: null,
    unit_price: 0,
  });

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.vehicle_id) e.vehicle_id = 'Vui lòng chọn xe';
    if (!form.odometer_old && form.odometer_old !== 0) e.odometer_old = 'Vui lòng nhập số KM cũ';
    if (!form.odometer_new && form.odometer_new !== 0) e.odometer_new = 'Vui lòng nhập số KM đổ';
    else if (form.odometer_new <= form.odometer_old) e.odometer_new = 'Số KM đổ phải lớn hơn số KM cũ';
    if (!form.liters && form.liters !== 0) e.liters = 'Vui lòng nhập số lít';
    else if (form.liters <= 0) e.liters = 'Số lít phải lớn hơn 0';
    if (!form.unit_price && form.unit_price !== 0) e.unit_price = 'Vui lòng nhập đơn giá';
    else if (form.unit_price <= 0) e.unit_price = 'Đơn giá phải lớn hơn 0';
    return e;
  }, [form]);

  const showError = (field: string) => touched[field] && errors[field];

  const resetState = useCallback(() => {
    setCreatedRecordId(null);
    setImages([]);
    setTouched({});
  }, []);

  useEffect(() => {
    if (record) {
      setForm({
        vehicle_id: record.vehicle_id,
        record_date: record.record_date?.split('T')[0] ?? '',
        odometer_old: record.odometer_old,
        odometer_new: record.odometer_new,
        liters: record.liters,
        gps_old: record.gps_old,
        gps_new: record.gps_new,
        gps_liters: record.gps_liters,
        unit_price: record.unit_price,
      });
    } else {
      setForm({
        vehicle_id: vehicles[0]?.id || 0,
        record_date: new Date().toISOString().split('T')[0],
        odometer_old: 0,
        odometer_new: 0,
        liters: 0,
        gps_old: null,
        gps_new: null,
        gps_liters: null,
        unit_price: 0,
      });
    }
    resetState();
  }, [record, vehicles, isOpen, resetState]);

  // Fetch images when record becomes available
  useEffect(() => {
    if (activeRecordId) {
      fuelRecordApi.fetchImages(activeRecordId).then(setImages).catch(() => {});
    }
  }, [activeRecordId]);

  const handleSubmit = async () => {
    setTouched({ vehicle_id: true, odometer_old: true, odometer_new: true, liters: true, unit_price: true });
    if (Object.keys(errors).length > 0) return;
    try {
      if (isEdit && record) {
        await updateMutation.mutateAsync({ id: record.id, input: form });
        onSuccess('Đã cập nhật bản ghi');
        onClose();
      } else {
        const created = await createMutation.mutateAsync(form);
        setCreatedRecordId(created.id);
        onSuccess('Đã tạo bản ghi. Bạn có thể thêm ảnh bên dưới.');
      }
    } catch {
      onError('Lỗi khi lưu bản ghi');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!activeRecordId) return;
    setUploadingImage(true);
    try {
      const img = await fuelRecordApi.uploadImage(activeRecordId, file);
      setImages((prev) => [img, ...prev]);
    } catch {
      onError('Lỗi khi upload ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (imageId: number) => {
    if (!activeRecordId) return;
    try {
      await fuelRecordApi.deleteImage(activeRecordId, imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch {
      onError('Lỗi khi xóa ảnh');
    }
  };

  const updateField = (field: keyof CreateFuelRecordInput, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fetchLatestOdometer = useCallback(async (vehicleId: number) => {
    if (!vehicleId || isEdit) return;
    try {
      const latest = await fuelRecordApi.fetchLatestOdometer(vehicleId);
      if (latest != null) {
        setForm((prev) => ({ ...prev, odometer_old: latest, odometer_new: 0 }));
      }
    } catch {
      // silently ignore
    }
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit && form.vehicle_id > 0) {
      fetchLatestOdometer(form.vehicle_id);
    }
  }, [form.vehicle_id, isEdit, fetchLatestOdometer]);

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const recordSaved = !isEdit && createdRecordId !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Sửa bản ghi dầu' : (createdRecordId ? 'Bản ghi đã tạo — thêm ảnh' : 'Thêm bản ghi dầu')}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Xe <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.vehicle_id}
              onChange={(e) => { updateField('vehicle_id', parseInt(e.target.value, 10)); setTouched((p) => ({ ...p, vehicle_id: true })); }}
              disabled={isLoading || recordSaved}
              options={vehicles.map((v) => ({
                value: String(v.id),
                label: `${v.plate_number} - ${v.driver_name}`,
              }))}
            />
            {showError('vehicle_id') && <p className="text-xs text-red-500 mt-1">{errors.vehicle_id}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ngày</label>
            <Input
              type="date"
              value={form.record_date}
              onChange={(e) => updateField('record_date', e.target.value)}
              disabled={isLoading || recordSaved}
            />
          </div>
        </div>

        <fieldset className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
          <legend className="text-sm font-medium text-neutral-700 dark:text-neutral-300 px-1">Số thực tế (tài xế ghi)</legend>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Số KM cũ <span className="text-red-500">*</span></label>
              <Input
                type="number"
                step="0.1"
                value={form.odometer_old}
                onChange={(e) => updateField('odometer_old', parseFloat(e.target.value) || 0)}
                onBlur={() => setTouched((p) => ({ ...p, odometer_old: true }))}
                disabled={isLoading || recordSaved}
              />
              {showError('odometer_old') && <p className="text-xs text-red-500 mt-1">{errors.odometer_old}</p>}
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Số KM đổ <span className="text-red-500">*</span></label>
              <Input
                type="number"
                step="0.1"
                value={form.odometer_new}
                onChange={(e) => updateField('odometer_new', parseFloat(e.target.value) || 0)}
                onBlur={() => setTouched((p) => ({ ...p, odometer_new: true }))}
                disabled={isLoading || recordSaved}
              />
              {showError('odometer_new') && <p className="text-xs text-red-500 mt-1">{errors.odometer_new}</p>}
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Lít <span className="text-red-500">*</span></label>
              <Input
                type="number"
                step="0.01"
                value={form.liters}
                onChange={(e) => updateField('liters', parseFloat(e.target.value) || 0)}
                onBlur={() => setTouched((p) => ({ ...p, liters: true }))}
                disabled={isLoading || recordSaved}
              />
              {showError('liters') && <p className="text-xs text-red-500 mt-1">{errors.liters}</p>}
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
          <legend className="text-sm font-medium text-neutral-700 dark:text-neutral-300 px-1">Định vị GPS (tùy chọn)</legend>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">GPS cũ</label>
              <Input
                type="number"
                step="0.1"
                value={form.gps_old ?? ''}
                onChange={(e) => updateField('gps_old', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={isLoading || recordSaved}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">GPS mới</label>
              <Input
                type="number"
                step="0.1"
                value={form.gps_new ?? ''}
                onChange={(e) => updateField('gps_new', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={isLoading || recordSaved}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">GPS lít</label>
              <Input
                type="number"
                step="0.01"
                value={form.gps_liters ?? ''}
                onChange={(e) => updateField('gps_liters', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={isLoading || recordSaved}
              />
            </div>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Đơn giá (VNĐ/lít) <span className="text-red-500">*</span></label>
          <Input
            type="number"
            step="1"
            value={form.unit_price}
            onChange={(e) => updateField('unit_price', parseFloat(e.target.value) || 0)}
            onBlur={() => setTouched((p) => ({ ...p, unit_price: true }))}
            disabled={isLoading || recordSaved}
          />
          {showError('unit_price') && <p className="text-xs text-red-500 mt-1">{errors.unit_price}</p>}
        </div>

        {form.odometer_new > form.odometer_old && form.liters > 0 && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 space-y-1">
            <p>Km đi: <span className="font-medium">{(form.odometer_new - form.odometer_old).toLocaleString('vi-VN')} km</span></p>
            <p>L/100km: <span className="font-medium">{((form.liters * 100) / (form.odometer_new - form.odometer_old)).toFixed(2)}</span></p>
            <p>Thành tiền: <span className="font-medium">{(form.liters * form.unit_price).toLocaleString('vi-VN')} VNĐ</span></p>
          </div>
        )}

        {/* ── Image Section ── */}
        {showImages && (
          <fieldset className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
            <legend className="text-sm font-medium text-neutral-700 dark:text-neutral-300 px-1">Hình ảnh căn cứ</legend>
            <div className="space-y-3 mt-2">
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img
                        src={`/uploads/fuel-images/${img.filename}`}
                        alt={img.original_filename}
                        className="w-full h-28 object-cover"
                      />
                      <button
                        onClick={() => handleImageDelete(img.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 mr-2" />
                  )}
                  Thêm ảnh
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                    e.target.value = '';
                  }}
                />
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {images.length} ảnh
                </span>
              </div>
            </div>
          </fieldset>
        )}

        {!recordSaved && (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button
              type="button"
              isLoading={isLoading}
              disabled={!form.record_date}
              onClick={handleSubmit}
            >
              Tạo
            </Button>
          </div>
        )}
        {recordSaved && (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
            {isEdit && (
              <Button
                type="button"
                isLoading={isLoading}
                disabled={!form.record_date}
                onClick={handleSubmit}
              >
                Cập nhật
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
