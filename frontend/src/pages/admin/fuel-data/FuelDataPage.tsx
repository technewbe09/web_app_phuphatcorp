import { useState } from 'react';
import { Upload, Trash2, Pencil, AlertTriangle, RefreshCw, Plus, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../../components/ui/Pagination';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/Table';
import { useGetFuelRecords, useDeleteFuelRecord, useGetFuelMonths } from '../../../hooks/useFuelRecords';
import { useGetVehicles } from '../../../hooks/useVehicleCatalog';
import { FuelRecordFilters } from '../../../components/fuel-data/FuelRecordFilters';
import { UploadFuelExcelModal } from '../../../components/fuel-data/UploadFuelExcelModal';
import { EditFuelRecordModal } from '../../../components/fuel-data/EditFuelRecordModal';
import type { FuelRecord } from '../../../types/fuelRecord';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function FuelDataPage() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<
    { type: 'upload' } | { type: 'create' } | { type: 'edit'; record: FuelRecord } | null
  >(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const PAGE_SIZE = 20;

  const { data: vehicleData } = useGetVehicles('', 1, 200);
  const vehicles = vehicleData?.vehicles ?? [];

  const { data, isLoading, isError, refetch } = useGetFuelRecords({
    vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
    month: selectedMonth || undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const deleteMutation = useDeleteFuelRecord();

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleDelete = async (record: FuelRecord) => {
    if (!confirm(`Xóa bản ghi ngày ${record.record_date} của xe ${record.plate_number}?`)) return;
    try {
      await deleteMutation.mutateAsync(record.id);
      showToast('Đã xóa bản ghi');
    } catch {
      showToast('Lỗi khi xóa bản ghi', 'error');
    }
  };

  const handleClearFilters = () => {
    setSelectedVehicleId('');
    setSelectedMonth('');
    setSearch('');
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const records = data?.records ?? [];
  const { data: monthsData } = useGetFuelMonths();
  const months = monthsData ?? [];

  // Format helpers
  const formatNum = (v: number | string | null | undefined, decimals = 1) =>
    v != null ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '-';

  const getDiffColor = (actual: number | null | undefined, gps: number | null | undefined) => {
    if (actual == null || gps == null) return '';
    const diff = Math.abs(actual - gps);
    if (diff === 0) return '';
    if (actual === 0) return '';
    const pct = (diff / actual) * 100;
    if (pct > 10) return 'text-red-600 dark:text-red-400 font-medium';
    if (pct > 5) return 'text-orange-600 dark:text-orange-400';
    return '';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs pointer-events-auto transition-all ${
              toast.variant === 'success'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Dữ liệu dầu
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/fuel-data/statistics')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Thống kê
          </Button>
          <Button onClick={() => setModal({ type: 'create' })}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm bản ghi
          </Button>
          <Button onClick={() => setModal({ type: 'upload' })}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <FuelRecordFilters
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            selectedMonth={selectedMonth}
            search={search}
            months={months}
            onVehicleChange={(v) => { setSelectedVehicleId(v); setPage(1); }}
            onMonthChange={(m) => { setSelectedMonth(m); setPage(1); }}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            onClear={handleClearFilters}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm">Không thể tải dữ liệu.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">{search || selectedVehicleId || selectedMonth ? 'Không tìm thấy bản ghi nào.' : 'Chưa có dữ liệu dầu. Upload Excel để bắt đầu.'}</p>
              {!search && !selectedVehicleId && !selectedMonth && (
                <Button size="sm" onClick={() => setModal({ type: 'upload' })}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Excel
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Ngày</TableHead>
                    <TableHead className="w-32">Biển số</TableHead>
                    <TableHead className="w-24">Số KM cũ</TableHead>
                    <TableHead className="w-24">Số KM đổ</TableHead>
                    <TableHead className="w-20">Km đi</TableHead>
                    <TableHead className="w-20">Lít</TableHead>
                    <TableHead className="w-28">L/100km (TT)</TableHead>
                    <TableHead className="w-28">L/100km (GPS)</TableHead>
                    <TableHead className="w-28">Chênh lệch</TableHead>
                    <TableHead className="w-32">Đơn giá</TableHead>
                    <TableHead className="w-36">Thành tiền</TableHead>
                    <TableHead className="w-20">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const rateDiff = record.fuel_rate != null && record.gps_fuel_rate != null
                      ? (Number(record.fuel_rate) - Number(record.gps_fuel_rate)).toFixed(2)
                      : null;
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm text-neutral-700 dark:text-neutral-300">
                          {new Date(record.record_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                          {record.plate_number}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {formatNum(record.odometer_old, 0)}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {formatNum(record.odometer_new, 0)}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {formatNum(record.distance, 0)} km
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {formatNum(record.liters, 1)} L
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {Number(record.fuel_rate)?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {Number(record.gps_fuel_rate)?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell className={getDiffColor(record.fuel_rate, record.gps_fuel_rate)}>
                          {rateDiff ?? '-'}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300 text-right">
                          {formatNum(record.unit_price, 2)} đ
                        </TableCell>
                        <TableCell className="text-neutral-900 dark:text-neutral-100 font-medium text-right">
                          {formatNum(record.total_cost, 0)} đ
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setModal({ type: 'edit', record })}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                              title="Sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record)}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={data?.total ?? 0}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UploadFuelExcelModal
        isOpen={modal?.type === 'upload'}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
      />

      <EditFuelRecordModal
        isOpen={modal?.type === 'create' || modal?.type === 'edit'}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        record={modal?.type === 'edit' ? modal.record : null}
        vehicles={vehicles}
      />
    </div>
  );
}
