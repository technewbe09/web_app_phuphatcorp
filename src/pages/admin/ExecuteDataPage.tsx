import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Upload, Download, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useExecuteData } from '@/hooks/useExecuteData';
import type { ExecuteDataValidationError, OutputFileInfo, ExecuteDataResponse } from '@/api/executeData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import apiClient from '@/api/client';

type PageState = 'idle' | 'uploading' | 'success' | 'validation_error';

const FACTORY_COLORS: Record<string, { bg: string; text: string; border: string; header: string; label: string }> = {
  CLF:  { bg: 'bg-[#E6F1FB]',  text: 'text-[#1D6FA5]', border: 'border-[#1D6FA5]/20', header: 'bg-[#1D6FA5]', label: 'bg-[#1D6FA5]' },
  VFM:  { bg: 'bg-[#EEEDFE]',  text: 'text-[#534AB7]', border: 'border-[#534AB7]/20', header: 'bg-[#534AB7]', label: 'bg-[#534AB7]' },
  MCC:  { bg: 'bg-[#E1F5EE]',  text: 'text-[#0F6E56]', border: 'border-[#0F6E56]/20', header: 'bg-[#0F6E56]', label: 'bg-[#0F6E56]' },
  CLV:  { bg: 'bg-[#FBEAF0]',  text: 'text-[#993556]', border: 'border-[#993556]/20', header: 'bg-[#993556]', label: 'bg-[#993556]' },
  NDFC: { bg: 'bg-[#FAEEDA]',  text: 'text-[#854F0B]', border: 'border-[#854F0B]/20', header: 'bg-[#854F0B]', label: 'bg-[#854F0B]' },
};

function DownloadButton({ fileInfo }: { fileInfo: OutputFileInfo }) {
  const { t } = useTranslation();

  const handleDownload = useCallback(async () => {
    try {
      // Strip /api prefix since apiClient baseURL already includes it
      const url = fileInfo.download_url.replace(/^\/api/, '');
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileInfo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success(t('executeData.download.success'));
    } catch {
      toast.error(t('executeData.download.error'));
    }
  }, [fileInfo, t]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="gap-1.5"
    >
      <Download className="size-3.5" />
      {t('executeData.download.button')}
    </Button>
  );
}

export default function ExecuteDataPage() {
  const { t } = useTranslation();
  const [pageState, setPageState] = useState<PageState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ExecuteDataValidationError[]>([]);
  const [resultData, setResultData] = useState<ExecuteDataResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const executeMutation = useExecuteData();

  const handleFileChange = useCallback((file: File) => {
    if (file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
    } else {
      toast.error(t('executeData.upload.errors.invalidFile'));
    }
  }, [t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
    },
    [handleFileChange]
  );

  const handleUpload = useCallback(() => {
    if (!selectedFile) {
      toast.error(t('executeData.upload.errors.fileRequired'));
      return;
    }
    setPageState('uploading');
    executeMutation.mutate(selectedFile, {
      onSuccess: (response) => {
        if (response.data.success) {
          setResultData(response.data.data);
          setPageState('success');
        }
      },
      onError: (error: unknown) => {
        const err = error as {
          response?: {
            data?: {
              error?: {
                details?: ExecuteDataValidationError[];
                message?: string;
              };
            };
          };
        };
        if (err?.response?.data?.error?.details?.length) {
          setValidationErrors(err.response.data.error.details);
          setPageState('validation_error');
        } else {
          toast.error(
            err?.response?.data?.error?.message ||
            t('executeData.upload.errors.serverError')
          );
          setPageState('idle');
        }
      },
    });
  }, [selectedFile, executeMutation, t]);

  const handleBack = useCallback(() => {
    setPageState('idle');
    setSelectedFile(null);
    setValidationErrors([]);
    setResultData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const renderUploadZone = () => (
    <Card>
      <CardContent className="pt-6">
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/20'
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
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
          <Upload className={cn('size-10 mx-auto mb-3', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
          <p className="text-base font-medium mb-1">
            {t('executeData.upload.zone.title')}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('executeData.upload.zone.subtitle')}
          </p>
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Upload className="size-4 text-primary" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              {t('executeData.upload.zone.dragDrop')}
            </p>
          )}
          {selectedFile ? (
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
                {t('executeData.upload.zone.changeFile')}
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={pageState === 'uploading'}
              >
                {pageState === 'uploading'
                  ? t('executeData.upload.uploading')
                  : t('executeData.upload.zone.upload')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('executeData.upload.zone.browse')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderValidationErrors = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <XCircle className="size-5" />
          {t('executeData.validation.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t('executeData.validation.errorsFound', { count: validationErrors.length })}</AlertTitle>
          <AlertDescription>{t('executeData.validation.hint')}</AlertDescription>
        </Alert>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('executeData.validation.row')}</TableHead>
                <TableHead className="w-48">{t('executeData.validation.field')}</TableHead>
                <TableHead>{t('executeData.validation.message')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validationErrors.slice(0, 20).map((err, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{err.row}</TableCell>
                  <TableCell className="font-mono text-xs">{err.field}</TableCell>
                  <TableCell className="text-sm text-destructive">{err.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {validationErrors.length > 20 && (
            <div className="p-3 text-sm text-muted-foreground border-t text-center">
              {t('executeData.validation.truncated', { count: validationErrors.length - 20 })}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleBack}>
            {t('executeData.upload.tryAgain')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccess = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" />
            {t('executeData.success.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">{t('executeData.success.processedRows')}</p>
              <p className="text-xl font-semibold">{resultData?.processed_rows.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">{t('executeData.success.totalOutputRows')}</p>
              <p className="text-xl font-semibold">{resultData?.total_output_rows.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">{t('executeData.success.dateRange')}</p>
              <p className="text-sm font-medium">{resultData?.date_range.from} → {resultData?.date_range.to}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">{t('executeData.success.outputFiles')}</p>
              <p className="text-xl font-semibold">{resultData?.output_files.length ?? 0} files</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {resultData && resultData.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>{t('executeData.warnings.title')}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-0.5 text-sm">
              {resultData.warnings.map((w, i) => (
                <li key={i} className="text-muted-foreground">{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('executeData.results.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('executeData.results.factory')}</TableHead>
                  <TableHead className="text-right">{t('executeData.results.rows')}</TableHead>
                  <TableHead>{t('executeData.results.filename')}</TableHead>
                  <TableHead className="text-right">{t('executeData.results.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultData?.output_files.map((file) => {
                  const colors = FACTORY_COLORS[file.factory] ?? FACTORY_COLORS.CLF;
                  return (
                    <TableRow key={file.factory}>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-white',
                            colors.header
                          )}
                        >
                          {file.factory}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {file.rows.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {file.filename}
                      </TableCell>
                      <TableCell className="text-right">
                        <DownloadButton fileInfo={file} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={handleBack}>
              {t('executeData.upload.newFile')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold">{t('executeData.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('executeData.pageSubtitle')}</p>
        </div>

        {pageState === 'idle' && renderUploadZone()}
        {pageState === 'uploading' && renderUploadZone()}
        {pageState === 'validation_error' && renderValidationErrors()}
        {pageState === 'success' && renderSuccess()}
      </div>
    </DashboardLayout>
  );
}
