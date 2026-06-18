import { X } from 'lucide-react';
import type { InvoiceNumber } from '../../api/driverInvoiceApi';

interface Props {
  numbers: InvoiceNumber[];
  onClose: () => void;
}

export function InvoiceNumbersPopup({ numbers, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Số hóa đơn ({numbers.length})
          </h4>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 max-h-64 overflow-y-auto">
          {numbers.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
              Không có số hóa đơn nào
            </p>
          ) : (
            <div className="space-y-2">
              {numbers.map((num, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800"
                >
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {num.so}
                  </span>
                  {num.ghi_chu && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                      {num.ghi_chu}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
