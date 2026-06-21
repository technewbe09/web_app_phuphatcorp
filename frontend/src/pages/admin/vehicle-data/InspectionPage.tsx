import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Pagination } from '../../../components/ui/Pagination';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/Table';
import { useGetInspections, useDeleteInspection } from '../../../hooks/useVehicleInspections';
import { InspectionFormModal } from '../../../components/vehicle-data/InspectionFormModal';
import type { InspectionRecord } from '../../../api/vehicleInspectionApi';
import { cn } from '../../../utils/cn';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function InspectionPage() {
  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; inspection: InspectionRecord } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const PAGE_SIZE = 20;

  const { data, isLoading, isError, refetch } = useGetInspections({
    search: search || undefined,
    status: statusFilter,
    page,
    limit: PAGE_SIZE,
  });
  const deleteMutation = useDeleteInspection();

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleDelete = async (inspection: InspectionRecord) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi đăng kiểm này?')) return;
    try {
      await deleteMutation.mutateAsync(inspection.id);
      showToast('Đã xóa bản ghi đăng kiểm');
    } catch {
      showToast('Không thể xóa đăng kiểm', 'error');
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const inspections = data?.inspections ?? [];

  const getStatusBadge = (inspection: InspectionRecord) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(inspection.expiry_date);

    if (inspection.status === 'superseded') {
      return { label: 'Đã thay thế', className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' };
    }
    if (expiry < today) {
      return { label: 'Hết hạn', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    }
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 30) {
      return { label: 'Sắp hết hạn', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
    }
    return { label: 'Còn hạn', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Quản lý đăng kiểm
        </h1>
        <Button onClick={() => setModal({ type: 'create' })}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm đăng kiểm
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Tìm theo biển số..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 min-w-48 max-w-md"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Còn hạn</option>
              <option value="expiring">Sắp hết hạn</option>
              <option value="expired">Hết hạn</option>
              <option value="superseded">Đã thay thế</option>
            </select>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm">Không thể tải dữ liệu đăng kiểm.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          ) : inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">
                {search || statusFilter !== 'all'
                  ? 'Không tìm thấy bản ghi nào phù hợp.'
                  : 'Chưa có dữ liệu đăng kiểm.'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button size="sm" onClick={() => setModal({ type: 'create' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm đăng kiểm
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="w-36">Biển số</TableHead>
                    <TableHead>Tài xế</TableHead>
                    <TableHead className="w-32">Ngày đăng kiểm</TableHead>
                    <TableHead className="w-32">Ngày hết hạn</TableHead>
                    <TableHead className="w-28 text-center">Trạng thái</TableHead>
                    <TableHead className="w-24">Ghi chú</TableHead>
                    <TableHead className="w-24 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection, idx) => {
                    const badge = getStatusBadge(inspection);
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                          {inspection.plate_number || '-'}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {inspection.driver_name || '-'}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                          {new Date(inspection.inspection_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                          {new Date(inspection.expiry_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', badge.className)}>
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm max-w-40 truncate">
                          {inspection.notes || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setModal({ type: 'edit', inspection })}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                              title="Sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(inspection)}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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

      <InspectionFormModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        inspection={modal?.type === 'edit' ? modal.inspection : null}
      />
    </div>
  );
}
