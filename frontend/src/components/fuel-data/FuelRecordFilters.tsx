import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Search, FilterX } from 'lucide-react';
import type { Vehicle } from '../../api/vehicleCatalogApi';

interface Props {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  selectedMonth: string;
  search: string;
  months: string[];
  onVehicleChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  isLoading: boolean;
}

export function FuelRecordFilters({
  vehicles,
  selectedVehicleId,
  selectedMonth,
  search,
  months,
  onVehicleChange,
  onMonthChange,
  onSearchChange,
  onClear,
  isLoading,
}: Props) {
  const hasFilters = selectedVehicleId || selectedMonth || search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Tìm biển số xe..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 w-48"
          disabled={isLoading}
        />
      </div>

      <Select
        value={selectedVehicleId}
        onChange={(e) => onVehicleChange(e.target.value)}
        disabled={isLoading}
        className="w-56"
        options={[
          { value: '', label: 'Tất cả xe' },
          ...vehicles.map((v) => ({
            value: String(v.id),
            label: `${v.plate_number} - ${v.driver_name}`,
          })),
        ]}
      />

      <Select
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        disabled={isLoading}
        className="w-40"
        options={[
          { value: '', label: 'Tất cả tháng' },
          ...months.map((m) => ({ value: m, label: m })),
        ]}
      />

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear} disabled={isLoading}>
          <FilterX className="w-4 h-4 mr-1" />
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
