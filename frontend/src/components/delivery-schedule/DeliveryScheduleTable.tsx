import { FileX, AlertCircle, RefreshCw, Upload, Pencil, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Button } from '../ui/Button';
import type { DeliverySchedule } from '../../api/deliveryScheduleApi';

interface Props {
  data: DeliverySchedule[];
  isLoading: boolean;
  isEmpty: boolean;
  isError: boolean;
  canManage?: boolean;
  onUpload?: () => void;
  onRetry?: () => void;
  onEdit?: (record: DeliverySchedule) => void;
  onDelete?: (record: DeliverySchedule) => void;
}

function SkeletonRow({ showActions }: { showActions?: boolean }) {
  return (
    <TableRow>
      {Array.from({ length: showActions ? 9 : 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DeliveryScheduleTable({
  data,
  isLoading,
  isEmpty,
  isError,
  canManage,
  onUpload,
  onRetry,
  onEdit,
  onDelete,
}: Props) {
  const showActions = canManage && (onEdit || onDelete);

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Ngày</TableHead>
              <TableHead className="w-16">STT</TableHead>
              <TableHead>Nơi giao</TableHead>
              <TableHead className="w-24 text-right">Tấn</TableHead>
              <TableHead className="w-32">Số xe</TableHead>
              <TableHead className="w-32">Cân</TableHead>
              <TableHead className="w-28">Loại</TableHead>
              <TableHead>Ghi chú</TableHead>
              {showActions && <TableHead className="w-24">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} showActions={!!showActions} />)}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Không thể tải dữ liệu.</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
        <FileX className="w-8 h-8" />
        <p className="text-sm font-medium">Chưa có dữ liệu lịch đi hàng</p>
        <p className="text-xs">Upload file Excel để bắt đầu</p>
        {canManage && onUpload && (
          <Button size="sm" onClick={onUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Excel
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Ngày</TableHead>
            <TableHead className="w-16">STT</TableHead>
            <TableHead>Nơi giao</TableHead>
            <TableHead className="w-24 text-right">Tấn</TableHead>
            <TableHead className="w-32">Số xe</TableHead>
            <TableHead className="w-32">Cân</TableHead>
            <TableHead className="w-28">Loại</TableHead>
            <TableHead>Ghi chú</TableHead>
            {showActions && <TableHead className="w-24 text-center">Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-neutral-700 dark:text-neutral-300 tabular-nums text-sm">
                {dayjs(row.ngay).format('DD/MM/YYYY')}
              </TableCell>
              <TableCell className="text-neutral-600 dark:text-neutral-400 tabular-nums">
                {row.stt}
              </TableCell>
              <TableCell className="text-neutral-800 dark:text-neutral-200 font-medium">
                {row.noi_giao ?? '—'}
              </TableCell>
              <TableCell className="text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                {row.tan != null ? parseFloat(String(row.tan)).toFixed(2) : '—'}
              </TableCell>
              <TableCell className="text-neutral-600 dark:text-neutral-400">
                {row.so_xe ?? '—'}
              </TableCell>
              <TableCell className="text-neutral-600 dark:text-neutral-400">
                {row.can_info ?? '—'}
              </TableCell>
              <TableCell>
                {row.loai && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                    row.loai === 'Giá tấn'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {row.loai}
                  </span>
                )}
                {!row.loai && <span className="text-neutral-400 dark:text-neutral-600">—</span>}
              </TableCell>
              <TableCell className="text-neutral-500 dark:text-neutral-500 max-w-[12rem] truncate" title={row.ghi_chu ?? undefined}>
                {row.ghi_chu ?? '—'}
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        title="Sửa"
                        onClick={() => onEdit(row)}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        title="Xóa"
                        onClick={() => onDelete(row)}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
