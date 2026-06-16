import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { DuplicateInfo } from '../../api/driverInvoiceApi';

interface Props {
  duplicates: DuplicateInfo[];
  newCount: number;
  onSkip: () => void;
  onCancel: () => void;
}

export function DuplicateConfirmDialog({ duplicates, newCount, onSkip, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Phát hiện dòng trùng
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-auto">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Có <span className="font-medium text-neutral-900 dark:text-neutral-100">{duplicates.length}</span> dòng đã tồn tại trong hệ thống.
            Bạn có muốn bỏ qua các dòng trùng và chỉ import{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{newCount}</span> dòng mới không?
          </p>

          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">#</th>
                  <th className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Mã</th>
                  <th className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Tên TX</th>
                  <th className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Ngày</th>
                  <th className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Số xe</th>
                  <th className="px-3 py-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Số HĐ gốc</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((d, i) => (
                  <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{d.ma}</td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{d.ten_tx}</td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{d.ngay}</td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{d.so_xe}</td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 max-w-48 truncate" title={d.ghi_chu ?? ''}>
                      {d.ghi_chu ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button onClick={onSkip}>
            Bỏ qua dòng trùng, import mới
          </Button>
        </div>
      </div>
    </div>
  );
}
