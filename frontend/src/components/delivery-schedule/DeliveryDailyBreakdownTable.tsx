import dayjs from 'dayjs';

interface DailyBreakdown {
  ngay: string;
  tripCount: number;
  giaTanCount: number;
  giaChuyenCount: number;
}

interface Props {
  data: DailyBreakdown[];
  isLoading: boolean;
  onViewDay?: (date: string) => void;
}

export function DeliveryDailyBreakdownTable({ data, isLoading, onViewDay }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-4 py-2">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-28" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-12" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-12" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-12" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-14 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">
        Không có dữ liệu
      </p>
    );
  }

  const visible = data.slice(0, 100);
  const remaining = data.length - 100;

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="text-left py-2 px-3 font-medium text-neutral-600 dark:text-neutral-400">Ngày</th>
            <th className="text-center py-2 px-3 font-medium text-neutral-600 dark:text-neutral-400">Tổng</th>
            <th className="text-center py-2 px-3 font-medium text-orange-500 dark:text-orange-400">Giá tấn</th>
            <th className="text-center py-2 px-3 font-medium text-purple-500 dark:text-purple-400">Giá chuyến</th>
            <th className="text-right py-2 px-3 font-medium text-neutral-600 dark:text-neutral-400">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr
              key={row.ngay}
              className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <td className="py-2 px-3 text-neutral-900 dark:text-neutral-100">
                {dayjs(row.ngay).format('DD/MM/YYYY')}
              </td>
              <td className="py-2 px-3 text-center font-semibold text-neutral-900 dark:text-neutral-100">
                {row.tripCount}
              </td>
              <td className="py-2 px-3 text-center font-semibold text-orange-600 dark:text-orange-400">
                {row.giaTanCount}
              </td>
              <td className="py-2 px-3 text-center font-semibold text-purple-600 dark:text-purple-400">
                {row.giaChuyenCount}
              </td>
              <td className="py-2 px-3 text-right">
                <button
                  type="button"
                  onClick={() => onViewDay?.(row.ngay)}
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:underline transition-colors"
                >
                  Xem
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 px-3">
          và {remaining} ngày khác...
        </p>
      )}
    </div>
  );
}
