import { cn } from '../../utils/cn';

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return `${h}:00`;
});

interface HourSelectorProps {
  selected: number[];
  onChange: (hours: number[]) => void;
  disabled?: boolean;
  error?: string;
}

export function HourSelector({ selected, onChange, disabled, error }: HourSelectorProps) {
  const toggleHour = (hour: number) => {
    if (disabled) return;
    if (selected.includes(hour)) {
      onChange(selected.filter((h) => h !== hour));
    } else {
      onChange([...selected, hour].sort((a, b) => a - b));
    }
  };

  return (
    <div>
      <div className={cn('grid grid-cols-6 gap-1.5', disabled && 'opacity-50 pointer-events-none')}>
        {HOUR_LABELS.map((label, hour) => {
          const isSelected = selected.includes(hour);
          return (
            <button
              key={hour}
              type="button"
              onClick={() => toggleHour(hour)}
              className={cn(
                'px-2 py-1.5 text-xs font-medium rounded border transition-colors',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600 dark:hover:bg-neutral-700',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {selected.length > 0 && (
        <p className="mt-1.5 text-xs text-neutral-500">
          {selected.length} giờ đã chọn:{' '}
          {selected.map((h) => `${h.toString().padStart(2, '0')}:00`).join(', ')}
        </p>
      )}
    </div>
  );
}
