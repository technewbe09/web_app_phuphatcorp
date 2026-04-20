import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '../ui/Button';

interface ChartDataPoint {
  label: string;
  value: number;
  giaTan?: number;
  giaChuyen?: number;
  ngay?: string;
}

type ChartVariant = 'total' | 'giaTan' | 'giaChuyen';

interface Props {
  data: ChartDataPoint[];
  variant?: ChartVariant;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

function CustomTooltipTotal({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-neutral-600 dark:text-neutral-400 mb-1">Ngày: <span className="font-medium text-neutral-900 dark:text-neutral-100">{label}</span></p>
      <p className="text-neutral-600 dark:text-neutral-400">Số chuyến: <span className="font-medium text-neutral-900 dark:text-neutral-100">{payload[0].value}</span></p>
    </div>
  );
}

function CustomTooltipGiaTan({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-neutral-600 dark:text-neutral-400 mb-1">Ngày: <span className="font-medium text-neutral-900 dark:text-neutral-100">{label}</span></p>
      <p className="text-orange-600 dark:text-orange-400">Giá tấn: <span className="font-medium">{payload[0].value}</span></p>
    </div>
  );
}

function CustomTooltipGiaChuyen({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-neutral-600 dark:text-neutral-400 mb-1">Ngày: <span className="font-medium text-neutral-900 dark:text-neutral-100">{label}</span></p>
      <p className="text-purple-600 dark:text-purple-400">Giá chuyến: <span className="font-medium">{payload[0].value}</span></p>
    </div>
  );
}

export function DeliveryStatisticsChart({ data, variant = 'total', isLoading, isError, onRetry }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse bg-neutral-100 dark:bg-neutral-700 rounded-lg h-64 w-full" />
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Không tải được biểu đồ</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Không có dữ liệu trong khoảng thời gian này</p>
      </div>
    );
  }

  const variantConfig = {
    total:      { dataKey: 'value',     name: 'Số chuyến',   fill: '#525252', tooltip: CustomTooltipTotal },
    giaTan:     { dataKey: 'giaTan',    name: 'Giá tấn',     fill: '#f97316', tooltip: CustomTooltipGiaTan },
    giaChuyen:  { dataKey: 'giaChuyen', name: 'Giá chuyến',  fill: '#a855f7', tooltip: CustomTooltipGiaChuyen },
  }[variant];

  const TooltipContent = variantConfig.tooltip;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={32} />
          <Tooltip content={<TooltipContent />} />
          <Bar dataKey={variantConfig.dataKey} name={variantConfig.name} fill={variantConfig.fill} radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
