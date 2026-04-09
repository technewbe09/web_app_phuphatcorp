import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface AdjustmentRow {
  rawRowIndex: number;
  sourceRowNum: number;
  maHang: string;
  tenHangFile: string;
  tenHangMaster: string;
  spTrongLuongGoc: number;
  giaTriApDung: number;
  lyDo: 'gia_tri_cu' | 'gia_tri_dieu_chinh';
}

interface WeightAdjustmentConfirmDialogProps {
  isOpen: boolean;
  adjustments: AdjustmentRow[];
  onConfirm: () => void;
  onSkip: () => void;
}

export function WeightAdjustmentConfirmDialog({
  isOpen,
  adjustments,
  onConfirm,
  onSkip,
}: WeightAdjustmentConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onSkip} size="xl" className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Phát hiện dữ liệu cần điều chỉnh trọng lượng
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {adjustments.length} dòng có mã sản phẩm khớp với masterdata điều chỉnh trọng lượng
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-5">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-3 py-2.5 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 w-14">Dòng</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Mã hàng</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Tên hàng (file)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Tên hàng (masterdata)</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">SP TL gốc</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">SP TL mới</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">Lý do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {adjustments.map((adj) => (
              <tr key={`${adj.rawRowIndex}`} className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-3 py-2 text-right text-neutral-500 dark:text-neutral-400">{adj.sourceRowNum}</td>
                <td className="px-3 py-2 font-mono text-neutral-900 dark:text-neutral-100">{adj.maHang}</td>
                <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{adj.tenHangFile}</td>
                <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{adj.tenHangMaster}</td>
                <td className="px-3 py-2 text-right text-neutral-600 dark:text-neutral-400">{adj.spTrongLuongGoc}</td>
                <td className="px-3 py-2 text-right font-semibold text-neutral-900 dark:text-neutral-100">{adj.giaTriApDung}</td>
                <td className="px-3 py-2 text-center">
                  {adj.lyDo === 'gia_tri_cu' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Giá trị cũ
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      Giá trị điều chỉnh
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onSkip}>
          Bỏ qua, xử lý nguyên gốc
        </Button>
        <Button onClick={onConfirm}>
          Xác nhận và xử lý
        </Button>
      </div>
    </Modal>
  );
}
