import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/Table';
import { useGetVehicleRepairs, useDeleteRepair } from '../../hooks/useVehicleRepairs';
import { RepairFormModal } from './RepairFormModal';
import type { VehicleRepairSummary, RepairRecord } from '../../api/vehicleRepairApi';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleRepairSummary;
  onError: (message: string) => void;
}

export function RepairHistoryModal({ isOpen, onClose, vehicle, onError }: Props) {
  const [page, setPage] = useState(1);
  const [viewRepairId, setViewRepairId] = useState<number | null>(null);
  const [editRepairId, setEditRepairId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RepairRecord | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [vehicle.vehicle_id]);

  const { data, isLoading, isError, refetch } = useGetVehicleRepairs(vehicle.vehicle_id, {
    page,
    limit: PAGE_SIZE,
  });
  const deleteMutation = useDeleteRepair();

  const repairs = data?.repairs ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const grandTotal = repairs.length > 0 ? (repairs[0] as unknown as { grand_total?: string }).grand_total : undefined;
  const displayTotal = grandTotal ? parseInt(grandTotal, 10) : 0;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      onError('Không thể xóa bill sửa xe');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <>
      <Modal isOpen={isOpen && !viewRepairId && !editRepairId} onClose={onClose} title={`Lịch sử sửa xe: ${vehicle.plate_number} - ${vehicle.driver_name}`} size="xl">
        {isOpen && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-500 dark:text-neutral-400">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-sm">Không thể tải lịch sử.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Thử lại
                </Button>
              </div>
            ) : repairs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Xe này chưa có lịch sử sửa chữa.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">STT</TableHead>
                        <TableHead className="w-32">Ngày sửa</TableHead>
                        <TableHead>Gara</TableHead>
                        <TableHead className="w-40 text-right">Tổng tiền</TableHead>
                        <TableHead className="w-20 text-center">Hạng mục</TableHead>
                        <TableHead className="w-32 text-center">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairs.map((r, idx) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                            {formatDate(r.repair_date)}
                          </TableCell>
                          <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                            {r.garage_name}
                          </TableCell>
                          <TableCell className="text-neutral-900 dark:text-neutral-100 text-sm text-right font-medium">
                            {formatCurrency(r.total_amount)}
                          </TableCell>
                          <TableCell className="text-center text-sm text-neutral-700 dark:text-neutral-300">
                            {((r as unknown as { item_count?: number }).item_count) ?? (r.items ? r.items.length : '-')}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewRepairId(r.id)}
                                className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditRepairId(r.id)}
                                className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(r)}
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
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {data.total} bill — Tổng tiền: {formatCurrency(displayTotal)}
                  </span>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={data.total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {viewRepairId && (
        <RepairFormModal
          isOpen={true}
          onClose={() => setViewRepairId(null)}
          onSuccess={() => {}}
          onError={onError}
          repairId={viewRepairId}
          viewMode
        />
      )}

      {editRepairId && (
        <RepairFormModal
          isOpen={true}
          onClose={() => setEditRepairId(null)}
          onSuccess={() => {}}
          onError={onError}
          repairId={editRepairId}
        />
      )}

      {confirmDelete && (
        <Modal isOpen={true} onClose={() => setConfirmDelete(null)} title="Xác nhận xóa" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Bạn có chắc muốn xóa bill sửa xe ngày{' '}
              <span className="font-medium">{formatDate(confirmDelete.repair_date)}</span>
              {' '}tại{' '}
              <span className="font-medium">{confirmDelete.garage_name}</span>?
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setConfirmDelete(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={handleDelete}
              >
                Xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
