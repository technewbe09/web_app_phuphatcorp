import { Calendar, Truck, Weight, Navigation } from 'lucide-react';

interface Props {
  totalDays: number;
  totalTrips: number;
  giaTanTrips: number;
  giaChuyenTrips: number;
  isLoading: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  isLoading,
  iconColor,
}: {
  icon: typeof Calendar;
  label: string;
  value: number;
  sub: string;
  isLoading: boolean;
  iconColor: string;
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/5" />
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-2/5" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-4/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        {value.toLocaleString('vi-VN')}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">{sub}</p>
    </div>
  );
}

export function DeliveryStatisticsSummary({ totalDays, totalTrips, giaTanTrips, giaChuyenTrips, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={Calendar}
        label="Số ngày có chuyến"
        value={totalDays}
        sub="ngày trong khoảng thời gian"
        isLoading={isLoading}
        iconColor="text-blue-500"
      />
      <MetricCard
        icon={Truck}
        label="Tổng số chuyến"
        value={totalTrips}
        sub="tất cả loại xe"
        isLoading={isLoading}
        iconColor="text-neutral-500"
      />
      <MetricCard
        icon={Weight}
        label="Tổng chuyến Giá tấn"
        value={giaTanTrips}
        sub="xe chạy theo giá tấn"
        isLoading={isLoading}
        iconColor="text-orange-500"
      />
      <MetricCard
        icon={Navigation}
        label="Tổng chuyến Giá chuyến"
        value={giaChuyenTrips}
        sub="xe chạy theo giá chuyến"
        isLoading={isLoading}
        iconColor="text-purple-500"
      />
    </div>
  );
}
