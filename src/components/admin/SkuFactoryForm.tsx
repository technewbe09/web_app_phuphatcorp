import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateSku, useUpdateSku } from '@/hooks/useSkuFactory';
import type { SkuItem, CreateSkuInput, UpdateSkuInput } from '@/api/masterData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SkuFactoryFormProps {
  mode: 'create' | 'edit';
  initialData?: SkuItem;
  onSuccess: () => void;
  onCancel: () => void;
}

const FACTORIES = ['CLF', 'VFM', 'MCC', 'CLV', 'NDFC'] as const;

interface FormErrors {
  ma_hang_hoa?: string;
  ten_hang_vn?: string;
  factory?: string;
  trong_luong_net?: string;
}

export default function SkuFactoryForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: SkuFactoryFormProps) {
  const { t } = useTranslation();
  const createSku = useCreateSku();
  const updateSku = useUpdateSku();

  const [formData, setFormData] = useState<CreateSkuInput>({
    ma_hang_hoa: initialData?.ma_hang_hoa ?? '',
    ten_hang_vn: initialData?.ten_hang_vn ?? '',
    ten_hang_en: initialData?.ten_hang_en ?? '',
    ma_nha_cung_cap: initialData?.ma_nha_cung_cap ?? '',
    factory: initialData?.factory ?? ('' as CreateSkuInput['factory']),
    dvt: initialData?.dvt ?? '',
    trong_luong_net: initialData?.trong_luong_net ?? 0,
    so_giao_dich: initialData?.so_giao_dich ?? null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const isPending = createSku.isPending || updateSku.isPending;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (mode === 'create' && !formData.ma_hang_hoa.trim()) {
      newErrors.ma_hang_hoa = t('masterData.skuFactoryList.validation.maHangHoaRequired');
    }
    if (!formData.ten_hang_vn.trim()) {
      newErrors.ten_hang_vn = t('masterData.skuFactoryList.validation.tenHangVnRequired');
    }
    if (!formData.factory) {
      newErrors.factory = t('masterData.skuFactoryList.validation.factoryRequired');
    }
    if (formData.trong_luong_net <= 0) {
      newErrors.trong_luong_net = t('masterData.skuFactoryList.validation.trongLuongNetPositive');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      ten_hang_en: formData.ten_hang_en || null,
      ma_nha_cung_cap: formData.ma_nha_cung_cap || null,
      dvt: formData.dvt || null,
      so_giao_dich: formData.so_giao_dich ?? null,
    };

    if (mode === 'create') {
      createSku.mutate(payload, {
        onSuccess: () => {
          toast.success(t('common.createSuccess'));
          onSuccess();
        },
        onError: (error: unknown) => {
          const err = error as {
            response?: {
              data?: {
                error?: { message?: string; code?: string };
              };
            };
          };
          const errorCode = err?.response?.data?.error?.code;
          const errorMsg = err?.response?.data?.error?.message;
          if (errorCode === 'DUPLICATE_KEY') {
            setErrors({ ma_hang_hoa: t('masterData.skuFactoryList.validation.duplicateMaHangHoa') });
          } else {
            toast.error(errorMsg || t('common.error'));
          }
        },
      });
    } else {
      if (!initialData?.id) return;
      const updatePayload: UpdateSkuInput = {
        ten_hang_vn: formData.ten_hang_vn,
        ten_hang_en: formData.ten_hang_en || null,
        ma_nha_cung_cap: formData.ma_nha_cung_cap || null,
        factory: formData.factory as string,
        dvt: formData.dvt || null,
        trong_luong_net: formData.trong_luong_net,
        so_giao_dich: formData.so_giao_dich ?? null,
      };
      updateSku.mutate(
        { id: initialData.id, data: updatePayload },
        {
          onSuccess: () => {
            toast.success(t('common.updateSuccess'));
            onSuccess();
          },
          onError: (error: unknown) => {
            const err = error as {
              response?: {
                data?: {
                  error?: { message?: string };
                };
              };
            };
            toast.error(err?.response?.data?.error?.message || t('common.error'));
          },
        }
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('masterData.skuFactoryList.form.createTitle')
              : t('masterData.skuFactoryList.form.editTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Mã hàng hóa */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ma_hang_hoa" className="text-right">
                {t('masterData.skuFactoryList.form.maHangHoaLabel')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="ma_hang_hoa"
                  value={formData.ma_hang_hoa}
                  onChange={(e) => {
                    setFormData(f => ({ ...f, ma_hang_hoa: e.target.value }));
                    if (errors.ma_hang_hoa) setErrors(err => ({ ...err, ma_hang_hoa: undefined }));
                  }}
                  placeholder={t('masterData.skuFactoryList.form.maHangHoaPlaceholder')}
                  disabled={mode === 'edit'}
                  className={errors.ma_hang_hoa ? 'border-destructive' : ''}
                />
                {errors.ma_hang_hoa && (
                  <p className="text-sm text-destructive mt-1">{errors.ma_hang_hoa}</p>
                )}
              </div>
            </div>

            {/* Tên hàng hóa VN */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ten_hang_vn" className="text-right">
                {t('masterData.skuFactoryList.form.tenHangVnLabel')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="ten_hang_vn"
                  value={formData.ten_hang_vn}
                  onChange={(e) => {
                    setFormData(f => ({ ...f, ten_hang_vn: e.target.value }));
                    if (errors.ten_hang_vn) setErrors(err => ({ ...err, ten_hang_vn: undefined }));
                  }}
                  placeholder={t('masterData.skuFactoryList.form.tenHangVnPlaceholder')}
                  className={errors.ten_hang_vn ? 'border-destructive' : ''}
                />
                {errors.ten_hang_vn && (
                  <p className="text-sm text-destructive mt-1">{errors.ten_hang_vn}</p>
                )}
              </div>
            </div>

            {/* Tên hàng hóa EN */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ten_hang_en" className="text-right">
                {t('masterData.skuFactoryList.form.tenHangEnLabel')}
              </Label>
              <Input
                id="ten_hang_en"
                value={formData.ten_hang_en ?? ''}
                onChange={(e) => setFormData(f => ({ ...f, ten_hang_en: e.target.value || null }))}
                placeholder={t('masterData.skuFactoryList.form.tenHangEnPlaceholder')}
                className="col-span-3"
              />
            </div>

            {/* Mã nhà cung cấp */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ma_nha_cung_cap" className="text-right">
                {t('masterData.skuFactoryList.form.maNhaCungCapLabel')}
              </Label>
              <Input
                id="ma_nha_cung_cap"
                value={formData.ma_nha_cung_cap ?? ''}
                onChange={(e) => setFormData(f => ({ ...f, ma_nha_cung_cap: e.target.value || null }))}
                placeholder={t('masterData.skuFactoryList.form.maNhaCungCapPlaceholder')}
                className="col-span-3"
              />
            </div>

            {/* Factory */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="factory" className="text-right">
                {t('masterData.skuFactoryList.form.factoryLabel')}
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.factory as string}
                  onValueChange={(v) => {
                    setFormData(f => ({ ...f, factory: v as CreateSkuInput['factory'] }));
                    if (errors.factory) setErrors(err => ({ ...err, factory: undefined }));
                  }}
                >
                  <SelectTrigger className={errors.factory ? 'border-destructive' : ''}>
                    <SelectValue placeholder={t('masterData.skuFactoryList.form.factoryLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {FACTORIES.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.factory && (
                  <p className="text-sm text-destructive mt-1">{errors.factory}</p>
                )}
              </div>
            </div>

            {/* ĐVT */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dvt" className="text-right">
                {t('masterData.skuFactoryList.form.dvtLabel')}
              </Label>
              <Input
                id="dvt"
                value={formData.dvt ?? ''}
                onChange={(e) => setFormData(f => ({ ...f, dvt: e.target.value || null }))}
                placeholder={t('masterData.skuFactoryList.form.dvtPlaceholder')}
                className="col-span-3"
              />
            </div>

            {/* Trọng lượng Net */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trong_luong_net" className="text-right">
                {t('masterData.skuFactoryList.form.trongLuongNetLabel')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="trong_luong_net"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.trong_luong_net}
                  onChange={(e) => {
                    setFormData(f => ({ ...f, trong_luong_net: parseFloat(e.target.value) || 0 }));
                    if (errors.trong_luong_net) setErrors(err => ({ ...err, trong_luong_net: undefined }));
                  }}
                  placeholder={t('masterData.skuFactoryList.form.trongLuongNetPlaceholder')}
                  className={errors.trong_luong_net ? 'border-destructive' : ''}
                />
                {errors.trong_luong_net && (
                  <p className="text-sm text-destructive mt-1">{errors.trong_luong_net}</p>
                )}
              </div>
            </div>

            {/* Số giao dịch */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="so_giao_dich" className="text-right">
                {t('masterData.skuFactoryList.form.soGiaoDichLabel')}
              </Label>
              <Input
                id="so_giao_dich"
                type="number"
                min="0"
                value={formData.so_giao_dich ?? ''}
                onChange={(e) =>
                  setFormData(f => ({
                    ...f,
                    so_giao_dich: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder={t('masterData.skuFactoryList.form.soGiaoDichPlaceholder')}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.loading') : mode === 'create'
                ? t('masterData.skuFactoryList.form.submitCreate')
                : t('masterData.skuFactoryList.form.submitUpdate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
