import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Paperclip, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { useGetDrivers, useDeleteDriver } from '../../../hooks/useDrivers';
import { DriverFormModal } from '../../../components/vehicle-data/DriverFormModal';
import { DriverDocumentsModal } from '../../../components/vehicle-data/DriverDocumentsModal';
import type { Driver } from '../../../api/driverApi';

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; row: Driver }
  | { type: 'delete'; row: Driver }
  | { type: 'documents'; row: Driver }
  | null;

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function DriverPage() {
  const { data, isLoading, isError, refetch } = useGetDrivers();
  const deleteDriver = useDeleteDriver();

  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteError, setDeleteError] = useState('');

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter(
      (row) =>
        row.ten_ky_hieu.toLowerCase().includes(q) ||
        (row.ho_ten?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search]);

  const closeModal = () => {
    setModal(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (modal?.type !== 'delete') return;
    setDeleteError('');
    try {
      await deleteDriver.mutateAsync(modal.row.id);
      showToast('Đã xóa tài xế!');
      closeModal();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string } } };
        setDeleteError(e.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      } else {
        setDeleteError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs pointer-events-auto transition-all ${
              t.variant === 'success'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Thông tin tài xế</h1>
        <Button onClick={() => setModal({ type: 'create' })}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo mới
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Tìm theo Tên ký hiệu hoặc Họ tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">
                {search
                  ? 'Không tìm thấy tài xế nào phù hợp.'
                  : 'Chưa có tài xế. Nhấn "Tạo mới" để bắt đầu.'}
              </p>
              {!search && (
                <Button size="sm" onClick={() => setModal({ type: 'create' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo mới
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Tên ký hiệu</TableHead>
                    <TableHead className="w-44">Họ tên</TableHead>
                    <TableHead className="w-36">Liên hệ</TableHead>
                    <TableHead className="w-36">CCCD</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-28">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                        {row.ten_ky_hieu}
                      </TableCell>
                      <TableCell className="text-neutral-600 dark:text-neutral-400">
                        {row.ho_ten || '—'}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {row.lien_he || '—'}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {row.cccd || '—'}
                      </TableCell>
                      <TableCell
                        className="text-neutral-500 dark:text-neutral-400 text-sm max-w-[16rem] truncate"
                        title={row.ghi_chu ?? undefined}
                      >
                        {row.ghi_chu || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ type: 'edit', row })}
                            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'documents', row })}
                            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Tài liệu"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'delete', row })}
                            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
          )}
        </CardContent>
      </Card>

      {/* Create / Edit modal */}
      <DriverFormModal
        isOpen={modal?.type === 'create' || modal?.type === 'edit'}
        onClose={closeModal}
        onSuccess={(msg) => {
          showToast(msg);
          closeModal();
        }}
        editRow={modal?.type === 'edit' ? modal.row : null}
      />

      {/* Documents modal */}
      <DriverDocumentsModal
        isOpen={modal?.type === 'documents'}
        onClose={closeModal}
        driver={modal?.type === 'documents' ? modal.row : null}
      />

      {/* Delete confirm dialog */}
      <Modal
        isOpen={modal?.type === 'delete'}
        onClose={closeModal}
        title="Xác nhận xóa"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {deleteError}
            </div>
          )}
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Bạn có chắc muốn xóa tài xế{' '}
                <span className="font-semibold">
                  "{modal?.type === 'delete' ? modal.row.ten_ky_hieu : ''}"
                </span>
                ?
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Tất cả tài liệu đính kèm sẽ bị xóa theo.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Hủy
            </Button>
            <Button
              variant="danger"
              isLoading={deleteDriver.isPending}
              onClick={handleDelete}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
