import { useState } from 'react';
import { Upload, Trash2, Pencil, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { Pagination } from '../../../components/ui/Pagination';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { useGetDriverInvoices, useDeleteDriverInvoice } from '../../../hooks/useDriverInvoices';
import { DriverInvoiceUploadModal } from '../../../components/accounting-data/DriverInvoiceUploadModal';
import { DriverInvoiceEditModal } from '../../../components/accounting-data/DriverInvoiceEditModal';
import { DriverInvoiceCreateModal } from '../../../components/accounting-data/DriverInvoiceCreateModal';
import { InvoiceNumbersPopup } from '../../../components/accounting-data/InvoiceNumbersPopup';
import { useAuth } from '../../../hooks/useAuth';
import type { DriverInvoice, DriverInvoiceFilters } from '../../../api/driverInvoiceApi';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function DriverInvoicesPage() {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('accounting_data.manage') || user?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DriverInvoiceFilters>({ page: 1, limit: 20 });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[] | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<DriverInvoice | null>(null);

  const { data, isLoading, isError, refetch } = useGetDriverInvoices(filters);
  const deleteMutation = useDeleteDriverInvoice();

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: keyof DriverInvoiceFilters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleDelete = async (invoice: DriverInvoice) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hóa đơn này?`)) return;
    try {
      await deleteMutation.mutateAsync(invoice.id);
      showToast('Đã xóa hóa đơn');
    } catch {
      showToast('Không thể xóa hóa đơn', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast notifications */}
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
          Hóa đơn tài xế
        </h1>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo mới
            </Button>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Tải lên
            </Button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                placeholder="Mã..."
                value={filters.ma || ''}
                onChange={(e) => handleFilterChange('ma', e.target.value)}
              />
              <Input
                placeholder="Tên TX..."
                value={filters.ten_tx || ''}
                onChange={(e) => handleFilterChange('ten_tx', e.target.value)}
              />
              <Input
                placeholder="Số xe..."
                value={filters.so_xe || ''}
                onChange={(e) => handleFilterChange('so_xe', e.target.value)}
              />
              <Input
                placeholder="Nơi giao..."
                value={filters.noi_giao || ''}
                onChange={(e) => handleFilterChange('noi_giao', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                placeholder="Số HĐ..."
                value={filters.so_hoa_don || ''}
                onChange={(e) => handleFilterChange('so_hoa_don', e.target.value)}
              />
              <Input
                placeholder="Ghi chú..."
                value={filters.ghi_chu || ''}
                onChange={(e) => handleFilterChange('ghi_chu', e.target.value)}
              />
              <Input
                type="date"
                value={filters.ngay_from || ''}
                onChange={(e) => handleFilterChange('ngay_from', e.target.value)}
              />
              <Input
                type="date"
                value={filters.ngay_to || ''}
                onChange={(e) => handleFilterChange('ngay_to', e.target.value)}
              />
            </div>
          </div>
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
              <p className="text-sm">Không thể tải danh sách</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">Chưa có hóa đơn nào</p>
              {canManage && (
                <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Tải lên
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="w-20">Mã</TableHead>
                    <TableHead className="w-24">Tên TX</TableHead>
                    <TableHead className="w-24">Ngày</TableHead>
                    <TableHead className="w-28">Số xe</TableHead>
                    <TableHead className="min-w-48">Nơi giao</TableHead>
                    <TableHead className="min-w-48">Ghi chú</TableHead>
                    <TableHead className="w-16 text-center">HĐ</TableHead>
                    {canManage && <TableHead className="w-20">Hành động</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((row, idx) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {(page - 1) * (filters.limit || 20) + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                        {row.ma}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300">
                        {row.ten_tx}
                      </TableCell>
                      <TableCell className="text-neutral-600 dark:text-neutral-400">
                        {row.ngay}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300 font-mono text-sm">
                        {row.so_xe}
                      </TableCell>
                      <TableCell
                        className="text-neutral-600 dark:text-neutral-400 max-w-48 truncate"
                        title={row.noi_giao}
                      >
                        {row.noi_giao}
                      </TableCell>
                      <TableCell
                        className="text-neutral-700 dark:text-neutral-300 max-w-56 truncate font-mono text-sm"
                        title={row.ghi_chu || ''}
                      >
                        {row.ghi_chu || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => setSelectedInvoices(row.so_hoa_don)}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          title={row.so_hoa_don.join(', ')}
                        >
                          [{row.so_hoa_don.length}]
                        </button>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingInvoice(row)}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                              title="Sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.pagination && (
                <Pagination
                  currentPage={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  totalItems={data.pagination.total}
                  pageSize={data.pagination.limit}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <DriverInvoiceUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Invoice Numbers Popup */}
      {selectedInvoices !== null && (
        <InvoiceNumbersPopup
          numbers={selectedInvoices}
          onClose={() => setSelectedInvoices(null)}
        />
      )}

      {/* Edit Modal */}
      <DriverInvoiceEditModal
        isOpen={editingInvoice !== null}
        onClose={() => setEditingInvoice(null)}
        onSuccess={(msg) => showToast(msg)}
        invoice={editingInvoice}
      />

      {/* Create Modal */}
      <DriverInvoiceCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />
    </div>
  );
}
