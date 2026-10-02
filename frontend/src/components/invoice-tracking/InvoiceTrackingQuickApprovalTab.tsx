import { useState, useMemo, useEffect, useCallback } from 'react';
import { useI18n } from '../../i18n/useI18n';
import {
  Search,
  RefreshCw,
  Calendar,
  Truck,
  User,
  MapPin,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Eye,
  Copy,
  Zap,
} from 'lucide-react';
import {
  useInvoiceTracking,
  useReviewTicket,
  useBatchFinishTickets,
} from '../../hooks/useInvoiceTracking';
import { TicketDetailModal } from './TicketDetailModal';
import { SupplementNoteDialog } from './SupplementNoteDialog';
import { ConfirmFinishDialog } from './ConfirmFinishDialog';
import { BatchApproveConfirmDialog } from './BatchApproveConfirmDialog';
import { DocumentViewerModal } from './DocumentViewerModal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/Table';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { formatDate } from '../../utils/format';
import type { InvoiceTrackingTicket, DocumentFile } from '../../api/invoiceTrackingApi';

const PAGE_SIZE = 50;

export function InvoiceTrackingQuickApprovalTab() {
  const { t } = useI18n();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialog & Modal states
  const [selectedDetailTicket, setSelectedDetailTicket] = useState<InvoiceTrackingTicket | null>(null);
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<{
    doc: DocumentFile;
    docs: DocumentFile[];
  } | null>(null);
  const [singleApproveTicket, setSingleApproveTicket] = useState<InvoiceTrackingTicket | null>(null);
  const [singleSupplementTicket, setSingleSupplementTicket] = useState<InvoiceTrackingTicket | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Query only pending_review tickets
  const filters = useMemo(
    () => ({
      status: ['pending_review'],
      search: debouncedSearch || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, dateFrom, dateTo, page],
  );

  const { data, isLoading, isError, refetch, isFetching } = useInvoiceTracking(filters);

  const reviewMutation = useReviewTicket();
  const batchFinishMutation = useBatchFinishTickets();

  const items = data?.items || [];
  const totalTickets = data?.pagination.total || 0;

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Selection helpers
  const allCurrentPageSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const someCurrentPageSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.some((item) => selectedIds.has(item.id)) && !allCurrentPageSelected;
  }, [items, selectedIds, allCurrentPageSelected]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        items.forEach((item) => next.delete(item.id));
      } else {
        items.forEach((item) => next.add(item.id));
      }
      return next;
    });
  }, [allCurrentPageSelected, items]);

  const handleToggleSingleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilters = Boolean(searchInput || dateFrom || dateTo);

  // Single Approve
  const handleSingleApproveConfirm = () => {
    if (!singleApproveTicket) return;
    reviewMutation.mutate(
      { id: singleApproveTicket.id, data: { action: 'finish' } },
      {
        onSuccess: () => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(singleApproveTicket.id);
            return next;
          });
          setActionFeedback({
            type: 'success',
            message: `Đã phê duyệt hoàn thành cho xe ${singleApproveTicket.bien_so} thành công!`,
          });
          setSingleApproveTicket(null);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Không thể phê duyệt chuyến xe. Vui lòng thử lại.';
          setActionFeedback({ type: 'error', message: msg });
          setSingleApproveTicket(null);
        },
      },
    );
  };

  // Single Request Supplement
  const handleSingleSupplementConfirm = (note: string) => {
    if (!singleSupplementTicket) return;
    reviewMutation.mutate(
      { id: singleSupplementTicket.id, data: { action: 'request_supplement', supplement_note: note } },
      {
        onSuccess: () => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(singleSupplementTicket.id);
            return next;
          });
          setActionFeedback({
            type: 'success',
            message: `Đã gửi yêu cầu bổ sung cho xe ${singleSupplementTicket.bien_so}!`,
          });
          setSingleSupplementTicket(null);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Không thể gửi yêu cầu bổ sung. Vui lòng thử lại.';
          setActionFeedback({ type: 'error', message: msg });
          setSingleSupplementTicket(null);
        },
      },
    );
  };

  // Batch Approve
  const handleBatchApproveConfirm = () => {
    if (selectedIds.size === 0) return;
    const ticketIdsArray = Array.from(selectedIds);

    batchFinishMutation.mutate(
      { ticket_ids: ticketIdsArray },
      {
        onSuccess: (res) => {
          setSelectedIds(new Set());
          setShowBatchConfirm(false);
          setActionFeedback({
            type: 'success',
            message: `Đã phê duyệt hoàn thành ${res.success_count} chuyến xe thành công!`,
          });
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Không thể phê duyệt hàng loạt. Vui lòng thử lại.';
          setActionFeedback({ type: 'error', message: msg });
          setShowBatchConfirm(false);
        },
      },
    );
  };

  if (isError) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Không thể tải danh sách chuyến xe chờ duyệt
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {t('invoice_tracking.page.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Action feedback toast banner */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm shadow-sm animate-in fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <Card className="border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {t('invoice_tracking.quickApproval.title' as never) || 'Phê duyệt nhanh chứng từ'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold">
                  {totalTickets}
                </span>
                {isFetching && !isLoading && (
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-400 animate-spin ml-1" />
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('invoice_tracking.quickApproval.subtitle' as never) ||
                  'Danh sách các chuyến xe đang chờ duyệt chứng từ'}
              </p>
            </div>

            {/* Date Range & Clear */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-500 font-medium">{t('invoice_tracking.quickApproval.dateFrom' as never) || 'Từ'}:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent border-0 p-0 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none"
                />
                <span className="text-neutral-400 mx-0.5">-</span>
                <span className="text-neutral-500 font-medium">{t('invoice_tracking.quickApproval.dateTo' as never) || 'Đến'}:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent border-0 p-0 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                  {t('invoice_tracking.stats.filters.clear')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="relative">
            <Input
              placeholder={
                t('invoice_tracking.quickApproval.searchPlaceholder' as never) ||
                'Tìm theo biển số, tài xế, điểm nhận, ghi chú...'
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 text-xs sm:text-sm bg-white dark:bg-neutral-900"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sticky Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 p-3 sm:p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
              {selectedIds.size}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {t('invoice_tracking.quickApproval.selectedCount' as never, { count: selectedIds.size }) ||
                `Đã chọn ${selectedIds.size} chuyến xe`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="h-9 px-3 text-xs"
            >
              {t('invoice_tracking.quickApproval.clearSelection' as never) || 'Bỏ chọn'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowBatchConfirm(true)}
              className="h-9 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {t('invoice_tracking.quickApproval.batchApprove' as never, { count: selectedIds.size }) ||
                  `Phê duyệt hoàn thành (${selectedIds.size})`}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {t('invoice_tracking.quickApproval.empty' as never) ||
                  'Hiện không có chuyến xe nào đang chờ duyệt.'}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Tất cả các chuyến xe đã được duyệt hoặc chưa có chuyến xe nào nộp chứng từ.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="md:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                {items.map((ticket, idx) => {
                  const isChecked = selectedIds.has(ticket.id);
                  const docs: DocumentFile[] = Array.isArray(ticket.documents) ? ticket.documents : [];

                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 transition-colors ${
                        isChecked
                          ? 'bg-neutral-50 dark:bg-neutral-800/80'
                          : 'bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSingleSelect(ticket.id)}
                            className="w-4.5 h-4.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                                {ticket.bien_so}
                              </span>
                              <span className="text-xs text-neutral-400">•</span>
                              <span className="text-xs text-neutral-500">{formatDate(ticket.ngay)}</span>
                            </div>
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 block mt-0.5">
                              {ticket.tai_xe || 'Chưa gán tài xế'}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                          Chờ duyệt
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 pl-7 mb-3">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{ticket.diem_nhan || '—'}</span>
                        </div>
                        {ticket.ghi_chu && (
                          <div className="flex items-start gap-1.5 text-neutral-500">
                            <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                            <span className="italic truncate">Ghi chú: {ticket.ghi_chu}</span>
                          </div>
                        )}
                        {ticket.driver_note && (
                          <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 italic">
                            "{ticket.driver_note}"
                          </div>
                        )}
                      </div>

                      {/* Thumbnails row */}
                      {docs.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pl-7 pb-2.5">
                          {docs.map((doc, dIdx) => {
                            const isImg = doc.mime_type?.startsWith('image/');
                            const imgSrc = doc.filename
                              ? `/api/invoice-tracking/files/${doc.filename}`
                              : doc.file_data
                                ? `data:${doc.mime_type};base64,${doc.file_data}`
                                : null;

                            return (
                              <button
                                key={dIdx}
                                type="button"
                                onClick={() => setSelectedViewerDoc({ doc, docs })}
                                className="relative w-12 h-12 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 flex items-center justify-center cursor-pointer hover:border-neutral-400"
                                title={doc.original_filename || doc.file_name}
                              >
                                {isImg && imgSrc ? (
                                  <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                                ) : isImg ? (
                                  <ImageIcon className="w-4 h-4 text-sky-500" />
                                ) : (
                                  <FileText className="w-4 h-4 text-rose-500" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 pl-7">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDetailTicket(ticket)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Chi tiết
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setSingleSupplementTicket(ticket)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          {t('invoice_tracking.quickApproval.requestSupplementSingle' as never) || 'Y/C bổ sung'}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => setSingleApproveTicket(ticket)}
                          className="h-8 px-3 text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {t('invoice_tracking.quickApproval.approveSingle' as never) || 'Duyệt'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/70 dark:bg-neutral-800/60">
                      <TableHead className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someCurrentPageSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                          title={t('invoice_tracking.quickApproval.selectAll' as never) || 'Chọn tất cả trang này'}
                        />
                      </TableHead>
                      <TableHead className="w-12 text-center">{t('invoice_tracking.table.stt')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('invoice_tracking.table.date')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('invoice_tracking.table.bienSo')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('invoice_tracking.table.taiXe')}</TableHead>
                      <TableHead className="min-w-[130px]">{t('invoice_tracking.table.diemNhan')}</TableHead>
                      <TableHead className="min-w-[160px]">Chứng từ</TableHead>
                      <TableHead className="min-w-[140px] max-w-[200px]">{t('invoice_tracking.table.ghiChu')}</TableHead>
                      <TableHead className="w-48 text-center">{t('invoice_tracking.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((ticket, idx) => {
                      const isChecked = selectedIds.has(ticket.id);
                      const docs: DocumentFile[] = Array.isArray(ticket.documents) ? ticket.documents : [];

                      return (
                        <TableRow
                          key={ticket.id}
                          className={`hover:bg-neutral-50/90 dark:hover:bg-neutral-800/60 transition-colors ${
                            isChecked ? 'bg-neutral-50/90 dark:bg-neutral-800/70' : ''
                          }`}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSingleSelect(ticket.id)}
                              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-center text-neutral-400 font-mono text-xs">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            {formatDate(ticket.ngay)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                              {ticket.bien_so}
                            </span>
                            <span className="text-[11px] text-neutral-400 block">
                              {ticket.loai_tuyen} • {ticket.loai_xe}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-200">
                            {ticket.tai_xe || '—'}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-xs" title={ticket.diem_nhan}>
                            {ticket.diem_nhan || '—'}
                          </TableCell>
                          <TableCell>
                            {docs.length === 0 ? (
                              <span className="text-xs text-neutral-400 italic">Chưa có tệp</span>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                                {docs.slice(0, 4).map((doc, dIdx) => {
                                  const isImg = doc.mime_type?.startsWith('image/');
                                  const imgSrc = doc.filename
                                    ? `/api/invoice-tracking/files/${doc.filename}`
                                    : doc.file_data
                                      ? `data:${doc.mime_type};base64,${doc.file_data}`
                                      : null;

                                  return (
                                    <button
                                      key={dIdx}
                                      type="button"
                                      onClick={() => setSelectedViewerDoc({ doc, docs })}
                                      className="relative w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:border-neutral-400 cursor-pointer transition shadow-2xs group/thumb"
                                      title={doc.original_filename || doc.file_name}
                                    >
                                      {isImg && imgSrc ? (
                                        <img src={imgSrc} alt="" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                                      ) : isImg ? (
                                        <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                                      )}
                                      {doc.source_plate_number && (
                                        <div className="absolute bottom-0 right-0 p-0.5 bg-neutral-900/80 text-[8px] text-white">
                                          <Copy className="w-2 h-2 text-sky-400" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                                {docs.length > 4 && (
                                  <span className="text-[11px] font-mono text-neutral-400 font-medium">
                                    +{docs.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px] text-xs">
                            {ticket.driver_note ? (
                              <p className="text-neutral-700 dark:text-neutral-300 italic truncate" title={`Ghi chú tài xế: ${ticket.driver_note}`}>
                                "{ticket.driver_note}"
                              </p>
                            ) : ticket.ghi_chu ? (
                              <p className="text-neutral-500 truncate" title={`Ghi chú chuyến: ${ticket.ghi_chu}`}>
                                {ticket.ghi_chu}
                              </p>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1-click Approve Button */}
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => setSingleApproveTicket(ticket)}
                                className="h-7.5 px-2.5 text-xs font-medium"
                                title="Phê duyệt hoàn thành chuyến xe này"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                {t('invoice_tracking.quickApproval.approveSingle' as never) || 'Duyệt'}
                              </Button>

                              {/* Request Supplement Button */}
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setSingleSupplementTicket(ticket)}
                                className="h-7.5 px-2 text-xs"
                                title="Yêu cầu tài xế bổ sung chứng từ"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                                {t('invoice_tracking.quickApproval.requestSupplementSingle' as never) || 'Y/C bổ sung'}
                              </Button>

                              {/* View detail modal */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDetailTicket(ticket)}
                                className="h-7.5 px-2 text-xs"
                                title="Xem chi tiết đầy đủ"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.pagination.total_pages > 1 && (
                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center sm:text-left">
                    Hiển thị{' '}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.pagination.total)}
                    </span>{' '}
                    trên{' '}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {data.pagination.total}
                    </span>{' '}
                    chuyến chờ duyệt
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 px-3 min-w-[34px] text-xs"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ←
                    </Button>
                    {Array.from({ length: Math.min(5, data.pagination.total_pages) }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          className="h-8.5 px-3 min-w-[34px] text-xs"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 px-3 min-w-[34px] text-xs"
                      disabled={page === data.pagination.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals & Dialogs */}
      <TicketDetailModal
        ticket={selectedDetailTicket}
        isOpen={!!selectedDetailTicket}
        onClose={() => setSelectedDetailTicket(null)}
      />

      <ConfirmFinishDialog
        isOpen={!!singleApproveTicket}
        onClose={() => setSingleApproveTicket(null)}
        onConfirm={handleSingleApproveConfirm}
        isLoading={reviewMutation.isPending}
      />

      <SupplementNoteDialog
        isOpen={!!singleSupplementTicket}
        onClose={() => setSingleSupplementTicket(null)}
        onSubmit={handleSingleSupplementConfirm}
        isLoading={reviewMutation.isPending}
      />

      <BatchApproveConfirmDialog
        isOpen={showBatchConfirm}
        onClose={() => setShowBatchConfirm(false)}
        onConfirm={handleBatchApproveConfirm}
        selectedCount={selectedIds.size}
        isLoading={batchFinishMutation.isPending}
      />

      <DocumentViewerModal
        document={selectedViewerDoc?.doc || null}
        documents={selectedViewerDoc?.docs || []}
        onClose={() => setSelectedViewerDoc(null)}
        onNavigate={(newDoc) =>
          setSelectedViewerDoc((prev) => (prev ? { ...prev, doc: newDoc } : null))
        }
      />
    </div>
  );
}
