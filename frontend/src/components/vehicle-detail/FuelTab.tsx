import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useGetFuelRecords, useDeleteFuelRecord } from '../../hooks/useFuelRecords';
import { EditFuelRecordModal } from '../../components/fuel-data/EditFuelRecordModal';
import type { FuelRecord } from '../../types/fuelRecord';
import type { Vehicle } from '../../api/vehicleCatalogApi';

interface Toast { id: number; message: string; variant: 'success' | 'error'; }

interface Props {
  vehicleId: number;
  vehicle: Vehicle | null;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
}

export function FuelTab({ vehicleId, vehicle, setToasts }: Props) {
  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; record: FuelRecord } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, isError, refetch } = useGetFuelRecords({ vehicle_id: vehicleId, page, limit: PAGE_SIZE });
  const deleteMutation = useDeleteFuelRecord();

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleDelete = async (record: FuelRecord) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi dữ liệu dầu này?')) return;
    try {
      await deleteMutation.mutateAsync(record.id);
      showToast('Đã xóa bản ghi dữ liệu dầu');
    } catch {
      showToast('Không thể xóa bản ghi', 'error');
    }
  };

  const records = data?.records ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const formatNumber = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return '-';
    return n.toLocaleString('vi-VN');
  };

  const formatFuelRate = (r: number | null | undefined): string => {
    if (r === null || r === undefined) return '-';
    return r.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setModal({ type: 'create' })} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Thêm dữ liệu dầu
        </Button>
      </div>

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
              <p className="text-sm">Không thể tải dữ liệu dầu.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">Chưa có dữ liệu dầu.</p>
              <Button size="sm" onClick={() => setModal({ type: 'create' })}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm dữ liệu dầu
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="w-28">Ngày đổ</TableHead>
                    <TableHead className="w-24 text-right">Km cũ</TableHead>
                    <TableHead className="w-24 text-right">Km mới</TableHead>
                    <TableHead className="w-24 text-right">Khoảng cách</TableHead>
                    <TableHead className="w-20 text-right">Lít</TableHead>
                    <TableHead className="w-24 text-right">Tiêu hao</TableHead>
                    <TableHead className="w-28 text-right">Thành tiền</TableHead>
                    <TableHead className="w-28">Địa điểm</TableHead>
                    <TableHead className="w-20">Ghi chú</TableHead>
                    <TableHead className="w-24 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                        {new Date(record.record_date).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                        {formatNumber(record.odometer_old)}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                        {formatNumber(record.odometer_new)}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                        {formatNumber(record.distance)}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                        {formatNumber(record.liters)}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right tabular-nums">
                        {formatFuelRate(record.fuel_rate)}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm text-right font-medium tabular-nums">
                        {formatNumber(record.total_cost)}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm max-w-28 truncate">
                        {(record as Record<string, unknown>).location as string || '-'}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm max-w-20 truncate">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setModal({ type: 'edit', record })}
                            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
              <Pagination currentPage={page} totalPages={totalPages} totalItems={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <EditFuelRecordModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        record={modal?.type === 'edit' ? modal.record : null}
        vehicles={vehicle ? [vehicle] : []}
      />
    </div>
  );
}
