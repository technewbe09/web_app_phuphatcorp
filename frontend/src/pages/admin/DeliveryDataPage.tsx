import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { processDeliveryData, type ProcessResult } from '../../utils/processDeliveryData';

type PageState = 'idle' | 'processing' | 'success' | 'error';

export function DeliveryDataPage() {
  const [pageState, setPageState] = useState<PageState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
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

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;
    setPageState('processing');
    setErrorMessage('');
    try {
      const processResult = await processDeliveryData(selectedFile);
      setResult(processResult);
      setPageState('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi xử lý file. Vui lòng thử lại.';
      setErrorMessage(msg);
      setPageState('error');
    }
  }, [selectedFile]);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Xử lý Data Giao Hàng</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Upload file Excel ERP giao hàng để phân nhóm và xuất file chuẩn.
        </p>
      </div>

      {/* Upload Zone */}
      {(pageState === 'idle' || pageState === 'processing' || pageState === 'error') && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
                pageState === 'processing'
                  ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 pointer-events-none'
                  : isDragOver
                    ? 'border-neutral-800 dark:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/50'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                if (pageState !== 'processing') setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => pageState !== 'processing' && fileInputRef.current?.click()}
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

              {pageState === 'processing' ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-neutral-600 dark:text-neutral-400 animate-spin" />
                  <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">Đang xử lý...</p>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Số dòng</p>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {result.processedRows.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Số nhóm</p>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {result.groupCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 col-span-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Khoảng ngày</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {result.dateRange.from} → {result.dateRange.to}
                  </p>
                </div>
              </div>

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
    </div>
  );
}
