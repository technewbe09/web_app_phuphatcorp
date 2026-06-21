import { useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Search, FilterX, X } from 'lucide-react';
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
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filteredVehicles = vehicles.filter((v) => {
    if (!vehicleSearchQuery) return true;
    const q = vehicleSearchQuery.toLowerCase();
    return v.plate_number.toLowerCase().includes(q) || v.driver_name.toLowerCase().includes(q);
  });

  const selectedVehicle = vehicles.find((v) => v.id === Number(selectedVehicleId));

  const displayValue = selectedVehicle
    ? `${selectedVehicle.plate_number} - ${selectedVehicle.driver_name}`
    : (search || vehicleSearchQuery);

  const handleClearVehicle = () => {
    onVehicleChange('');
    onSearchChange('');
    setVehicleSearchQuery('');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={displayValue}
            placeholder="Tìm biển số hoặc tài xế..."
            disabled={isLoading}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            onChange={(e) => {
              const val = e.target.value;
              setVehicleSearchQuery(val);
              setDropdownOpen(true);
              if (selectedVehicleId) {
                onVehicleChange('');
                onSearchChange(val);
              } else {
                onSearchChange(val);
              }
            }}
            className="pl-9 pr-8 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 w-64 disabled:opacity-50"
          />
          {(selectedVehicleId || search) && (
            <button
              onClick={handleClearVehicle}
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {dropdownOpen && filteredVehicles.length > 0 && (
          <div className="absolute z-50 mt-1 w-80 max-h-60 overflow-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg">
            <button
              className="w-full text-left px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              onMouseDown={() => {
                handleClearVehicle();
                setDropdownOpen(false);
              }}
            >
              Tất cả xe
            </button>
            {filteredVehicles.map((v) => (
              <button
                key={v.id}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                onMouseDown={() => {
                  onVehicleChange(String(v.id));
                  onSearchChange('');
                  setVehicleSearchQuery('');
                  setDropdownOpen(false);
                }}
              >
                <span className="font-mono font-medium">{v.plate_number}</span>
                <span className="text-neutral-400"> - {v.driver_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
