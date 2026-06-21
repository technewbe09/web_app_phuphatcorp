import { useState } from 'react';
import { ArrowLeft, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/Table';
import { useGetFuelStatistics, useGetFuelMonths, useGetFuelMonitoring } from '../../../hooks/useFuelRecords';
import { useGetVehicles } from '../../../hooks/useVehicleCatalog';
import { FuelStatisticsSummary } from '../../../components/fuel-data/FuelStatisticsSummary';
import { cn } from '../../../utils/cn';

type Tab = 'overview' | 'monitoring';

export function FuelStatisticsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const { data: vehicleData } = useGetVehicles('', 1, 200);
  const vehicles = vehicleData?.vehicles ?? [];
  const { data: months } = useGetFuelMonths();

  const { data: stats, isLoading, isError, refetch } = useGetFuelStatistics({
    month: selectedMonth || undefined,
    vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : undefined,
  });

  const { data: monitoringData, isLoading: monitoringLoading } = useGetFuelMonitoring(10);

  const formatNum = (v: number | string | null | undefined, decimals = 1) =>
    v != null ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '-';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'monitoring', label: 'Xe cần theo dõi' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/fuel-data')}
          className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          title="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Thống kê dữ liệu dầu
        </h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ TAB: Tổng quan ============ */}
      {activeTab === 'overview' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                  options={[
                    { value: '', label: 'Tất cả tháng' },
                    ...(months ?? []).map((m) => ({ value: m, label: m })),
                  ]}
                />
                <Select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-56"
                  options={[
                    { value: '', label: 'Tất cả xe' },
                    ...vehicles.map((v) => ({
                      value: String(v.id),
                      label: `${v.plate_number} - ${v.driver_name}`,
                    })),
                  ]}
                />
                {(selectedMonth || selectedVehicleId) && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedMonth(''); setSelectedVehicleId(''); }}>
                    Xóa lọc
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm">Không thể tải thống kê.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
              </Button>
            </div>
          )}

          {stats && !isError && (
            <FuelStatisticsSummary
              totalDistance={stats.summary.total_distance}
              totalLiters={stats.summary.total_liters}
              totalCost={stats.summary.total_cost}
              avgFuelRate={stats.summary.avg_fuel_rate}
              totalGpsDistance={stats.summary.total_gps_distance}
              avgGpsFuelRate={stats.summary.avg_gps_fuel_rate}
              vehicleCount={stats.summary.vehicle_count}
              recordCount={stats.summary.record_count}
              isLoading={isLoading}
            />
          )}

          {stats && stats.byVehicle.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Theo xe</h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Biển số</TableHead>
                        <TableHead>Tài xế</TableHead>
                        <TableHead className="text-right">Km đi</TableHead>
                        <TableHead className="text-right">Lít</TableHead>
                        <TableHead className="text-right">L/100km (TT)</TableHead>
                        <TableHead className="text-right">L/100km gần nhất</TableHead>
                        <TableHead className="text-right">L/100km TB 12T</TableHead>
                        <TableHead className="text-right">L/100km (GPS)</TableHead>
                        <TableHead className="text-right">Chênh lệch</TableHead>
                        <TableHead className="text-right">Chi phí</TableHead>
                        <TableHead className="text-right">Số lần đổ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byVehicle.map((v) => {
                        const lastRate = Number(v.last_fuel_rate);
                        const avg12m = Number(v.avg_fuel_rate_12m);
                        const rateDiff = lastRate && avg12m
                          ? (((lastRate - avg12m) / avg12m) * 100).toFixed(1)
                          : null;
                        return (
                          <TableRow key={v.vehicle_id}>
                            <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                              {v.plate_number}
                            </TableCell>
                            <TableCell className="text-neutral-700 dark:text-neutral-300">
                              {v.driver_name}
                            </TableCell>
                            <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                              {Number(v.total_distance).toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                              {Number(v.total_liters).toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                              {Number(v.avg_fuel_rate)?.toFixed(2) ?? '-'}
                            </TableCell>
                            <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                              {lastRate ? lastRate.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                              {Number(v.avg_fuel_rate_12m)?.toFixed(2) ?? '-'}
                            </TableCell>
                            <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                              {Number(v.avg_gps_fuel_rate)?.toFixed(2) ?? '-'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${
                              rateDiff != null
                                ? parseFloat(rateDiff) > 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : parseFloat(rateDiff) < 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-neutral-700 dark:text-neutral-300'
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}>
                              {rateDiff != null ? `${rateDiff}%` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-neutral-900 dark:text-neutral-100">
                              {Number(v.total_cost).toLocaleString('vi-VN')} đ
                            </TableCell>
                            <TableCell className="text-right text-neutral-500 dark:text-neutral-400">
                              {v.record_count}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {stats && stats.byMonth.length > 0 && !selectedMonth && (
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Xu hướng theo tháng</h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tháng</TableHead>
                        <TableHead className="text-right">Km đi</TableHead>
                        <TableHead className="text-right">Lít</TableHead>
                        <TableHead className="text-right">L/100km</TableHead>
                        <TableHead className="text-right">Chi phí</TableHead>
                        <TableHead className="text-right">Số lần đổ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byMonth.map((m) => (
                        <TableRow key={m.month}>
                          <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                            {m.month}
                          </TableCell>
                          <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                            {Number(m.total_distance).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                            {Number(m.total_liters).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                            {Number(m.avg_fuel_rate)?.toFixed(2) ?? '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-neutral-900 dark:text-neutral-100">
                            {Number(m.total_cost).toLocaleString('vi-VN')} đ
                          </TableCell>
                          <TableCell className="text-right text-neutral-500 dark:text-neutral-400">
                            {m.record_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ============ TAB: Xe cần theo dõi ============ */}
      {activeTab === 'monitoring' && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Xe cần theo dõi
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Xe có L/100km lần đổ gần nhất chênh lệch ≥10% so với trung bình 12 tháng
              </p>
            </div>
            {monitoringLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                ))}
              </div>
            ) : !monitoringData || monitoringData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 dark:text-neutral-400">
                <Eye className="w-8 h-8 text-green-400" />
                <p className="text-sm">Không có xe nào cần theo dõi. Tất cả xe đều trong ngưỡng an toàn.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Biển số</TableHead>
                      <TableHead>Tài xế</TableHead>
                      <TableHead className="text-right">L/100km gần nhất</TableHead>
                      <TableHead className="text-right">L/100km TB 12 tháng</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                      <TableHead className="text-right">Ngày đổ gần nhất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitoringData.map((v) => (
                      <TableRow key={v.vehicle_id}>
                        <TableCell className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                          {v.plate_number}
                        </TableCell>
                        <TableCell className="text-neutral-700 dark:text-neutral-300">
                          {v.driver_name}
                        </TableCell>
                        <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                          {Number(v.last_fuel_rate)?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell className="text-right text-neutral-700 dark:text-neutral-300">
                          {Number(v.avg_fuel_rate_12m)?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                          {Number(v.diff_pct).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-sm text-neutral-500 dark:text-neutral-400">
                          {new Date(v.last_record_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
