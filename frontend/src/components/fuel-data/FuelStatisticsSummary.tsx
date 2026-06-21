import { Gauge, Fuel, DollarSign, Route, Car } from 'lucide-react';

interface Props {
  totalDistance: number;
  totalLiters: number;
  totalCost: number;
  avgFuelRate: number | null;
  totalGpsDistance: number | null;
  avgGpsFuelRate: number | null;
  vehicleCount: number;
  recordCount: number;
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
  icon: typeof Gauge;
  label: string;
  value: string;
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
      <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">{sub}</p>
    </div>
  );
}

export function FuelStatisticsSummary({
  totalDistance,
  totalLiters,
  totalCost,
  avgFuelRate,
  totalGpsDistance,
  avgGpsFuelRate,
  vehicleCount,
  recordCount,
  isLoading,
}: Props) {
  const diffKm = totalGpsDistance != null ? totalDistance - totalGpsDistance : null;
  const diffRate = avgFuelRate != null && avgGpsFuelRate != null
    ? (Number(avgFuelRate) - Number(avgGpsFuelRate)).toFixed(2)
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={Route}
        label="Tổng km đã đi"
        value={Number(totalDistance).toLocaleString('vi-VN')}
        sub={diffKm != null ? `Chênh GPS: ${Number(diffKm).toLocaleString('vi-VN')} km` : `${vehicleCount} xe, ${recordCount} lần đổ`}
        isLoading={isLoading}
        iconColor="text-blue-500"
      />
      <MetricCard
        icon={Fuel}
        label="Tổng lít dầu"
        value={Number(totalLiters).toLocaleString('vi-VN')}
        sub={`Trung bình: ${Number(avgFuelRate)?.toFixed(2) ?? '-'} L/100km`}
        isLoading={isLoading}
        iconColor="text-orange-500"
      />
      <MetricCard
        icon={DollarSign}
        label="Tổng chi phí"
        value={Number(totalCost).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        sub="VNĐ"
        isLoading={isLoading}
        iconColor="text-green-500"
      />
      <MetricCard
        icon={Gauge}
        label="GPS L/100km"
        value={Number(avgGpsFuelRate)?.toFixed(2) ?? '-'}
        sub={diffRate != null ? `Chênh lệch: ${diffRate}` : `${recordCount} lần đổ`}
        isLoading={isLoading}
        iconColor="text-purple-500"
      />
    </div>
  );
}
