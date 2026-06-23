import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, FileText, ImageIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { vehicleInspectionApi, type InspectionRecord, type InspectionImage } from '../../api/vehicleInspectionApi';
import type { VehicleInspectionSummary } from '../../api/vehicleInspectionApi';
import { Button } from '../ui/Button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/Table';
import { cn } from '../../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleInspectionSummary;
  onError: (message: string) => void;
}

function isImageFile(mimeType: string | null): boolean {
  return mimeType ? mimeType.startsWith('image/') : false;
}

export function InspectionHistoryModal({ isOpen, onClose, vehicle, onError }: Props) {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [imagesMap, setImagesMap] = useState<Record<number, InspectionImage[]>>({});
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setExpandedId(null);
      setImagesMap({});
      vehicleInspectionApi.fetchAll({ vehicle_id: vehicle.vehicle_id, status: 'all', limit: 100 })
        .then((r) => {
          setRecords(r.inspections);
        })
        .catch(() => {
          onError('Không thể tải lịch sử đăng kiểm');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, vehicle.vehicle_id, onError]);

  const toggleExpand = useCallback(async (recordId: number) => {
    if (expandedId === recordId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(recordId);
    if (!imagesMap[recordId]) {
      setLoadingImages(true);
      try {
        const r = await vehicleInspectionApi.fetchById(recordId);
        setImagesMap((prev) => ({ ...prev, [recordId]: r.images ?? [] }));
      } catch {
        setImagesMap((prev) => ({ ...prev, [recordId]: [] }));
      } finally {
        setLoadingImages(false);
      }
    }
  }, [expandedId, imagesMap]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'Còn hạn';
      case 'expired': return 'Hết hạn';
      case 'superseded': return 'Đã thay thế';
      case 'deleted': return 'Đã xóa';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'expired': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lịch sử đăng kiểm: ${vehicle.plate_number} - ${vehicle.driver_name}`} size="xl">
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-500">
            Chưa có lịch sử đăng kiểm
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-14">STT</TableHead>
                <TableHead className="w-32">Ngày đăng kiểm</TableHead>
                <TableHead className="w-32">Ngày hết hạn</TableHead>
                <TableHead className="w-28 text-center">Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-20 text-center">File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r, idx) => {
                const isExpanded = expandedId === r.id;
                const images = imagesMap[r.id] ?? [];
                const hasFiles = (r.images && r.images.length > 0) || images.length > 0;
                const totalFiles = images.length > 0 ? images.length : (r.images?.length ?? 0);

                return (
                  <TableRow key={r.id}>
                    <TableCell className="py-2">
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </TableCell>
                    <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm">
                      {new Date(r.inspection_date).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                      {new Date(r.expiry_date).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusClass(r.status))}>
                        {getStatusBadge(r.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm max-w-48 truncate">
                      {r.notes || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasFiles ? (
                        <span className="text-xs text-neutral-500">{totalFiles} file</span>
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {expandedId !== null && (
        <div className="mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
          {loadingImages ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400 py-4">
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              Đang tải file...
            </div>
          ) : (
            <>
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                File đính kèm ({imagesMap[expandedId]?.length ?? 0} file)
              </h4>
              {(imagesMap[expandedId]?.length ?? 0) === 0 ? (
                <p className="text-sm text-neutral-400 py-4">Không có file đính kèm</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {imagesMap[expandedId].map((img) => (
                    <div key={img.id} className="group">
                      {isImageFile(img.mime_type) ? (
                        <a href={`/uploads/inspection-images/${img.filename}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`/uploads/inspection-images/${img.filename}`}
                            alt={img.original_filename}
                            className="w-full aspect-square object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a
                          href={`/uploads/inspection-images/${img.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full aspect-square rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <FileText className="w-8 h-8 text-neutral-400" />
                          <span className="text-[10px] text-neutral-400">Xem</span>
                        </a>
                      )}
                      <p className="text-[10px] text-neutral-400 mt-1 truncate" title={img.original_filename}>
                        {img.original_filename.length > 12 ? img.original_filename.slice(0, 10) + '..' : img.original_filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
}
