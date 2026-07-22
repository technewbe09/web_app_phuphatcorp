import { ArrowLeft } from 'lucide-react';
import type { Vehicle } from '../../api/vehicleCatalogApi';

interface Props {
  vehicle: Vehicle;
  onBack: () => void;
}

export function VehicleDetailHeader({ vehicle, onBack }: Props) {
  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </button>

      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold font-mono text-neutral-900 dark:text-neutral-100">
          {vehicle.plate_number}
        </h1>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          {vehicle.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {vehicle.driver_name} - {vehicle.vehicle_type}
      </p>
    </div>
  );
}
