import { useState, useMemo } from 'react';
import { FilterX, Scale, Search, X, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { ExcludedRowDetail, ZeroWeightRowDetail } from '../../utils/processDeliveryData';

interface DeliveryDataInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'excluded' | 'zero_weight';
  excludedRows: ExcludedRowDetail[];
  zeroWeightRows: ZeroWeightRowDetail[];
}

export function DeliveryDataInspectModal({
  isOpen,
  onClose,
  initialTab = 'excluded',
  excludedRows,
  zeroWeightRows,
}: DeliveryDataInspectModalProps) {
  const [activeTab, setActiveTab] = useState<'excluded' | 'zero_weight'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize active tab when modal is opened with initialTab
  const handleOpenTab = (tab: 'excluded' | 'zero_weight') => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  const filteredExcluded = useMemo(() => {
    if (!searchTerm.trim()) return excludedRows;
    const term = searchTerm.toLowerCase();
    return excludedRows.filter(
      (item) =>
        String(item.sourceRowNum).includes(term) ||
        item.soHD.toLowerCase().includes(term) ||
        item.soTauXe.toLowerCase().includes(term) ||
        item.tenKH.toLowerCase().includes(term) ||
        item.maHang.toLowerCase().includes(term) ||
        item.tenHang.toLowerCase().includes(term) ||
        item.dienGiai.toLowerCase().includes(term)
    );
  }, [excludedRows, searchTerm]);

  const filteredZeroWeight = useMemo(() => {
    if (!searchTerm.trim()) return zeroWeightRows;
    const term = searchTerm.toLowerCase();
    return zeroWeightRows.filter(
      (item) =>
        String(item.sourceRowNum).includes(term) ||
        item.soHD.toLowerCase().includes(term) ||
        item.soTauXe.toLowerCase().includes(term) ||
        item.tenKH.toLowerCase().includes(term) ||
        item.maHang.toLowerCase().includes(term) ||
        item.tenHang.toLowerCase().includes(term) ||
        item.reason.toLowerCase().includes(term)
    );
  }, [zeroWeightRows, searchTerm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Chi tiết dữ liệu cần lưu ý
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Xem danh sách các dòng bị loại trừ hoặc có trọng lượng bằng 0
          </p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenTab('excluded')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'excluded'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            <FilterX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Dòng bị loại trừ</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold',
                activeTab === 'excluded'
                  ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              )}
            >
              {excludedRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenTab('zero_weight')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'zero_weight'
                ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            <Scale className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span>Trọng lượng = 0</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold',
                activeTab === 'zero_weight'
                  ? 'bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              )}
            >
              {zeroWeightRows.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo HĐ, xe, KH, hàng..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-neutral-900 dark:text-neutral-100"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Table */}
      <div className="overflow-auto max-h-[60vh] rounded-lg border border-neutral-200 dark:border-neutral-700">
        {activeTab === 'excluded' ? (
          filteredExcluded.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {excludedRows.length === 0
                ? 'Không có dòng nào bị loại trừ.'
                : 'Không tìm thấy dòng phù hợp với từ khóa tìm kiếm.'}
            </div>
          ) : (
            <table className="w-full text-xs min-w-[850px] border-collapse">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-3 py-2.5 text-center w-14">Dòng</th>
                  <th className="px-3 py-2.5 text-left w-24">Số HĐ</th>
                  <th className="px-3 py-2.5 text-left w-24">Số xe</th>
                  <th className="px-3 py-2.5 text-left w-44">Tên khách hàng</th>
                  <th className="px-3 py-2.5 text-left w-24">Mã hàng</th>
                  <th className="px-3 py-2.5 text-left w-48">Tên hàng hóa</th>
                  <th className="px-3 py-2.5 text-left">Diễn giải (ERP)</th>
                  <th className="px-3 py-2.5 text-center w-36">Lý do loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredExcluded.map((item, idx) => (
                  <tr
                    key={`excluded-${idx}`}
                    className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 bg-white dark:bg-neutral-900 transition-colors"
                  >
                    <td className="px-3 py-2 text-center font-mono font-medium text-neutral-600 dark:text-neutral-400">
                      {item.sourceRowNum}
                    </td>
                    <td className="px-3 py-2 font-mono text-neutral-900 dark:text-neutral-100">
                      {item.soHD || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-neutral-900 dark:text-neutral-100">
                      {item.soTauXe || '—'}
                    </td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 truncate max-w-[176px]" title={item.tenKH}>
                      {item.tenKH || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300">
                      {item.maHang || '—'}
                    </td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 truncate max-w-[192px]" title={item.tenHang}>
                      {item.tenHang || '—'}
                    </td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 truncate max-w-[220px]" title={item.dienGiai}>
                      <span className="bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded">
                        {item.dienGiai || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        {item.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filteredZeroWeight.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {zeroWeightRows.length === 0
              ? 'Không có dòng nào có trọng lượng bằng 0.'
              : 'Không tìm thấy dòng phù hợp với từ khóa tìm kiếm.'}
          </div>
        ) : (
          <table className="w-full text-xs min-w-[850px] border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700">
                <th className="px-3 py-2.5 text-center w-14">Dòng</th>
                <th className="px-3 py-2.5 text-left w-24">Số HĐ</th>
                <th className="px-3 py-2.5 text-left w-24">Số xe</th>
                <th className="px-3 py-2.5 text-left w-44">Tên khách hàng</th>
                <th className="px-3 py-2.5 text-left w-24">Mã hàng</th>
                <th className="px-3 py-2.5 text-left w-48">Tên hàng hóa</th>
                <th className="px-3 py-2.5 text-right w-20">Số lượng</th>
                <th className="px-3 py-2.5 text-right w-24">SP Trọng lượng</th>
                <th className="px-3 py-2.5 text-right w-24">HĐ Trọng lượng</th>
                <th className="px-3 py-2.5 text-center w-36">Đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredZeroWeight.map((item, idx) => (
                <tr
                  key={`zero-${idx}`}
                  className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 bg-white dark:bg-neutral-900 transition-colors"
                >
                  <td className="px-3 py-2 text-center font-mono font-medium text-neutral-600 dark:text-neutral-400">
                    {item.sourceRowNum}
                  </td>
                  <td className="px-3 py-2 font-mono text-neutral-900 dark:text-neutral-100">
                    {item.soHD || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-neutral-900 dark:text-neutral-100">
                    {item.soTauXe || '—'}
                  </td>
                  <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 truncate max-w-[176px]" title={item.tenKH}>
                    {item.tenKH || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300">
                    {item.maHang || '—'}
                  </td>
                  <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 truncate max-w-[192px]" title={item.tenHang}>
                    {item.tenHang || '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-neutral-800 dark:text-neutral-200">
                    {item.soLuong !== null ? item.soLuong.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-neutral-800 dark:text-neutral-200">
                    {item.spTrongLuong !== null ? (
                      item.spTrongLuong === 0 ? (
                        <span className="text-red-600 font-semibold">0</span>
                      ) : (
                        item.spTrongLuong.toFixed(3)
                      )
                    ) : (
                      <span className="text-neutral-400 italic">Trống</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-neutral-800 dark:text-neutral-200">
                    {item.hdTrongLuong !== null ? (
                      item.hdTrongLuong === 0 ? (
                        <span className="text-red-600 font-semibold">0</span>
                      ) : (
                        item.hdTrongLuong.toFixed(3)
                      )
                    ) : (
                      <span className="text-neutral-400 italic">Trống</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      {item.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Hiển thị{' '}
          <strong>
            {activeTab === 'excluded' ? filteredExcluded.length : filteredZeroWeight.length}
          </strong>{' '}
          / {activeTab === 'excluded' ? excludedRows.length : zeroWeightRows.length} dòng
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}
