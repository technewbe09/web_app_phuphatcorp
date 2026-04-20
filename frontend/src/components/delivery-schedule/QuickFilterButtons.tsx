import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

type QuickFilterType = 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface Props {
  activeFilter: QuickFilterType;
  onFilterChange: (fromDate: string, toDate: string, type: Exclude<QuickFilterType, 'custom'>) => void;
}

function getQuarterRange(): { from: string; to: string } {
  const now = dayjs();
  const month = now.month(); // 0-indexed
  let startMonth: number;
  let endMonth: number;
  if (month < 3) { startMonth = 0; endMonth = 2; }
  else if (month < 6) { startMonth = 3; endMonth = 5; }
  else if (month < 9) { startMonth = 6; endMonth = 8; }
  else { startMonth = 9; endMonth = 11; }

  const from = now.month(startMonth).startOf('month').format('YYYY-MM-DD');
  const quarterEnd = now.month(endMonth).endOf('month');
  const to = now.isBefore(quarterEnd) ? now.format('YYYY-MM-DD') : quarterEnd.format('YYYY-MM-DD');
  return { from, to };
}

const FILTERS: { key: Exclude<QuickFilterType, 'custom'>; label: string; getRange: () => { from: string; to: string } }[] = [
  {
    key: 'week',
    label: 'Tuần này',
    getRange: () => ({
      from: dayjs().isoWeekday(1).format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    key: 'month',
    label: 'Tháng này',
    getRange: () => ({
      from: dayjs().startOf('month').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    key: 'quarter',
    label: 'Quý này',
    getRange: getQuarterRange,
  },
  {
    key: 'year',
    label: 'Năm nay',
    getRange: () => ({
      from: dayjs().startOf('year').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    }),
  },
];

export function QuickFilterButtons({ activeFilter, onFilterChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              const { from, to } = f.getRange();
              onFilterChange(from, to, f.key);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
              isActive
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
