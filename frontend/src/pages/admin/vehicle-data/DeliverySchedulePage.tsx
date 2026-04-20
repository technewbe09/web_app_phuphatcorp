import { useState, useRef, useCallback } from 'react';
import { Upload, LayoutList, BarChart2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DeliveryScheduleTable } from '../../../components/delivery-schedule/DeliveryScheduleTable';
import { DeliveryScheduleFilters } from '../../../components/delivery-schedule/DeliveryScheduleFilters';
import { UploadDeliveryScheduleModal } from '../../../components/delivery-schedule/UploadDeliveryScheduleModal';
import { EditDeliveryScheduleModal } from '../../../components/delivery-schedule/EditDeliveryScheduleModal';
import { DeleteDeliveryScheduleModal } from '../../../components/delivery-schedule/DeleteDeliveryScheduleModal';
import { DeliveryStatisticsSummary } from '../../../components/delivery-schedule/DeliveryStatisticsSummary';
import { DeliveryStatisticsChart } from '../../../components/delivery-schedule/DeliveryStatisticsChart';
import { DeliveryDailyBreakdownTable } from '../../../components/delivery-schedule/DeliveryDailyBreakdownTable';
import { deliveryScheduleApi, type ListFilters, type DeliverySchedule } from '../../../api/deliveryScheduleApi';
import { useAuth } from '../../../hooks/useAuth';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

type QuickFilterType = 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ViewMode = 'table' | 'statistics';

const DEFAULT_FILTERS: ListFilters = {
  from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
  to_date: dayjs().format('YYYY-MM-DD'),
  page: 1,
  limit: 50,
};

