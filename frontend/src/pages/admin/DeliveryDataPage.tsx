import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Eye,
  FilterX,
  Scale,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import {
  parseDeliveryFile,
  processDeliveryDataFromRows,
  type ProcessResult,
  type ParsedFileData,
  type RawRow,
  buildAdjustments,
  filterExcludedRows,
  detectZeroWeightRows,
  applyAdjustments,
  type AdjustmentRow,
  type ExcludedRowDetail,
  type ZeroWeightRowDetail,
} from '../../utils/processDeliveryData';
import { weightAdjustmentApi } from '../../api/weightAdjustmentApi';
import { customersApi, type Customer } from '../../api/customersApi';
import { innerCityCustomerApi } from '../../api/innerCityCustomerApi';
import { promoItemApi, type PromoItem } from '../../api/promoItemApi';
import {
  WeightAdjustmentConfirmDialog,
} from '../../components/delivery-data/WeightAdjustmentConfirmDialog';
import {
  DeliveryDataInspectModal,
} from '../../components/delivery-data/DeliveryDataInspectModal';

type PageState = 'idle' | 'verifying' | 'awaiting_confirmation' | 'processing' | 'success' | 'error';

export function DeliveryDataPage() {
  const [pageState, setPageState] = useState<PageState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [excludedRowCount, setExcludedRowCount] = useState<number>(0);
  const [excludedRows, setExcludedRows] = useState<ExcludedRowDetail[]>([]);
  const [zeroWeightRows, setZeroWeightRows] = useState<ZeroWeightRowDetail[]>([]);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectModalTab, setInspectModalTab] = useState<'excluded' | 'zero_weight'>('excluded');
  const [parsedFileData, setParsedFileData] = useState<ParsedFileData | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((file: File) => {
    if (file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
      setErrorMessage('');
    } else {
      alert('Chỉ chấp nhận file .xlsx');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
    },
    [handleFileChange]
  );

  const customersRef = useRef<Customer[]>([]);
  const innerCityNamesRef = useRef<Set<string>>(new Set());
  const promoItemsRef = useRef<PromoItem[]>([]);
  const rawSheetDataRef = useRef<RawRow[]>([]);
  const sourceBufferRef = useRef<ArrayBuffer | undefined>(undefined);

  const openInspectModal = useCallback((tab: 'excluded' | 'zero_weight') => {
    setInspectModalTab(tab);
    setInspectModalOpen(true);
  }, []);

  const runProcess = useCallback(async (rows: RawRow[], nums: number[]) => {
    setPageState('processing');
    try {
      const detectedZero = detectZeroWeightRows(rows, nums);
      setZeroWeightRows(detectedZero);

      const processResult = await processDeliveryDataFromRows(
        rows,
        nums,
        customersRef.current,
        innerCityNamesRef.current,
        promoItemsRef.current,
        rawSheetDataRef.current,
        sourceBufferRef.current
      );
      setResult(processResult);
      setPageState('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi xử lý file. Vui lòng thử lại.';
      setErrorMessage(msg);
      setPageState('error');
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;
    setPageState('verifying');
    setErrorMessage('');
    try {
      const parsed = await parseDeliveryFile(selectedFile);
      rawSheetDataRef.current = parsed.rawSheetData || [];
      sourceBufferRef.current = parsed.sourceBuffer;

      // BƯỚC 1.5 — Lọc dòng có Diễn giải chứa "thay thế" hoặc "điều chỉnh"
      const { filteredRows, filteredSourceRowNums, excludedCount, excludedRows: detectedExcluded } = filterExcludedRows(
        parsed.rawRows,
        parsed.sourceRowNums
      );
      setExcludedRowCount(excludedCount);
      setExcludedRows(detectedExcluded);
      const effectiveParsed = { rawRows: filteredRows, sourceRowNums: filteredSourceRowNums };

      const [masterdata, customers, innerCityCustomers, promoItemData] = await Promise.all([
        weightAdjustmentApi.fetchAll(),
        customersApi.fetchAll(),
        innerCityCustomerApi.fetchAll(),
        promoItemApi.fetchAll(),
      ]);
      customersRef.current = customers;
      innerCityNamesRef.current = new Set(
        innerCityCustomers.customers.map((c) => c.customer_name.trim().toLowerCase())
      );
      promoItemsRef.current = promoItemData.items;
      const masterMap = new Map(masterdata.map((m) => [m.ma_hang, m]));
      const found = buildAdjustments(effectiveParsed.rawRows, effectiveParsed.sourceRowNums, masterMap);

      if (found.length === 0) {
        await runProcess(effectiveParsed.rawRows, effectiveParsed.sourceRowNums);
      } else {
        setParsedFileData(effectiveParsed);
        setAdjustments(found);
        setPageState('awaiting_confirmation');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kiểm tra dữ liệu. Vui lòng thử lại.';
      setErrorMessage(msg);
      setPageState('error');
    }
  }, [selectedFile, runProcess]);

  const handleConfirmAdjustments = useCallback(async () => {
    if (!parsedFileData) return;
    const modifiedRows = applyAdjustments(parsedFileData.rawRows, adjustments);
    await runProcess(modifiedRows, parsedFileData.sourceRowNums);
  }, [parsedFileData, adjustments, runProcess]);

  const handleSkipAdjustments = useCallback(async () => {
    if (!parsedFileData) return;
    await runProcess(parsedFileData.rawRows, parsedFileData.sourceRowNums);
  }, [parsedFileData, runProcess]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const url = window.URL.createObjectURL(result.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.outputFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [result]);

  const handleReset = useCallback(() => {
    setPageState('idle');
    setSelectedFile(null);
    setResult(null);
    setErrorMessage('');
    setExcludedRowCount(0);
    setExcludedRows([]);
    setZeroWeightRows([]);
    setInspectModalOpen(false);
    setParsedFileData(null);
    setAdjustments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const isSpinnerState = pageState === 'verifying' || pageState === 'processing';
  const spinnerText = pageState === 'verifying' ? 'Đang kiểm tra dữ liệu...' : 'Đang xử lý...';

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Xử lý Data Giao Hàng</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Upload file Excel ERP giao hàng để phân nhóm và xuất file chuẩn.
        </p>
      </div>

      {/* Upload Zone */}
      {(pageState === 'idle' || isSpinnerState || pageState === 'error' || pageState === 'awaiting_confirmation') && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
                isSpinnerState || pageState === 'awaiting_confirmation'
                  ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 pointer-events-none'
                  : isDragOver
                    ? 'border-neutral-800 dark:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/50'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isSpinnerState && pageState !== 'awaiting_confirmation') setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isSpinnerState && pageState !== 'awaiting_confirmation' && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />

              {isSpinnerState ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-neutral-600 dark:text-neutral-400 animate-spin" />
                  <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">{spinnerText}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Vui lòng đợi trong giây lát</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet
                    className={cn(
                      'w-10 h-10 mx-auto mb-3',
                      isDragOver ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'
                    )}
                  />
                  <p className="text-base font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Kéo thả file Excel vào đây
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">hoặc click để chọn file</p>

                  {selectedFile ? (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg w-fit mx-auto">
                        <FileSpreadsheet className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-xs">
                          {selectedFile.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          Đổi file
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcess();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          Xử lý
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">Hỗ trợ file .xlsx</p>
                  )}
                </>
              )}
            </div>

            {pageState === 'error' && errorMessage && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Lỗi xử lý</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {pageState === 'error' && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Thử lại
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weight Adjustment Confirmation Dialog */}
      <WeightAdjustmentConfirmDialog
        isOpen={pageState === 'awaiting_confirmation'}
        adjustments={adjustments}
        onConfirm={handleConfirmAdjustments}
        onSkip={handleSkipAdjustments}
      />

      {/* Success Result */}
      {pageState === 'success' && result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Xử lý thành công</h2>
              </div>
            </CardHeader>
            <CardContent>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Số dòng xử lý</p>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {result.processedRows.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Số nhóm chuyến</p>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {result.groupCount.toLocaleString()}
                  </p>
                </div>

                {/* Excluded Rows Card */}
                <div
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    excludedRowCount > 0
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600'
                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                  )}
                  onClick={() => excludedRowCount > 0 && openInspectModal('excluded')}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-xs mb-1', excludedRowCount > 0 ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-neutral-500 dark:text-neutral-400')}>
                      Dòng bị loại
                    </p>
                    {excludedRowCount > 0 && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 hover:underline">
                        <Eye className="w-3 h-3" /> Xem
                      </span>
                    )}
                  </div>
                  <p className={cn('text-xl font-semibold', excludedRowCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-neutral-900 dark:text-neutral-100')}>
                    {excludedRowCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {excludedRowCount > 0 ? 'thay thế / điều chỉnh' : 'Không có dòng bị loại'}
                  </p>
                </div>

                {/* Zero Weight Rows Card */}
                <div
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    zeroWeightRows.length > 0
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 cursor-pointer hover:border-orange-400 dark:hover:border-orange-600'
                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                  )}
                  onClick={() => zeroWeightRows.length > 0 && openInspectModal('zero_weight')}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-xs mb-1', zeroWeightRows.length > 0 ? 'text-orange-700 dark:text-orange-400 font-medium' : 'text-neutral-500 dark:text-neutral-400')}>
                      Trọng lượng = 0
                    </p>
                    {zeroWeightRows.length > 0 && (
                      <span className="text-[11px] text-orange-600 dark:text-orange-400 flex items-center gap-0.5 hover:underline">
                        <Eye className="w-3 h-3" /> Xem
                      </span>
                    )}
                  </div>
                  <p className={cn('text-xl font-semibold', zeroWeightRows.length > 0 ? 'text-orange-800 dark:text-orange-300' : 'text-neutral-900 dark:text-neutral-100')}>
                    {zeroWeightRows.length.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {zeroWeightRows.length > 0 ? 'dòng HĐ/SP = 0 kg' : 'Đầy đủ trọng lượng'}
                  </p>
                </div>

                {/* Date Range Card */}
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 col-span-2 sm:col-span-1">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Khoảng ngày HĐ</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={`${result.dateRange.from} → ${result.dateRange.to}`}>
                    {result.dateRange.from} → {result.dateRange.to}
                  </p>
                </div>
              </div>

              {/* Data Attention Banner */}
              {(excludedRows.length > 0 || zeroWeightRows.length > 0) && (
                <div className="mb-6 p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Phát hiện dữ liệu cần lưu ý:
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {excludedRows.length > 0 && `${excludedRows.length} dòng bị loại trừ do diễn giải. `}
                        {zeroWeightRows.length > 0 && `${zeroWeightRows.length} dòng có trọng lượng bằng 0 hoặc trống.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {excludedRows.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInspectModal('excluded')}
                        className="text-xs h-8 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      >
                        <FilterX className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                        Xem dòng bị loại ({excludedRows.length})
                      </Button>
                    )}
                    {zeroWeightRows.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInspectModal('zero_weight')}
                        className="text-xs h-8 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                      >
                        <Scale className="w-3.5 h-3.5 mr-1 text-orange-600 dark:text-orange-400" />
                        Xem TL = 0 ({zeroWeightRows.length})
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{result.outputFilename}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Sẵn sàng tải xuống</p>
                  </div>
                </div>
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="w-4 h-4" />
                  Tải xuống
                </Button>
              </div>
            </CardContent>
          </Card>

          {result.warnings.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Cảnh báo</p>
                    <ul className="mt-1 space-y-0.5">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="text-sm text-neutral-600 dark:text-neutral-400">{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Xử lý file mới
            </Button>
          </div>
        </div>
      )}

      {/* Excluded and Zero Weight Inspection Modal */}
      <DeliveryDataInspectModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        initialTab={inspectModalTab}
        excludedRows={excludedRows}
        zeroWeightRows={zeroWeightRows}
      />
    </div>
  );
}
