import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { Button } from '../ui/Button';
import { QuickFilterButtons } from './QuickFilterButtons';
import type { ListFilters } from '../../api/deliveryScheduleApi';

type QuickFilterType = 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface Props {
  filters: ListFilters;
  onFiltersChange: (filters: ListFilters) => void;
  isLoading?: boolean;
  activeQuickFilter?: QuickFilterType;
  onQuickFilterChange?: (fromDate: string, toDate: string, type: Exclude<QuickFilterType, 'custom'>) => void;
}

export function DeliveryScheduleFilters({ filters, onFiltersChange, isLoading, activeQuickFilter = 'custom', onQuickFilterChange }: Props) {
  const [fromDate, setFromDate] = useState(
    filters.from_date ?? dayjs().subtract(30, 'day').format('YYYY-MM-DD')
  );
  const [toDate, setToDate] = useState(
    filters.to_date ?? dayjs().format('YYYY-MM-DD')
  );
  const [search, setSearch] = useState(filters.search ?? '');
  const [dateError, setDateError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent (when quick filter changes)
  useEffect(() => {
    if (filters.from_date && filters.from_date !== fromDate) setFromDate(filters.from_date);
    if (filters.to_date && filters.to_date !== toDate) setToDate(filters.to_date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from_date, filters.to_date]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: search || undefined, page: 1 });
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError('Từ ngày phải <= Đến ngày');
      return;
    }
    setDateError('');
    onFiltersChange({
      ...filters,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      search: search || undefined,
      page: 1,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleQuickFilter = (from: string, to: string, type: Exclude<QuickFilterType, 'custom'>) => {
    setFromDate(from);
    setToDate(to);
    setDateError('');
    setSearch('');
    onQuickFilterChange?.(from, to, type);
    onFiltersChange({
      ...filters,
      from_date: from,
      to_date: to,
      search: undefined,
      page: 1,
    });
  };

  return (
    <div className="space-y-3">
      {/* Quick filters */}
      <QuickFilterButtons
        activeFilter={activeQuickFilter}
        onFilterChange={handleQuickFilter}
      />

      {/* Date range + search */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Từ ngày
          </label>
          <DateInput
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setDateError(''); }}
            onKeyDown={handleKeyDown}
            className="w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Đến ngày
          </label>
          <DateInput
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setDateError(''); }}
            onKeyDown={handleKeyDown}
            className="w-40"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Tìm kiếm
          </label>
          <Input
            placeholder="Nơi giao, số xe, ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading}>
          <Search className="w-4 h-4 mr-2" />
          Tìm kiếm
        </Button>
      </div>
      {dateError && (
        <p className="text-sm text-red-500 dark:text-red-400">{dateError}</p>
      )}
    </div>
  );
}