export function DeliverySchedulePage() {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('transport.manage') || user?.role === 'ADMIN';

  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Table view state
  const [tableFilters, setTableFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [tableQuickFilter, setTableQuickFilter] = useState<QuickFilterType>('month');

  // Statistics view state
  const [statsFilters, setStatsFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [statsQuickFilter, setStatsQuickFilter] = useState<QuickFilterType>('month');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DeliverySchedule | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DeliverySchedule | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mainTableRef = useRef<HTMLDivElement>(null);

  // Table view query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['delivery-schedules', tableFilters],
    queryFn: () => deliveryScheduleApi.getList(tableFilters),
    enabled: viewMode === 'table',
  });

  // Statistics queries
  const statsFromDate = statsFilters.from_date ?? '';
  const statsToDate = statsFilters.to_date ?? '';
  const { data: statsData, isLoading: statsLoading, isError: statsError, refetch: statsRefetch } = useQuery({
    queryKey: ['delivery-schedules-stats', statsFromDate, statsToDate],
    queryFn: () => deliveryScheduleApi.getStatistics(statsFromDate, statsToDate),
    enabled: viewMode === 'statistics' && !!statsFromDate && !!statsToDate,
    staleTime: 5 * 60 * 1000,
  });

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  const schedules = data?.schedules ?? [];
  const meta = data?.meta;
  const isEmpty = !isLoading && !isError && schedules.length === 0;

  const handleTableFiltersChange = (newFilters: ListFilters) => {
    setTableFilters(newFilters);
  };

  const handleStatsFiltersChange = (newFilters: ListFilters) => {
    setStatsFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setTableFilters((prev) => ({ ...prev, page }));
  };

  const handleTableQuickFilterChange = useCallback(
    (_from: string, _to: string, type: Exclude<QuickFilterType, 'custom'>) => {
      setTableQuickFilter(type);
    },
    []
  );

  const handleStatsQuickFilterChange = useCallback(
    (_from: string, _to: string, type: Exclude<QuickFilterType, 'custom'>) => {
      setStatsQuickFilter(type);
    },
    []
  );

  // View a specific day from daily breakdown: switch to table view, filter to that date
  const handleViewDay = useCallback((date: string) => {
    setTableFilters((prev) => ({
      ...prev,
      from_date: date,
      to_date: date,
      page: 1,
    }));
    setTableQuickFilter('custom');
    setViewMode('table');
    setTimeout(() => {
      mainTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  // Build chart data from stats
  const chartData = (statsData?.dailyBreakdown ?? []).map((d) => ({
    label: dayjs(d.ngay).format('DD/MM'),
    value: d.tripCount,
    giaTan: d.giaTanCount,
    giaChuyen: d.giaChuyenCount,
    ngay: dayjs(d.ngay).format('DD/MM/YYYY'),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs pointer-events-auto transition-all ${
              t.variant === 'success'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Lịch đi hàng
        </h1>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Bảng
            </button>
            <button
              type="button"
              onClick={() => setViewMode('statistics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'statistics'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Thống kê
            </button>
          </div>

          {canManage && (
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Excel
            </Button>
          )}
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <>
          {/* Table Filters */}
          <Card>
            <CardContent className="p-4">
              <DeliveryScheduleFilters
                filters={tableFilters}
                onFiltersChange={handleTableFiltersChange}
                isLoading={isLoading}
                activeQuickFilter={tableQuickFilter}
                onQuickFilterChange={handleTableQuickFilterChange}
              />
            </CardContent>
          </Card>

          {/* Main table */}
          <div ref={mainTableRef}>
            <Card>
              <CardContent className="p-0">
                <DeliveryScheduleTable
                  data={schedules}
                  isLoading={isLoading}
                  isEmpty={isEmpty}
                  isError={isError}
                  canManage={canManage}
                  onUpload={() => setIsUploadModalOpen(true)}
                  onRetry={() => refetch()}
                  onEdit={canManage ? (r) => setEditRecord(r) : undefined}
                  onDelete={canManage ? (r) => setDeleteRecord(r) : undefined}
                />
              </CardContent>
            </Card>
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
              <p>
                Hiển thị {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} trong {meta.total} bản ghi
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                >
                  ‹ Trước
                </Button>
                <span className="px-3 py-1.5 text-sm">
                  Trang {meta.page} / {meta.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.total_pages}
                  onClick={() => handlePageChange(meta.page + 1)}
                >
                  Sau ›
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* STATISTICS VIEW */}
      {viewMode === 'statistics' && (
        <>
          {/* Statistics Filters */}
          <Card>
            <CardContent className="p-4">
              <DeliveryScheduleFilters
                filters={statsFilters}
                onFiltersChange={handleStatsFiltersChange}
                isLoading={statsLoading}
                activeQuickFilter={statsQuickFilter}
                onQuickFilterChange={handleStatsQuickFilterChange}
              />
            </CardContent>
          </Card>

          {/* Metric cards */}
          <DeliveryStatisticsSummary
            totalDays={statsData?.summary.totalDays ?? 0}
            totalTrips={statsData?.summary.totalTrips ?? 0}
            giaTanTrips={statsData?.summary.giaTanTrips ?? 0}
            giaChuyenTrips={statsData?.summary.giaChuyenTrips ?? 0}
            isLoading={statsLoading}
          />

          {/* Chart — tổng chuyến */}
          <Card>
            <CardHeader className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Biểu đồ tổng số chuyến theo ngày
              </h2>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <DeliveryStatisticsChart
                data={chartData}
                variant="total"
                isLoading={statsLoading}
                isError={statsError}
                onRetry={() => statsRefetch()}
              />
            </CardContent>
          </Card>

          {/* Chart — Giá tấn */}
          <Card>
            <CardHeader className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                Biểu đồ số chuyến Giá tấn theo ngày
              </h2>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <DeliveryStatisticsChart
                data={chartData}
                variant="giaTan"
                isLoading={statsLoading}
                isError={statsError}
                onRetry={() => statsRefetch()}
              />
            </CardContent>
          </Card>

          {/* Chart — Giá chuyến */}
          <Card>
            <CardHeader className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                Biểu đồ số chuyến Giá chuyến theo ngày
              </h2>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <DeliveryStatisticsChart
                data={chartData}
                variant="giaChuyen"
                isLoading={statsLoading}
                isError={statsError}
                onRetry={() => statsRefetch()}
              />
            </CardContent>
          </Card>

          {/* Daily breakdown table */}
          <Card>
            <CardHeader className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Chi tiết theo ngày
              </h2>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <DeliveryDailyBreakdownTable
                data={statsData?.dailyBreakdown ?? []}
                isLoading={statsLoading}
                onViewDay={handleViewDay}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Upload modal */}
      <UploadDeliveryScheduleModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Edit modal */}
      <EditDeliveryScheduleModal
        isOpen={!!editRecord}
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Delete modal */}
      <DeleteDeliveryScheduleModal
        isOpen={!!deleteRecord}
        record={deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onSuccess={(msg) => showToast(msg)}
        onError={(msg) => showToast(msg, 'error')}
      />
    </div>
  );
}
