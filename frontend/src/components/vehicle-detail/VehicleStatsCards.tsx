import type { VehicleSummaryRes } from '../../api/vehicleCatalogApi';
import { cn } from '../../utils/cn';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': case 'ok':
      return 'border-green-500';
    case 'expiring': case 'due_soon':
      return 'border-yellow-500';
    case 'expired': case 'overdue':
      return 'border-red-500';
    default:
      return 'border-neutral-300 dark:border-neutral-600';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Còn hạn';
    case 'expired': return 'Hết hạn';
    case 'expiring': return 'Sắp hết hạn';
    case 'superseded': return 'Đã thay thế';
    case 'ok': return 'OK';
    case 'due_soon': return 'Sắp đến hạn';
    case 'overdue': return 'Quá hạn';
    case 'no_data': return 'Chưa có';
    case 'none': return 'Chưa có';
    case 'not_applicable': return 'Không áp dụng';
    default: return status;
  }
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('vi-VN');
}

function formatKm(km: number | null): string {
  if (km === null || km === undefined) return '-';
  return km.toLocaleString('vi-VN');
}

interface Props {
  summary: VehicleSummaryRes;
}

export function VehicleStatsCards({ summary }: Props) {
  const { inspection, insurance, oil_change, repair, fuel } = summary;

  const cards = [
    {
      label: 'Đăng kiểm',
      status: inspection.status,
      value: inspection.expiry_date ? formatDate(inspection.expiry_date) : '-',
      subtitle: inspection.count > 0 ? `${inspection.count} lần` : undefined,
    },
    {
      label: 'Bảo hiểm',
      status: insurance.status,
      value: insurance.expiry_date ? formatDate(insurance.expiry_date) : getStatusLabel(insurance.status),
      subtitle: insurance.count > 0 ? `${insurance.count} lần` : undefined,
    },
    {
      label: 'Thay nhớt',
      status: oil_change.status === 'ok' ? 'ok' : oil_change.status === 'due_soon' ? 'due_soon' : oil_change.status === 'overdue' ? 'overdue' : 'none',
      value: oil_change.km_since_change !== null ? `${formatKm(oil_change.km_since_change)} km` : getStatusLabel(oil_change.status),
      subtitle: oil_change.last_change_date ? formatDate(oil_change.last_change_date) : undefined,
    },
    {
      label: 'Sửa chữa',
      status: repair.count > 0 ? 'ok' : 'none',
      value: repair.count > 0 ? `${repair.count} lần` : 'Chưa có',
      subtitle: repair.total_amount > 0 ? `${formatCurrency(repair.total_amount)} đ` : undefined,
    },
    {
      label: 'Dữ liệu dầu',
      status: fuel.record_count > 0 ? 'ok' : 'none',
      value: fuel.avg_fuel_rate !== null ? `${fuel.avg_fuel_rate} L/100km` : 'Chưa có',
      subtitle: fuel.record_count > 0 ? `${fuel.record_count} bản ghi` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            'bg-white dark:bg-neutral-800 rounded-lg border-l-4 p-4 shadow-sm',
            getStatusColor(card.status),
          )}
        >
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {card.label}
          </div>
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {card.value}
          </div>
          {card.subtitle && (
            <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              {card.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
