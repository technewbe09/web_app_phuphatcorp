import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { DocumentPreview } from './DocumentPreview';
import { UploadDocumentsModal } from './UploadDocumentsModal';
import { SupplementNoteDialog } from './SupplementNoteDialog';
import { ConfirmFinishDialog } from './ConfirmFinishDialog';
import { useUploadDocuments, useReviewTicket } from '../../hooks/useInvoiceTracking';
import { useAuth } from '../../hooks/useAuth';
import type { InvoiceTrackingTicket } from '../../api/invoiceTrackingApi';
import { formatDate, formatDateTime } from '../../utils/format';
import { Truck, AlertCircle, FileText, CheckCircle2, Clock } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: InvoiceTrackingTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, isOpen, onClose }: TicketDetailModalProps) {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [showSupplement, setShowSupplement] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  const uploadMutation = useUploadDocuments();
  const reviewMutation = useReviewTicket();

  if (!ticket) return null;

  const canUpload = ticket.invoice_status === 'created' || ticket.invoice_status === 'request_supplement';
  const canReview = ticket.invoice_status === 'pending_review' && (hasPermission('invoice_tracking.manage') || hasPermission('dispatch.manage'));

  const handleUpload = async (files: File[], note: string) => {
    const filePromises = files.map(async (file) => {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      return {
        file_name: file.name,
        mime_type: file.type,
        file_data: base64,
      };
    });

    const fileData = await Promise.all(filePromises);

    uploadMutation.mutate(
      { id: ticket.id, data: { files: fileData, driver_note: note || undefined } },
      {
        onSuccess: () => {
          setShowUpload(false);
          onClose();
        },
        onError: (err: any) => {
          console.error("Error:", err?.response?.data?.message || t('invoice_tracking.message.errorUpload'));
        },
      },
    );
  };

  const handleFinish = () => {
    reviewMutation.mutate(
      { id: ticket.id, data: { action: 'finish' } },
      {
        onSuccess: () => {
          setShowConfirmFinish(false);
          onClose();
        },
        onError: (err: any) => {
          console.error("Error:", err?.response?.data?.message || t('invoice_tracking.message.errorReview'));
        },
      },
    );
  };

  const handleRequestSupplement = (note: string) => {
    reviewMutation.mutate(
      { id: ticket.id, data: { action: 'request_supplement', supplement_note: note } },
      {
        onSuccess: () => {
          setShowSupplement(false);
          onClose();
        },
        onError: (err: any) => {
          console.error("Error:", err?.response?.data?.message || t('invoice_tracking.message.errorReview'));
        },
      },
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('invoice_tracking.detail.title')} size="xl">
        <div className="space-y-4 sm:space-y-5">
          {/* Main Trip Overview Card */}
          <div className="rounded-xl border border-neutral-200 p-3.5 sm:p-4 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {ticket.bien_so}
                </h3>
              </div>
              <InvoiceStatusBadge status={ticket.invoice_status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">{t('invoice_tracking.table.date')}</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5 block">{formatDate(ticket.ngay)}</span>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">{t('invoice_tracking.table.taiXe')}</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5 block">{ticket.tai_xe || '—'}</span>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">{t('invoice_tracking.table.maChuyen')}</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 mt-0.5 block">{ticket.ma_chuyen || '—'}</span>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800 sm:col-span-2">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">{t('invoice_tracking.table.diemNhan')}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 mt-0.5 block break-words">{ticket.diem_nhan || '—'}</span>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">{t('invoice_tracking.table.diemTra')}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 mt-0.5 block">{ticket.tan || '—'}</span>
              </div>
            </div>

            {ticket.ghi_chu && (
              <div className="mt-2.5 text-xs sm:text-sm bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs font-medium">Ghi chú chuyến:</span>
                <span className="text-neutral-800 dark:text-neutral-200 mt-0.5 block">{ticket.ghi_chu}</span>
              </div>
            )}
          </div>

          {/* Notes & Processing Progress */}
          {(ticket.driver_note || ticket.supplement_note || ticket.reviewed_at || ticket.completed_at) && (
            <div className="rounded-xl border border-neutral-200 p-3.5 sm:p-4 dark:border-neutral-800 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-500" />
                {t('invoice_tracking.detail.statusHistory')}
              </h3>
              
              <div className="space-y-2.5 text-xs sm:text-sm">
                {ticket.driver_note && (
                  <div className="rounded-lg bg-neutral-100/70 p-3 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      {t('invoice_tracking.detail.driverNote')}:
                    </span>
                    <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{ticket.driver_note}</p>
                  </div>
                )}
                {ticket.supplement_note && (
                  <div className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                    <span className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-red-800 dark:text-red-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {t('invoice_tracking.detail.supplementNote')}:
                    </span>
                    <p className="whitespace-pre-wrap">{ticket.supplement_note}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 pt-1 text-xs text-neutral-500">
                  {ticket.reviewed_at && (
                    <div>
                      <span>{t('invoice_tracking.detail.reviewedAt')}: </span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatDateTime(ticket.reviewed_at)}</span>
                    </div>
                  )}
                  {ticket.completed_at && (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('invoice_tracking.detail.completedAt')}: {formatDateTime(ticket.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attached Documents List */}
          <div className="rounded-xl border border-neutral-200 p-3.5 sm:p-4 dark:border-neutral-800">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-neutral-500" />
              {t('invoice_tracking.detail.documents')} ({ticket.documents?.length || 0})
            </h3>
            <DocumentPreview documents={ticket.documents || []} />
          </div>

          {/* Bottom Actions Toolbar */}
          <div className="pt-2 flex flex-col sm:flex-row sm:justify-end gap-2.5">
            {canUpload && (
              <Button
                variant="primary"
                onClick={() => setShowUpload(true)}
                className="w-full sm:w-auto h-11 sm:h-10 text-sm font-medium"
              >
                {t('invoice_tracking.action.upload')}
              </Button>
            )}
            {canReview && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowSupplement(true)}
                  className="w-full sm:w-auto h-11 sm:h-10 text-sm font-medium"
                >
                  {t('invoice_tracking.action.requestSupplement')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowConfirmFinish(true)}
                  className="w-full sm:w-auto h-11 sm:h-10 text-sm font-medium"
                >
                  {t('invoice_tracking.action.finish')}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto h-11 sm:h-10 text-sm font-medium"
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      <UploadDocumentsModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSubmit={handleUpload}
        isLoading={uploadMutation.isPending}
      />
      <SupplementNoteDialog
        isOpen={showSupplement}
        onClose={() => setShowSupplement(false)}
        onSubmit={handleRequestSupplement}
        isLoading={reviewMutation.isPending}
      />
      <ConfirmFinishDialog
        isOpen={showConfirmFinish}
        onClose={() => setShowConfirmFinish(false)}
        onConfirm={handleFinish}
        isLoading={reviewMutation.isPending}
      />
    </>
  );
}
