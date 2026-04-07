import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Plus, ChevronDown, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCreateVehicle, useUpdateVehicle } from '../../hooks/useVehicles';
import { useGetDrivers } from '../../hooks/useDrivers';
import { VEHICLE_LOAI, type Vehicle } from '../../api/vehicleApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  editRow?: Vehicle | null;
}

const schema = yup.object({
  bien_so: yup.string().required('Biển số là bắt buộc').max(50, 'Biển số tối đa 50 ký tự'),
  loai: yup
    .string()
    .required('Loại xe là bắt buộc')
    .oneOf(VEHICLE_LOAI as unknown as string[], 'Loại xe không hợp lệ'),
});

type FormData = yup.InferType<typeof schema>;

export function VehicleFormModal({ isOpen, onClose, onSuccess, editRow }: Props) {
  const isEdit = !!editRow;
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const [bienSoError, setBienSoError] = useState('');
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [freeTextInput, setFreeTextInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: driversData, isLoading: driversLoading, isError: driversError, refetch: refetchDrivers } = useGetDrivers();

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
        reset({ bien_so: editRow.bien_so, loai: editRow.loai });
        setSelectedDrivers(editRow.tai_xe ?? []);
      } else {
        reset({ bien_so: '', loai: '' });
        setSelectedDrivers([]);
      }
      setDriverSearch('');
      setBienSoError('');
      setDropdownOpen(false);
      setFallbackMode(false);
      setFreeTextInput('');
    }
  }, [isOpen, editRow, reset]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDriver = (tenKyHieu: string) => {
    setSelectedDrivers((prev) =>
      prev.includes(tenKyHieu) ? prev.filter((d) => d !== tenKyHieu) : [...prev, tenKyHieu],
    );
  };

  const removeDriver = (tenKyHieu: string) => {
    setSelectedDrivers((prev) => prev.filter((d) => d !== tenKyHieu));
  };

  const addFreeText = () => {
    const name = freeTextInput.trim();
    if (name) {
      setSelectedDrivers((prev) => [...prev, name]);
      setFreeTextInput('');
    }
  };

  const filteredDrivers = driversData
    ? driversData.filter(
        (d) =>
          d.ten_ky_hieu.toLowerCase().includes(driverSearch.toLowerCase()) ||
          (d.ho_ten?.toLowerCase().includes(driverSearch.toLowerCase()) ?? false),
      )
    : [];

  // Drivers that are in selectedDrivers but not in active list (deactivated)
  const activeAliases = new Set(driversData?.map((d) => d.ten_ky_hieu) ?? []);
  const deactivatedSelected = selectedDrivers.filter((alias) => !activeAliases.has(alias));

  const onSubmit = async (data: FormData) => {
    setBienSoError('');
    const payload = {
      bien_so: data.bien_so,
      loai: data.loai,
      tai_xe: selectedDrivers,
    };

    try {
      if (isEdit && editRow) {
        await updateVehicle.mutateAsync({ id: editRow.id, data: payload });
        onSuccess('Cập nhật xe thành công!');
      } else {
        await createVehicle.mutateAsync(payload);
        onSuccess('Tạo xe thành công!');
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string }; status?: number } };
        if (e.response?.status === 409) {
          setBienSoError(e.response.data?.message || 'Biển số đã tồn tại');
          return;
        }
      }
      setBienSoError('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  const handleClose = () => {
    reset();
    setBienSoError('');
    setSelectedDrivers([]);
    setDriverSearch('');
    setDropdownOpen(false);
    setFallbackMode(false);
    setFreeTextInput('');
    onClose();
  };

  const isPending = createVehicle.isPending || updateVehicle.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Chỉnh sửa xe' : 'Tạo mới xe'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Biển số *"
          error={bienSoError || errors.bien_so?.message}
          {...register('bien_so')}
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Loại *
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            {...register('loai')}
          >
            <option value="">— Chọn loại xe —</option>
            {VEHICLE_LOAI.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {errors.loai?.message && (
            <p className="mt-1 text-sm text-red-500">{errors.loai.message}</p>
          )}
        </div>

        {/* Tài xế field */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Tài xế
          </label>

          {driversError && !fallbackMode ? (
            <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 flex-1">
                Không thể tải danh sách tài xế.
              </p>
              <button
                type="button"
                onClick={() => refetchDrivers()}
                className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => setFallbackMode(true)}
                className="text-xs text-neutral-500 hover:underline"
              >
                Nhập thủ công
              </button>
            </div>
          ) : fallbackMode ? (
            // Fallback: free-text mode
            <div className="flex gap-2">
              <input
                type="text"
                value={freeTextInput}
                onChange={(e) => setFreeTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFreeText(); } }}
                placeholder="Nhập tên tài xế..."
                className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={addFreeText}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm
              </button>
            </div>
          ) : (
            // Searchable multi-select dropdown
            <div ref={dropdownRef} className="relative">
              <div
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
              >
                {driversLoading ? (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải...</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => { setDriverSearch(e.target.value); setDropdownOpen(true); }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Tìm tài xế..."
                    className="flex-1 bg-transparent outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                  />
                )}
                <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {dropdownOpen && !driversLoading && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredDrivers.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-neutral-400 dark:text-neutral-500 text-center">
                      {driversData?.length === 0
                        ? 'Chưa có tài xế.'
                        : 'Không tìm thấy tài xế phù hợp.'}
                    </div>
                  ) : (
                    filteredDrivers.map((driver) => {
                      const isSelected = selectedDrivers.includes(driver.ten_ky_hieu);
                      return (
                        <div
                          key={driver.id}
                          onClick={() => toggleDriver(driver.ten_ky_hieu)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                            isSelected ? 'text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-neutral-900 dark:bg-neutral-100 border-neutral-900 dark:border-neutral-100'
                              : 'border-neutral-300 dark:border-neutral-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white dark:text-neutral-900" fill="none" viewBox="0 0 12 12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span>
                            {driver.ten_ky_hieu}
                            {driver.ho_ten && (
                              <span className="text-neutral-400 dark:text-neutral-500 font-normal"> — {driver.ho_ten}</span>
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected tags */}
          {selectedDrivers.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {selectedDrivers.map((alias, idx) => {
                const isDeactivated = deactivatedSelected.includes(alias);
                return (
                  <li
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      isDeactivated
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700'
                        : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                    }`}
                  >
                    {alias}
                    {isDeactivated && <span className="opacity-60">(đã xóa)</span>}
                    <button
                      type="button"
                      onClick={() => removeDriver(alias)}
                      className={`ml-0.5 ${isDeactivated ? 'hover:text-red-500' : 'hover:text-red-300 dark:hover:text-red-600'} transition-colors`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
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
