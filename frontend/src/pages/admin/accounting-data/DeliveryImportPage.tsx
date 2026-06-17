import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { useImportDeliveryData, useGetBatches, useDeleteBatch } from '../../../hooks/useDeliveryData';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { ImportResult } from '../../../api/deliveryDataApi';

type PageState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function DeliveryImportPage() {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('accounting_data.manage') || user?.role === 'ADMIN';
  const navigate = useNavigate();

  const importMutation = useImportDeliveryData();
  const deleteMutation = useDeleteBatch();
  const [batchPage, setBatchPage] = useState(1);
  const { data: batchesData, refetch: refetchBatches } = useGetBatches(batchPage);

  const [pageState, setPageState] = useState<PageState>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      showToast('Vui lòng chọn file .xlsx', 'error');
      return;
    }
    setFile(f);
    setPageState('idle');
    setImportResult(null);
    setErrorMessage('');
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setPageState('uploading');
    setErrorMessage('');

    try {
      const result = await importMutation.mutateAsync(file);
      setImportResult(result);
      setPageState('success');
      showToast('Import hoàn tất');
      refetchBatches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi import dữ liệu';
      setErrorMessage(msg);
      setPageState('error');
      showToast(msg, 'error');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Xác nhận xóa batch này và toàn bộ dữ liệu liên quan?')) return;
    try {
      await deleteMutation.mutateAsync(batchId);
      showToast('Đã xóa batch');
      refetchBatches();
      if (importResult?.batch_id === batchId) {
        setImportResult(null);
        setPageState('idle');
        setFile(null);
      }
    } catch {
      showToast('Không thể xóa batch', 'error');
    }
  };

  const handleBatchPageChange = (newPage: number) => {
    setBatchPage(newPage);
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

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Import dữ liệu 5 nhà
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Upload file Excel dữ liệu giao hàng để import vào database và tự động đối chiếu hóa đơn
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Upload file Excel
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
            } ${!canManage ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => canManage && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{file.name}</p>
                  <p className="text-sm text-neutral-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 mx-auto text-neutral-400" />
                <p className="text-neutral-600 dark:text-neutral-300 font-medium">
                  Kéo thả file Excel vào đây hoặc click để chọn
                </p>
                <p className="text-sm text-neutral-400">Chỉ hỗ trợ file .xlsx</p>
              </div>
            )}
          </div>

          {file && canManage && (
            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={pageState === 'uploading'}
            >
              {pageState === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import vào database
                </>
              )}
            </Button>
          )}

          {pageState === 'error' && errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Result */}
      {pageState === 'success' && importResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Import hoàn tất
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Dòng mới</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {importResult.new_rows.toLocaleString()}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">HĐ mới</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {importResult.new_invoices.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-green-600 dark:text-green-400">Đã có</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {importResult.matched_count.toLocaleString()}
                </p>
              </div>
              <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Không có</p>
                <p className="text-lg font-bold text-neutral-600 dark:text-neutral-300">
                  {importResult.unmatched_count.toLocaleString()}
                </p>
              </div>
            </div>
            {(importResult.duplicate_rows > 0 || importResult.duplicate_invoices > 0) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {importResult.duplicate_rows > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                    Bỏ qua {importResult.duplicate_rows} dòng trùng (delivery_data)
                  </span>
                )}
                {importResult.duplicate_invoices > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                    Bỏ qua {importResult.duplicate_invoices} hóa đơn trùng (accountant_invoices)
                  </span>
                )}
              </div>
            )}
            {importResult.min_date && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Khoảng ngày: {importResult.min_date} → {importResult.max_date}
              </p>
            )}
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/accounting-data/invoice-matching?batch_id=${importResult.batch_id}`)
              }
            >
              <Eye className="w-4 h-4 mr-2" />
              Xem danh sách hóa đơn
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Batch History */}
      {batchesData && batchesData.data.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Lịch sử import
            </h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">File</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Dòng</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Hóa đơn</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Đã có</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Không có</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Ngày import</th>
                    <th className="text-right py-3 px-2 font-medium text-neutral-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batchesData.data.map((batch) => (
                    <tr
                      key={batch.batch_id}
                      className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="py-3 px-2">
                        <span className="text-neutral-900 dark:text-neutral-100">{batch.original_filename}</span>
                      </td>
                      <td className="py-3 px-2 text-neutral-600 dark:text-neutral-400">{batch.total_rows}</td>
                      <td className="py-3 px-2 text-neutral-600 dark:text-neutral-400">{batch.total_invoices}</td>
                      <td className="py-3 px-2 text-green-600 dark:text-green-400 font-medium">{batch.matched_count}</td>
                      <td className="py-3 px-2 text-neutral-500">{batch.unmatched_count}</td>
                      <td className="py-3 px-2 text-neutral-500 text-xs">
                        {new Date(batch.uploaded_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/accounting-data/invoice-matching?batch_id=${batch.batch_id}`)
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBatch(batch.batch_id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {batchesData.pagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={batchesData.pagination.page}
                  totalPages={batchesData.pagination.totalPages}
                  totalItems={batchesData.pagination.total}
                  pageSize={batchesData.pagination.limit}
                  onPageChange={handleBatchPageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
