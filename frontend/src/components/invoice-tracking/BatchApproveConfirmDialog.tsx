import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle2 } from 'lucide-react';

interface BatchApproveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  isLoading?: boolean;
}

export function BatchApproveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading,
}: BatchApproveConfirmDialogProps) {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('invoice_tracking.quickApproval.confirmBatchTitle' as never) || 'Xác nhận phê duyệt hàng loạt'}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Bạn đang chuẩn bị phê duyệt "Hoàn thành" cho{' '}
            <strong className="font-bold">{selectedCount}</strong> chuyến xe cùng lúc.
          </p>
        </div>

        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
          {t('invoice_tracking.quickApproval.confirmBatchWarning' as never) ||
            'Các chuyến xe này sẽ được xác nhận đủ chứng từ và chuyển sang trạng thái Hoàn thành.'}
        </p>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto h-11 sm:h-10 text-xs sm:text-sm"
          >
            {t('invoice_tracking.action.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto h-11 sm:h-10 text-xs sm:text-sm font-medium"
          >
            {isLoading
              ? 'Đang phê duyệt...'
              : `Phê duyệt ${selectedCount} chuyến`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
