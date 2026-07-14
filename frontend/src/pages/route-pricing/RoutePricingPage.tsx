import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPinned, Percent, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supplierCatalogApi } from '../../api/supplierCatalogApi';
import {
  useGroups,
  usePriceVersions,
  usePrices,
  useProvinces,
  useRoutePricingMutations,
  useWards,
} from '../../hooks/useRoutePricing';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { DateInput } from '../../components/ui/DateInput';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import type { PriceTierInput, PricingMode, RouteGroup, RoutePriceVersion } from '../../api/routePricingApi';
import { formatDate } from '../../utils/format';

type TabKey = 'groups' | 'prices';

/** Bỏ dấu tiếng Việt — "ha tie" khớp "Hà Tiên" */
function normalizeVn(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function matchesVn(haystack: string, needle: string): boolean {
  const q = normalizeVn(needle);
  if (!q) return true;
  return normalizeVn(haystack).includes(q);
}

function toast(msg: string, isError = false) {
  if (isError) console.error(msg);
  window.alert(msg);
}

function apiError(err: unknown, fallback: string) {
  const ax = err as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message || fallback;
}

export function RoutePricingPage() {
  const { hasPermission, user } = useAuth();
  const canManage =
    hasPermission('route_pricing.manage') || user?.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const supplierId = params.get('supplierId')
    ? parseInt(params.get('supplierId')!, 10)
    : undefined;
  const tabParam = params.get('tab');
  const tab: TabKey =
    tabParam === 'prices' || tabParam === 'groups' ? tabParam : 'groups';

  const setTab = (t: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next);
  };
  const setSupplier = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('supplierId', id);
    else next.delete('supplierId');
    setParams(next);
  };

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => supplierCatalogApi.fetchAll({ page: 1, limit: 200 }),
  });
  const suppliers = suppliersData?.suppliers ?? [];

  // Tự chọn nhà cung cấp mặc định: mã nhỏ nhất (theo thứ tự danh mục)
  useEffect(() => {
    if (supplierId || suppliers.length === 0) return;
    const sorted = [...suppliers].sort((a, b) =>
      a.supplier_code.localeCompare(b.supplier_code, 'vi', { numeric: true }),
    );
    setSupplier(String(sorted[0].id));
  }, [suppliers, supplierId]);

  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <MapPinned className="w-6 h-6" />
            Giá theo tuyến
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Quản lý nhóm tuyến và bảng giá theo từng nhà cung cấp
          </p>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setAdjustOpen(true)} disabled={!supplierId}>
            <Percent className="w-4 h-4 mr-1" />
            Điều chỉnh (mọi nhà cung cấp)
          </Button>
        )}
      </div>

      <div className="min-w-[220px] max-w-sm">
        <Select
          label="Nhà cung cấp *"
          value={supplierId ? String(supplierId) : ''}
          onChange={(e) => setSupplier(e.target.value)}
          options={[
            { value: '', label: 'Chọn nhà cung cấp' },
            ...suppliers.map((s) => ({
              value: String(s.id),
              label: `${s.supplier_code} — ${s.name}`,
            })),
          ]}
        />
      </div>

      {!supplierId ? (
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-neutral-500">
          Đang tải nhà cung cấp…
        </div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
            {(
              [
                ['groups', 'Nhóm tuyến'],
                ['prices', 'Bảng giá'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                  tab === k
                    ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'groups' && (
            <GroupsTab supplierId={supplierId} canManage={canManage} />
          )}
          {tab === 'prices' && (
            <PricesTab supplierId={supplierId} canManage={canManage} />
          )}
        </>
      )}

      {adjustOpen && <AdjustModal onClose={() => setAdjustOpen(false)} />}
    </div>
  );
}

function GroupsTab({
  supplierId,
  canManage,
}: {
  supplierId: number;
  canManage: boolean;
}) {
  const [, setParams] = useSearchParams();
  const { data: groups = [], isLoading } = useGroups(supplierId);
  const { data: provinces = [] } = useProvinces();
  const mutations = useRoutePricingMutations(supplierId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RouteGroup | null>(null);
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');

  const openPrices = (groupId: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'prices');
      next.set('groupId', String(groupId));
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (provinceFilter && g.province_code !== provinceFilter) return false;
      if (!search.trim()) return true;
      // Không search chuỗi UI "Phường chưa thuộc nhóm khác" — "hà" khớp nhầm trong "khác"
      const destinationText = g.is_residual
        ? ''
        : g.members.map((m) => m.phuong || m.location_text || '').join(' ');
      const haystack = [g.name, g.tinh, destinationText, g.note || ''].join(' ');
      return matchesVn(haystack, search);
    });
  }, [groups, search, provinceFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Tìm tên nhóm, tỉnh, phường…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            label="Lọc theo tỉnh"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            options={[
              { value: '', label: 'Tất cả tỉnh' },
              ...provinces.map((p) => ({ value: p.code, label: p.name })),
            ]}
          />
        </div>
        <div className="ml-auto">
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Tạo nhóm
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-neutral-500">Bấm vào một nhóm để xem bảng giá và lịch sử</p>
      {isLoading && <p className="text-sm text-neutral-500">Đang tải…</p>}
      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-neutral-500">Chưa có nhóm tuyến</p>
      )}
      {!isLoading && groups.length > 0 && filteredGroups.length === 0 && (
        <p className="text-sm text-neutral-500">Không tìm thấy nhóm phù hợp</p>
      )}
      {filteredGroups.length > 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên nhóm</TableHead>
                <TableHead>Tỉnh</TableHead>
                <TableHead>Đích</TableHead>
                {canManage && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((g) => (
                <TableRow
                  key={g.id}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  onClick={() => openPrices(g.id)}
                >
                  <TableCell>
                    <span className="inline-flex items-center gap-2 flex-wrap">
                      <span className="text-neutral-900 dark:text-neutral-100 font-medium underline-offset-2 group-hover:underline">
                        {g.name}
                      </span>
                      {g.is_residual && <Badge variant="warning">Còn lại</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{g.tinh}</TableCell>
                  <TableCell>
                    {g.is_residual
                      ? 'Phường/địa điểm chưa thuộc nhóm khác'
                      : g.members.map((m) => m.phuong || m.location_text).filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="p-1"
                        title="Sửa"
                        onClick={() => {
                          setEditing(g);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 inline" />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-red-600"
                        title="Xóa"
                        onClick={() => {
                          if (!window.confirm('Xóa nhóm này?')) return;
                          mutations.deleteGroup.mutate(g.id, {
                            onError: (e) => toast(apiError(e, 'Không xóa được'), true),
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {formOpen && (
        <GroupFormModal
          supplierId={supplierId}
          group={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function GroupFormModal({
  supplierId,
  group,
  onClose,
}: {
  supplierId: number;
  group: RouteGroup | null;
  onClose: () => void;
}) {
  const { data: provinces = [] } = useProvinces();
  const [provinceCode, setProvinceCode] = useState(group?.province_code || '');
  const [destinationMode, setDestinationMode] = useState<'ward' | 'location' | 'residual'>(
    group?.is_residual
      ? 'residual'
      : group?.members.some((member) => member.location_text)
        ? 'location'
        : 'ward',
  );
  const [wardCodes, setWardCodes] = useState<string[]>(
    group?.members.map((m) => m.ward_code).filter((code): code is string => Boolean(code)) || [],
  );
  const [locationText, setLocationText] = useState(
    group?.members.find((member) => member.location_text)?.location_text || '',
  );
  const [note, setNote] = useState(group?.note || '');
  const [wardSearch, setWardSearch] = useState('');
  const { data: wards = [] } = useWards(provinceCode || undefined);
  const mutations = useRoutePricingMutations(supplierId);
  const { data: provincesAll = [] } = useProvinces();

  const filteredWards = useMemo(() => {
    if (!wardSearch.trim()) return wards;
    return wards.filter(
      (w) => matchesVn(w.name, wardSearch) || matchesVn(w.full_name || '', wardSearch),
    );
  }, [wards, wardSearch]);

  const previewName = useMemo(() => {
    const p = provincesAll.find((x) => x.code === provinceCode);
    if (!p) return '—';
    const noteSuffix = note.trim() ? ` (${note.trim()})` : '';
    if (destinationMode === 'residual') return `${p.name}${noteSuffix}`;
    if (destinationMode === 'location') {
      const loc = locationText.trim();
      return loc ? `${p.name} - ${loc}${noteSuffix}` : `${p.name}${noteSuffix}`;
    }
    const destinations = wardCodes
      .map((code) => wards.find((ward) => ward.code === code)?.name)
      .filter(Boolean);
    return destinations.length
      ? `${p.name} - ${destinations.join('/ ')}${noteSuffix}`
      : `${p.name}${noteSuffix}`;
  }, [provinceCode, destinationMode, wardCodes, locationText, wards, provincesAll, note]);

  const toggleWard = (code: string) => {
    setWardCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const switchDestinationMode = (mode: 'ward' | 'location' | 'residual') => {
    setDestinationMode(mode);
    if (mode !== 'ward') setWardCodes([]);
    if (mode !== 'location') setLocationText('');
  };

  const payloadDest = () => {
    if (destinationMode === 'ward') {
      return { ward_codes: wardCodes, location_text: null as string | null };
    }
    if (destinationMode === 'location') {
      return { ward_codes: [] as string[], location_text: locationText.trim() || null };
    }
    return { ward_codes: [] as string[], location_text: null as string | null };
  };

  return (
    <Modal isOpen onClose={onClose} title={group ? 'Sửa nhóm tuyến' : 'Tạo nhóm tuyến'} size="lg">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <Select
          label="Tỉnh *"
          value={provinceCode}
          disabled={Boolean(group)}
          onChange={(e) => {
            setProvinceCode(e.target.value);
            setWardCodes([]);
            setLocationText('');
            setWardSearch('');
          }}
          options={[
            { value: '', label: 'Chọn tỉnh' },
            ...provinces.map((p) => ({ value: p.code, label: p.name })),
          ]}
        />
        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Đích *
          </p>
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {([
              ['ward', 'Phường / Xã'],
              ['location', 'Địa điểm tự do'],
              ['residual', 'Phần còn lại'],
            ] as const).map(([mode, label]) => (
              <label key={mode} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="destination-mode"
                  checked={destinationMode === mode}
                  onChange={() => switchDestinationMode(mode)}
                />
                {label}
              </label>
            ))}
          </div>
          {destinationMode === 'ward' && (
            <>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <Input
                  placeholder="Tìm phường/xã…"
                  value={wardSearch}
                  onChange={(e) => setWardSearch(e.target.value)}
                  disabled={!provinceCode}
                  className="pl-9"
                />
              </div>
              {wardCodes.length > 0 && (
                <p className="text-xs text-neutral-500 mb-1">
                  Đã chọn {wardCodes.length} phường
                  {wardSearch.trim() ? ` · lọc: ${filteredWards.length}` : ''}
                </p>
              )}
              <div className="max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md p-2 space-y-1">
                {!provinceCode && <p className="text-xs text-neutral-500">Chọn tỉnh trước</p>}
                {provinceCode && filteredWards.length === 0 && (
                  <p className="text-xs text-neutral-500">Không tìm thấy phường phù hợp</p>
                )}
                {filteredWards.map((ward) => (
                  <label key={ward.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={wardCodes.includes(ward.code)}
                      onChange={() => toggleWard(ward.code)}
                    />
                    {ward.name}
                  </label>
                ))}
              </div>
            </>
          )}
          {destinationMode === 'location' && (
            <div className="space-y-1">
              <Input
                label="Địa điểm *"
                placeholder="Vd. KCN Hiệp Phước"
                value={locationText}
                disabled={!provinceCode}
                onChange={(e) => setLocationText(e.target.value)}
              />
              <p className="text-xs text-neutral-500">
                Mỗi nhóm chỉ có đúng 1 địa điểm text
              </p>
            </div>
          )}
          {destinationMode === 'residual' && (
            <p className="text-xs text-neutral-500">Áp dụng cho phường/địa điểm chưa thuộc nhóm khác trong tỉnh.</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Tên nhóm (chỉ xem)</p>
          <p className="text-sm px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            {previewName}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Tự sinh theo tỉnh và đích — không chỉnh sửa
          </p>
        </div>
        <Input
          label="Ghi chú"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="-mt-2 text-xs text-neutral-500">Vd. Đường nhỏ — gắn vào tên nhóm</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={
              !provinceCode ||
              (destinationMode === 'location' && !locationText.trim()) ||
              mutations.createGroup.isPending ||
              mutations.updateGroup.isPending
            }
            onClick={() => {
              const dest = payloadDest();
              if (group) {
                mutations.updateGroup.mutate(
                  {
                    id: group.id,
                    ward_codes: dest.ward_codes,
                    location_text: dest.location_text,
                    note,
                  },
                  {
                    onSuccess: () => {
                      toast('Đã lưu thành công');
                      onClose();
                    },
                    onError: (e) => toast(apiError(e, 'Không lưu được'), true),
                  },
                );
              } else {
                mutations.createGroup.mutate(
                  {
                    supplier_id: supplierId,
                    province_code: provinceCode,
                    ward_codes: dest.ward_codes,
                    location_text: dest.location_text,
                    note,
                  },
                  {
                    onSuccess: () => {
                      toast('Đã lưu thành công');
                      onClose();
                    },
                    onError: (e) => toast(apiError(e, 'Không lưu được'), true),
                  },
                );
              }
            }}
          >
            Lưu
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PricesTab({
  supplierId,
  canManage,
}: {
  supplierId: number;
  canManage: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const groupId = params.get('groupId')
    ? parseInt(params.get('groupId')!, 10)
    : undefined;

  const setGroupId = (id: number | undefined) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('groupId', String(id));
      else next.delete('groupId');
      return next;
    });
  };

  const { data: groups = [] } = useGroups(supplierId);
  const { data: prices = [], isLoading } = usePrices(supplierId, groupId);
  const selected = prices.find((p) => p.route_group_id === groupId);
  const configId = selected && selected.id > 0 ? selected.id : undefined;
  const {
    data: versions = [],
    isLoading: versionsLoading,
  } = usePriceVersions(configId);
  const [formOpen, setFormOpen] = useState(false);

  const groupMeta = groups.find((g) => g.id === groupId);

  return (
    <div className="space-y-4">
      <SearchableSelect
        label="Nhóm tuyến *"
        value={groupId ? String(groupId) : ''}
        onChange={(v) => setGroupId(v ? parseInt(v, 10) : undefined)}
        placeholder="Chọn nhóm tuyến"
        searchPlaceholder="Tìm tên nhóm…"
        clearable
        options={groups.map((g) => ({
          value: String(g.id),
          label: g.is_residual ? `${g.name} · Còn lại` : g.name,
        }))}
      />
      {!groupId && (
        <p className="text-sm text-neutral-500">
          Chọn nhóm tuyến để xem giá và lịch sử — hoặc bấm một nhóm ở tab Nhóm tuyến
        </p>
      )}
      {groupId && isLoading && <p className="text-sm text-neutral-500">Đang tải…</p>}
      {groupId && !isLoading && (
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {selected?.group_name || groupMeta?.name || 'Nhóm tuyến'}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {configId
                  ? `${versions.length || selected?.version_count || 0} phiên bản`
                  : 'Chưa có bảng giá'}
              </p>
            </div>
            {canManage && !configId && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Thêm bảng giá gốc
              </Button>
            )}
          </div>

          {!configId && (
            <p className="text-sm text-neutral-500">Chưa có bảng giá gốc cho nhóm này</p>
          )}

          {configId && versionsLoading && (
            <p className="text-sm text-neutral-500">Đang tải lịch sử giá…</p>
          )}

          {configId && !versionsLoading && versions.length === 0 && (
            <p className="text-sm text-neutral-500">Chưa có phiên bản giá</p>
          )}

          {configId && versions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Lịch sử thay đổi giá
              </p>
              {versions.map((v, idx) => (
                <PriceVersionCard
                  key={v.id}
                  version={v}
                  isCurrent={v.effective_to == null}
                  isOldest={idx === versions.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {formOpen && groupId && (
        <PriceFormModal
          routeGroupId={groupId}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

function PriceVersionCard({
  version,
  isCurrent,
  isOldest,
}: {
  version: RoutePriceVersion;
  isCurrent: boolean;
  isOldest: boolean;
}) {
  const showPallet = Number(version.pallet_trip_price) > 0;
  const mode: PricingMode = version.pricing_mode ?? 'by_weight';
  const rangeHeader = mode === 'by_trips' ? 'Chuyến/xe/ngày' : 'Trọng lượng';

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 bg-white dark:bg-neutral-900 ${
        isCurrent
          ? 'border-neutral-300 dark:border-neutral-600 shadow-sm'
          : 'border-neutral-200 dark:border-neutral-700'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {isCurrent ? (
            <Badge variant="success">Đang hiệu lực</Badge>
          ) : (
            <Badge variant="default">Đã đóng</Badge>
          )}
          {isOldest && version.adjustment_percent == null && (
            <Badge variant="info">Giá gốc</Badge>
          )}
          <Badge variant={mode === 'by_trips' ? 'info' : 'default'}>
            {mode === 'by_trips' ? 'Theo chuyến/xe/ngày' : 'Theo trọng lượng'}
          </Badge>
          {version.adjustment_percent != null && (
            <Badge variant="warning">
              Điều chỉnh {version.adjustment_percent > 0 ? '+' : ''}
              {version.adjustment_percent}%
            </Badge>
          )}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(version.effective_from)}
          {' → '}
          {version.effective_to ? formatDate(version.effective_to) : 'hiện tại'}
        </p>
      </div>

      {showPallet && (
        <p className="text-sm">
          Giá Pallet (chuyến):{' '}
          <strong>{Number(version.pallet_trip_price).toLocaleString('vi-VN')}</strong>
        </p>
      )}

      {version.note && (
        <p className="text-xs text-neutral-500">Ghi chú: {version.note}</p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
            <th className="py-1.5 pr-3 font-medium">{rangeHeader}</th>
            <th className="py-1.5 pr-3 font-medium">Đơn vị</th>
            <th className="py-1.5 font-medium text-right">Đơn giá</th>
          </tr>
        </thead>
        <tbody>
          {version.tiers.map((t, i) => (
            <tr
              key={i}
              className="border-t border-neutral-100 dark:border-neutral-800 align-top"
            >
              <td className="py-2 pr-3 whitespace-pre-line">{formatTierRangeLabel(mode, t)}</td>
              <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">
                {t.pricing_unit === 'chuyen' ? 'vnđ/chuyến' : 'vnđ/tấn'}
              </td>
              <td className="py-2 text-right font-medium tabular-nums">
                {Number(t.price).toLocaleString('vi-VN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTonNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Hiển thị khoảng tấn `(from, to]`: `≤ 2.5 tấn`, `>8-16`, `>16` */
function formatTonRange(fromTon: number, toTon: number | null | undefined): string {
  const from = Number(fromTon);
  if (toTon == null) {
    return from <= 0 ? 'Mọi trọng lượng' : `>${formatTonNumber(from)}`;
  }
  const to = Number(toTon);
  if (from <= 0) return `≤ ${formatTonNumber(to)} tấn`;
  return `>${formatTonNumber(from)}-${formatTonNumber(to)}`;
}

function formatTripsRange(fromTrips: number, toTrips: number | null | undefined): string {
  const from = Number(fromTrips);
  if (toTrips == null) return `Áp dụng từ ${formatTonNumber(from)} chuyến trở lên`;
  const to = Number(toTrips);
  if (from === to) return `Áp dụng cho ${formatTonNumber(from)} chuyến`;
  return `Áp dụng từ ${formatTonNumber(from)} đến ${formatTonNumber(to)} chuyến`;
}

function formatTierRangeLabel(mode: PricingMode, t: PriceTierInput): string {
  if (mode === 'by_trips') {
    return formatTripsRange(t.range_from, t.range_to ?? null);
  }
  let line = formatTonRange(t.range_from, t.range_to ?? null);
  if (
    t.pricing_unit === 'tan' &&
    t.min_billable_ton != null &&
    Number(t.min_billable_ton) > 0
  ) {
    line += ` (cước tối thiểu ${formatTonNumber(Number(t.min_billable_ton))} tấn)`;
  }
  return line;
}

const WEIGHT_TEMPLATE: PriceTierInput[] = [
  { range_from: 0, range_to: 2.5, pricing_unit: 'chuyen', price: 0 },
  { range_from: 2.5, range_to: 8, pricing_unit: 'tan', price: 0, min_billable_ton: 5 },
  { range_from: 8, range_to: 16, pricing_unit: 'tan', price: 0 },
  { range_from: 16, range_to: 23, pricing_unit: 'tan', price: 0 },
  { range_from: 23, range_to: null, pricing_unit: 'tan', price: 0 },
];

function tripsTemplate(firstTo = 2): PriceTierInput[] {
  return [
    { range_from: 1, range_to: firstTo, pricing_unit: 'chuyen', price: 0 },
    { range_from: firstTo + 1, range_to: null, pricing_unit: 'chuyen', price: 0 },
  ];
}

/** Re-chain trips tiers so from[0]=1, from[i]=to[i-1]+1, last to=null */
function rechainTrips(tiers: PriceTierInput[]): PriceTierInput[] {
  if (tiers.length === 0) return tripsTemplate();
  const next = tiers.map((t) => ({ ...t, pricing_unit: 'chuyen' as const, min_billable_ton: null }));
  next[0] = { ...next[0], range_from: 1 };
  for (let i = 1; i < next.length; i++) {
    const prevTo = next[i - 1].range_to;
    const from = prevTo == null ? next[i - 1].range_from + 1 : Number(prevTo) + 1;
    next[i] = { ...next[i], range_from: from };
  }
  next[next.length - 1] = { ...next[next.length - 1], range_to: null };
  return next;
}

function PriceFormModal({
  routeGroupId,
  onClose,
}: {
  routeGroupId: number;
  onClose: () => void;
}) {
  const mutations = useRoutePricingMutations();
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [pallet, setPallet] = useState('0');
  const [pricingMode, setPricingMode] = useState<PricingMode>('by_weight');
  const [tiers, setTiers] = useState<PriceTierInput[]>(() =>
    WEIGHT_TEMPLATE.map((t) => ({ ...t })),
  );

  const switchMode = (mode: PricingMode) => {
    if (mode === pricingMode) return;
    if (!window.confirm('Đổi chế độ sẽ xóa các bậc đang nhập. Tiếp tục?')) return;
    setPricingMode(mode);
    setTiers(mode === 'by_weight' ? WEIGHT_TEMPLATE.map((t) => ({ ...t })) : tripsTemplate());
  };

  const updateTripsTo = (idx: number, toValue: string) => {
    setTiers((prev) => {
      const next = prev.map((t) => ({ ...t }));
      if (idx === next.length - 1) {
        next[idx] = { ...next[idx], range_to: null };
        return rechainTrips(next);
      }
      next[idx] = {
        ...next[idx],
        range_to: toValue === '' ? next[idx].range_from : Number(toValue),
      };
      return rechainTrips(next);
    });
  };

  const addTripsTier = () => {
    setTiers((prev) => {
      if (prev.length < 2) return tripsTemplate();
      const copy = prev.map((t) => ({ ...t }));
      const lastIdx = copy.length - 1;
      const prevIdx = lastIdx - 1;
      const prevTo = Number(copy[prevIdx].range_to ?? copy[prevIdx].range_from);
      const midFrom = prevTo + 1;
      const midTo = midFrom;
      copy[prevIdx] = { ...copy[prevIdx], range_to: prevTo };
      copy.splice(lastIdx, 0, {
        range_from: midFrom,
        range_to: midTo,
        pricing_unit: 'chuyen',
        price: 0,
      });
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        range_from: midTo + 1,
        range_to: null,
        pricing_unit: 'chuyen',
        price: copy[copy.length - 1].price,
      };
      return rechainTrips(copy);
    });
  };

  return (
    <Modal isOpen onClose={onClose} title="Thêm bảng giá gốc" size="lg">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Ngày hiệu lực *
          </label>
          <DateInput value={effectiveFrom} onChange={setEffectiveFrom} />
        </div>
        <Input
          label="Giá Pallet (chuyến) *"
          type="number"
          min={0}
          value={pallet}
          onChange={(e) => setPallet(e.target.value)}
        />
        <p className="-mt-2 text-xs text-neutral-500">Cho phép 0 nếu nhóm không dùng giá pallet</p>

        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Chế độ áp giá *
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pricing-mode"
                checked={pricingMode === 'by_weight'}
                onChange={() => switchMode('by_weight')}
              />
              Theo trọng lượng
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pricing-mode"
                checked={pricingMode === 'by_trips'}
                onChange={() => switchMode('by_trips')}
              />
              Theo số chuyến/xe/ngày
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Bậc điều kiện *</p>
          {pricingMode === 'by_weight' &&
            tiers.map((t, idx) => {
              const isChuyen = t.pricing_unit === 'chuyen';
              return (
                <div
                  key={idx}
                  className="flex flex-wrap gap-2 items-end rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3"
                >
                  <div className="w-[7.5rem] shrink-0">
                    <Select
                      label="Đơn vị"
                      value={t.pricing_unit}
                      onChange={(e) => {
                        const unit = e.target.value as 'chuyen' | 'tan';
                        const next = [...tiers];
                        next[idx] = {
                          ...t,
                          pricing_unit: unit,
                          min_billable_ton: unit === 'chuyen' ? null : t.min_billable_ton,
                        };
                        setTiers(next);
                      }}
                      options={[
                        { value: 'chuyen', label: 'Chuyến' },
                        { value: 'tan', label: 'Tấn' },
                      ]}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <Input
                      label="Từ (tấn)"
                      type="number"
                      value={String(t.range_from)}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[idx] = { ...t, range_from: Number(e.target.value) };
                        setTiers(next);
                      }}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <Input
                      label="Đến (tấn)"
                      type="number"
                      value={t.range_to == null ? '' : String(t.range_to)}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[idx] = {
                          ...t,
                          range_to: e.target.value === '' ? null : Number(e.target.value),
                        };
                        setTiers(next);
                      }}
                    />
                  </div>
                  {!isChuyen && (
                    <div className="w-24 shrink-0">
                      <Input
                        label="Tối thiểu (tấn)"
                        type="number"
                        value={t.min_billable_ton == null ? '' : String(t.min_billable_ton)}
                        onChange={(e) => {
                          const next = [...tiers];
                          next[idx] = {
                            ...t,
                            min_billable_ton:
                              e.target.value === '' ? null : Number(e.target.value),
                          };
                          setTiers(next);
                        }}
                      />
                    </div>
                  )}
                  <div className="w-36 min-w-[8rem] flex-1">
                    <Input
                      label="Giá"
                      type="number"
                      value={String(t.price)}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[idx] = { ...t, price: Number(e.target.value) };
                        setTiers(next);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="p-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Xóa bậc"
                    disabled={tiers.length === 1}
                    onClick={() => setTiers((previous) => previous.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

          {pricingMode === 'by_trips' &&
            tiers.map((t, idx) => {
              const isLast = idx === tiers.length - 1;
              const isFirst = idx === 0;
              return (
                <div
                  key={idx}
                  className="flex flex-wrap gap-2 items-end rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3"
                >
                  <div className="w-28 shrink-0">
                    <Input
                      label="Từ (≥)"
                      type="number"
                      value={String(t.range_from)}
                      disabled
                      onChange={() => undefined}
                    />
                  </div>
                  <div className="w-32 shrink-0">
                    <Input
                      label={isLast ? 'Đến (∞)' : 'Đến (≤)'}
                      type="number"
                      value={t.range_to == null ? '' : String(t.range_to)}
                      disabled={isLast}
                      onChange={(e) => updateTripsTo(idx, e.target.value)}
                    />
                  </div>
                  <div className="w-36 min-w-[8rem] flex-1">
                    <Input
                      label="Giá (vnđ/chuyến)"
                      type="number"
                      value={String(t.price)}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[idx] = { ...t, price: Number(e.target.value) };
                        setTiers(next);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="p-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Xóa bậc"
                    disabled={tiers.length <= 2 || isFirst || isLast}
                    onClick={() =>
                      setTiers((previous) => rechainTrips(previous.filter((_, i) => i !== idx)))
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

          <Button
            variant="outline"
            type="button"
            onClick={() => {
              if (pricingMode === 'by_weight') {
                setTiers((prev) => [
                  ...prev,
                  { range_from: 0, range_to: null, pricing_unit: 'tan', price: 0 },
                ]);
                return;
              }
              addTripsTier();
            }}
          >
            + Thêm bậc
          </Button>
          {pricingMode === 'by_trips' && (
            <p className="text-xs text-neutral-500">
              Bậc đầu từ 1; đổi Đến sẽ tự cập nhật bậc sau (liền mạch đến ∞)
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={mutations.createPrice.isPending}
            onClick={() => {
              const normalizedTiers =
                pricingMode === 'by_trips'
                  ? rechainTrips(tiers).map((tier) => ({
                      ...tier,
                      pricing_unit: 'chuyen' as const,
                      min_billable_ton: null,
                    }))
                  : tiers.map((tier) => ({
                      ...tier,
                      min_billable_ton:
                        tier.pricing_unit === 'tan' ? tier.min_billable_ton ?? null : null,
                    }));
              mutations.createPrice.mutate(
                {
                  route_group_id: routeGroupId,
                  effective_from: effectiveFrom,
                  pricing_mode: pricingMode,
                  pallet_trip_price: Number(pallet),
                  tiers: normalizedTiers,
                },
                {
                  onSuccess: () => {
                    toast('Đã lưu thành công');
                    onClose();
                  },
                  onError: (e) => toast(apiError(e, 'Không lưu được'), true),
                },
              );
            }}
          >
            Lưu
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustModal({ onClose }: { onClose: () => void }) {
  const mutations = useRoutePricingMutations();
  const [percent, setPercent] = useState('8');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Điều chỉnh giá theo % — mọi nhà cung cấp"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
          Thao tác này áp dụng cho tất cả nhà cung cấp đang có bảng giá hiệu lực (không chỉ nhà cung cấp đang xem).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phần trăm (%) *"
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Ngày hiệu lực mới *
            </label>
            <DateInput value={effectiveFrom} onChange={setEffectiveFrom} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={mutations.adjustPrices.isPending}
            onClick={() => {
              if (!window.confirm('Xác nhận điều chỉnh % cho mọi nhà cung cấp?')) return;
              mutations.adjustPrices.mutate(
                { percent: Number(percent), effective_from: effectiveFrom },
                {
                  onSuccess: (data) => {
                    toast(`Đã điều chỉnh giá cho ${data.adjusted} bảng giá`);
                    onClose();
                  },
                  onError: (e) => toast(apiError(e, 'Không điều chỉnh được'), true),
                },
              );
            }}
          >
            Áp dụng cho mọi nhà cung cấp
          </Button>
        </div>
      </div>
    </Modal>
  );
}
