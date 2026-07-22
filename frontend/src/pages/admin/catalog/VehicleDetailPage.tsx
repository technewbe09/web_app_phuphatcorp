import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useGetVehicleSummary } from '../../../hooks/useVehicleCatalog';
import { VehicleDetailHeader } from '../../../components/vehicle-detail/VehicleDetailHeader';
import { VehicleStatsCards } from '../../../components/vehicle-detail/VehicleStatsCards';
import { VehicleTabBar, type VehicleTab } from '../../../components/vehicle-detail/VehicleTabBar';
import { InspectionTab } from '../../../components/vehicle-detail/InspectionTab';
import { InsuranceTab } from '../../../components/vehicle-detail/InsuranceTab';
import { OilChangeTab } from '../../../components/vehicle-detail/OilChangeTab';
import { RepairTab } from '../../../components/vehicle-detail/RepairTab';
import { FuelTab } from '../../../components/vehicle-detail/FuelTab';
import { cn } from '../../../utils/cn';

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicleId = parseInt(id ?? '0', 10);

  const [activeTab, setActiveTab] = useState<VehicleTab>('inspection');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { data: summaryData, isLoading, isError, refetch } = useGetVehicleSummary(vehicleId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="h-5 w-20 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-8 w-48 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-5 w-64 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-28 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !summaryData) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/catalog/vehicles')}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors mb-6"
        >
          <AlertTriangle className="w-4 h-4" />
          Quay lại
        </button>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-sm">Không tìm thấy xe hoặc không thể tải dữ liệu.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const { vehicle } = summaryData;

  return (
    <div className="p-6 space-y-6">
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs pointer-events-auto transition-all',
              toast.variant === 'success'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-red-600 text-white',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <VehicleDetailHeader
        vehicle={vehicle}
        onBack={() => navigate('/catalog/vehicles')}
      />

      <VehicleStatsCards summary={summaryData} />

      <VehicleTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'inspection' && (
        <InspectionTab vehicleId={vehicleId} setToasts={setToasts} />
      )}
      {activeTab === 'insurance' && (
        <InsuranceTab vehicleId={vehicleId} vehicleType={vehicle.vehicle_type} setToasts={setToasts} />
      )}
      {activeTab === 'oil_change' && (
        <OilChangeTab vehicleId={vehicleId} setToasts={setToasts} />
      )}
      {activeTab === 'repair' && (
        <RepairTab vehicleId={vehicleId} setToasts={setToasts} />
      )}
      {activeTab === 'fuel' && (
        <FuelTab vehicleId={vehicleId} vehicle={vehicle} setToasts={setToasts} />
      )}
    </div>
  );
}
