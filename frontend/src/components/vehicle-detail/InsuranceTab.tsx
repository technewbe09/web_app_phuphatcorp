import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useGetInsurances, useDeleteInsurance } from '../../hooks/useVehicleInsurances';
import { InsuranceFormModal } from '../../components/vehicle-data/InsuranceFormModal';
import type { InsuranceRecord } from '../../api/vehicleInsuranceApi';
import { cn } from '../../utils/cn';

interface Toast { id: number; message: string; variant: 'success' | 'error'; }

interface Props {
  vehicleId: number;
  vehicleType: string;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
}

export function InsuranceTab({ vehicleId, vehicleType, setToasts }: Props) {
  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; record: InsuranceRecord } | { type: 'view'; id: number } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, isError, refetch } = useGetInsurances({ vehicle_id: vehicleId, page, limit: PAGE_SIZE });
  const deleteMutation = useDeleteInsurance();

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleDelete = async (record: InsuranceRecord) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi bảo hiểm này?')) return;
    try {
      await deleteMutation.mutateAsync(record.id);
      showToast('Đã xóa bản ghi bảo hiểm');
    } catch {
      showToast('Không thể xóa bản ghi', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Còn hạn', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
      case 'expired': return { label: 'Hết hạn', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
      case 'superseded': return { label: 'Đã thay thế', className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' };
      default: return { label: status, className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' };
    }
  };

  if (vehicleType === 'Xe ngoài') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
        <p className="text-sm">Xe ngoài không áp dụng bảo hiểm.</p>
      </div>
    );
  }

  const records = data?.insurances ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setModal({ type: 'create' })} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Thêm bảo hiểm
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
              <p className="text-sm">Không thể tải dữ liệu bảo hiểm.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">Chưa có dữ liệu bảo hiểm.</p>
              <Button size="sm" onClick={() => setModal({ type: 'create' })}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm bảo hiểm
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="w-32">Ngày mua</TableHead>
                    <TableHead className="w-32">Ngày hết hạn</TableHead>
                    <TableHead className="w-28 text-center">Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-28 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, idx) => {
                    const badge = getStatusBadge(record.status);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                          {new Date(record.purchase_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                          {new Date(record.expiry_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', badge.className)}>
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm max-w-40 truncate">
                          {record.notes || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setModal({ type: 'view', id: record.id })}
                              className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination currentPage={page} totalPages={totalPages} totalItems={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <InsuranceFormModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        insurance={modal?.type === 'edit' ? modal.record : null}
        viewInsuranceId={modal?.type === 'view' ? modal.id : undefined}
        viewMode={modal?.type === 'view'}
        preselectedVehicleId={modal?.type === 'create' ? vehicleId : undefined}
      />
    </div>
  );
}
