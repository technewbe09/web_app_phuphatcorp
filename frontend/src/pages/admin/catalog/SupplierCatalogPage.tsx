import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
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
import { useGetSuppliers } from '../../../hooks/useSupplierCatalog';
import { SupplierFormModal } from '../../../components/catalog/SupplierFormModal';
import { DeleteSupplierDialog } from '../../../components/catalog/DeleteSupplierDialog';
import { UploadSuppliersModal } from '../../../components/catalog/UploadSuppliersModal';
import type { Supplier } from '../../../api/supplierCatalogApi';

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; supplier: Supplier }
  | { type: 'delete'; supplier: Supplier }
  | { type: 'upload' }
  | null;

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function SupplierCatalogPage() {
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const PAGE_SIZE = 20;

  const { data, isLoading, isError, refetch } = useGetSuppliers(search, page, PAGE_SIZE);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const suppliers = data?.suppliers ?? [];

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
          Danh mục nhà cung cấp
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModal({ type: 'upload' })}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Excel
          </Button>
          <Button onClick={() => setModal({ type: 'create' })}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm mới
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Tìm theo mã NCC hoặc tên nhà máy..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
                />
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
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">
                {search
                  ? 'Không tìm thấy nhà cung cấp nào phù hợp.'
                  : 'Chưa có nhà cung cấp nào. Nhấn "Thêm mới" để bắt đầu.'}
              </p>
              {!search && (
                <Button size="sm" onClick={() => setModal({ type: 'create' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm mới
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="w-40">Mã NCC</TableHead>
                    <TableHead>Tên nhà máy</TableHead>
                    <TableHead className="hidden md:table-cell">Ghi chú</TableHead>
                    <TableHead className="w-44">Ngày tạo</TableHead>
                    <TableHead className="w-24">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier, idx) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                        {supplier.supplier_code}
                      </TableCell>
                      <TableCell className="text-neutral-700 dark:text-neutral-300">
                        {supplier.name}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 hidden md:table-cell max-w-48 truncate">
                        {supplier.notes || '—'}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {new Date(supplier.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ type: 'edit', supplier })}
                            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'delete', supplier })}
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

      {/* Create / Edit modal */}
      <SupplierFormModal
        isOpen={modal?.type === 'create' || modal?.type === 'edit'}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        supplier={modal?.type === 'edit' ? modal.supplier : undefined}
      />

      {/* Delete dialog */}
      <DeleteSupplierDialog
        isOpen={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
        supplier={modal?.type === 'delete' ? modal.supplier : null}
      />

      {/* Upload modal */}
      <UploadSuppliersModal
        isOpen={modal?.type === 'upload'}
        onClose={() => setModal(null)}
        onSuccess={(msg) => showToast(msg)}
      />
    </div>
  );
}
