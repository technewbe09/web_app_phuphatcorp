import { useState } from 'react';
import { Plus, Settings, Pencil, Trash2, AlertTriangle, RefreshCw, Search, X } from 'lucide-react';
import { Pagination } from '../../../components/ui/Pagination';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/Table';
import { useGetOilChanges, useGetDueVehicles, useDeleteOilChange } from '../../../hooks/useVehicleOilChanges';
import { useGetVehicles } from '../../../hooks/useVehicleCatalog';
import { OilChangeFormModal } from '../../../components/vehicle-data/OilChangeFormModal';
import { OilIntervalModal } from '../../../components/vehicle-data/OilIntervalModal';
import type { OilChangeRecord, OilChangeDueVehicle } from '../../../api/vehicleOilChangeApi';
import { cn } from '../../../utils/cn';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

type Tab = 'history' | 'due';

export function OilChangePage() {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; record: OilChangeRecord } | null>(null);
  const [intervalModal, setIntervalModal] = useState<{ vehicle: OilChangeDueVehicle } | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const PAGE_SIZE = 20;

  const { data: oilsData, isLoading: oilsLoading, isError: oilsError, refetch: refetchOils } = useGetOilChanges({
    vehicle_id: vehicleFilter ? Number(vehicleFilter) : undefined,
    page,
    limit: PAGE_SIZE,
  });
  const { data: dueVehicles, isLoading: dueLoading, isError: dueError, refetch: refetchDue } = useGetDueVehicles();
  const { data: vehiclesData } = useGetVehicles('', 'active', undefined, 1, 200);
  const deleteMutation = useDeleteOilChange();

  const vehicles = vehiclesData?.vehicles ?? [];

  const filteredVehicles = vehicles.filter((v) => {
    if (!vehicleSearch) return true;
    const q = vehicleSearch.toLowerCase();
    return v.plate_number.toLowerCase().includes(q) || v.driver_name.toLowerCase().includes(q);
  });

  const selectedVehicle = vehicles.find((v) => v.id === Number(vehicleFilter));

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleDelete = async (record: OilChangeRecord) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi thay nhớt này?')) return;
    try {
      await deleteMutation.mutateAsync(record.id);
      showToast('Đã xóa bản ghi thay nhớt');
    } catch {
      showToast('Không thể xóa bản ghi', 'error');
    }
  };

  const totalPages = oilsData ? Math.ceil(oilsData.total / PAGE_SIZE) : 0;
  const oilRecords = oilsData?.records ?? [];

  const getDueBadge = (v: OilChangeDueVehicle) => {
    switch (v.status) {
      case 'overdue':
        return { label: 'Quá hạn', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
      case 'due_soon':
        return { label: 'Sắp đến hạn', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
      case 'ok':
        return { label: 'OK', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
      case 'no_data':
      default:
        return { label: 'Không có dữ liệu', className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' };
    }
  };

  const formatKm = (km: number | null) => {
    if (km === null || km === undefined) return '-';
    return km.toLocaleString('vi-VN');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs pointer-events-auto transition-all',
              toast.variant === 'success'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-red-600 text-white',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Quản lý thay nhớt
      </h1>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
        {([
          { key: 'history' as Tab, label: 'Lịch sử thay nhớt' },
          { key: 'due' as Tab, label: 'Xe cần thay nhớt' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'history' && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={vehicleSearch}
                      placeholder="Tìm theo biển số hoặc tài xế..."
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                      onChange={(e) => {
                        setVehicleSearch(e.target.value);
                        setDropdownOpen(true);
                      }}
                      className="pl-9 pr-8 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 w-64"
                    />
                    {selectedVehicle && (
                      <button
                        onClick={() => { setVehicleFilter(''); setVehicleSearch(''); setPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {dropdownOpen && filteredVehicles.length > 0 && (
                    <div className="absolute z-50 mt-1 w-80 max-h-60 overflow-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        onMouseDown={() => {
                          setVehicleFilter('');
                          setVehicleSearch('');
                          setDropdownOpen(false);
                          setPage(1);
                        }}
                      >
                        Tất cả xe
                      </button>
                      {filteredVehicles.map((v) => (
                        <button
                          key={v.id}
                          className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          onMouseDown={() => {
                            setVehicleFilter(String(v.id));
                            setVehicleSearch(`${v.plate_number} - ${v.driver_name}`);
                            setDropdownOpen(false);
                            setPage(1);
                          }}
                        >
                          <span className="font-mono font-medium">{v.plate_number}</span>
                          <span className="text-neutral-400"> - {v.driver_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1" />
                <Button onClick={() => setModal({ type: 'create' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm thay nhớt
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {oilsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : oilsError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <p className="text-sm">Không thể tải dữ liệu thay nhớt.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchOils()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Thử lại
                  </Button>
                </div>
              ) : oilRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
                  <p className="text-sm">Chưa có lịch sử thay nhớt.</p>
                  <Button size="sm" onClick={() => setModal({ type: 'create' })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm thay nhớt
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">STT</TableHead>
                        <TableHead className="w-36">Biển số</TableHead>
                        <TableHead>Tài xế</TableHead>
                        <TableHead className="w-32">Ngày thay</TableHead>
                        <TableHead className="w-28 text-right">Số km</TableHead>
                        <TableHead className="w-32">Loại nhớt</TableHead>
                        <TableHead>Ghi chú</TableHead>
                        <TableHead className="w-24 text-center">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oilRecords.map((record, idx) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                            {record.plate_number || '-'}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300">
                            {record.driver_name || '-'}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                            {new Date(record.change_date).toLocaleDateString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                            {record.odometer_at.toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300">
                            {record.oil_type || '-'}
                          </TableCell>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm max-w-40 truncate">
                            {record.notes || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setModal({ type: 'edit', record })}
                                className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(record)}
                                className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={oilsData?.total ?? 0}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'due' && (
        <Card>
          <CardContent className="p-0">
            {dueLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                ))}
              </div>
            ) : dueError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-sm">Không thể tải dữ liệu.</p>
                <Button variant="outline" size="sm" onClick={() => refetchDue()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Thử lại
                </Button>
              </div>
            ) : (!dueVehicles || dueVehicles.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
                <p className="text-sm">Tất cả xe đều trong hạn thay nhớt.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Biển số</TableHead>
                      <TableHead>Tài xế</TableHead>
                      <TableHead className="w-32">Lần thay gần nhất</TableHead>
                      <TableHead className="w-28 text-right">Km lúc thay</TableHead>
                      <TableHead className="w-28 text-right">Km hiện tại</TableHead>
                      <TableHead className="w-28 text-right">Đã đi</TableHead>
                      <TableHead className="w-28 text-right">Ngưỡng</TableHead>
                      <TableHead className="w-32 text-center">Trạng thái</TableHead>
                      <TableHead className="w-28 text-center">Thiết lập</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueVehicles.map((v) => {
                      const badge = getDueBadge(v);
                      return (
                        <TableRow key={v.vehicle_id}>
                          <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                            {v.plate_number}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300">
                            {v.driver_name}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                            {v.last_oil_change_date
                              ? new Date(v.last_oil_change_date).toLocaleDateString('vi-VN')
                              : 'Chưa có'}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                            {formatKm(v.last_oil_change_km)}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                            {formatKm(v.current_km)}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                            {formatKm(v.km_since_change)}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                            {v.interval_km.toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', badge.className)}>
                              {badge.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => setIntervalModal({ vehicle: v })}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                              title="Thiết lập ngưỡng"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <OilChangeFormModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        record={modal?.type === 'edit' ? modal.record : null}
      />

      {intervalModal && (
        <OilIntervalModal
          isOpen={true}
          onClose={() => setIntervalModal(null)}
          onSuccess={(msg) => showToast(msg)}
          onError={(msg) => showToast(msg, 'error')}
          vehicle={intervalModal.vehicle}
        />
      )}
    </div>
  );
}
