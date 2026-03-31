import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useSkuFactoryUpload, useSkuFactoryConfirm } from '@/hooks/useSkuFactory';
import type { SkuValidationError, UploadResponse, ConfirmResponse } from '@/api/masterData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FactoryBadge } from '@/components/shared/FactoryBadge';

type PageState =
  | 'idle'
  | 'file_selected'
  | 'uploading'
  | 'validation_error'
  | 'pending_confirm'
  | 'confirming'
  | 'success';

const FACTORIES = ['CLF', 'VFM', 'MCC', 'CLV', 'NDFC'] as const;

function SkuDiffCell({
  current,
  next,
}: {
  current: string | number | undefined;
  next: string | number | undefined;
}) {
  const changed = current !== next;
  return (
    <div className="flex flex-col gap-0.5">
      {current !== undefined && (
        <span className={cn('text-xs', changed ? 'text-muted-foreground' : 'text-success')}>
          {current}
        </span>
      )}
      {changed && next !== undefined && (
        <span className="text-xs text-warning font-medium">→ {next}</span>
      )}
    </div>
  );
}

export default function SkuFactoryUploadPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pageState, setPageState] = useState<PageState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<SkuValidationError[]>([]);
  const [previewData, setPreviewData] = useState<UploadResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [newSkusAction, setNewSkusAction] = useState<'insert' | 'skip'>('insert');
  const [existingSkusAction, setExistingSkusAction] = useState<'update' | 'skip'>('update');

  const uploadMutation = useSkuFactoryUpload();
  const confirmMutation = useSkuFactoryConfirm();

  const handleFileChange = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast.error(t('masterData.skuFactoryUpload.errors.invalidFile'));
      return;
    }
    setSelectedFile(file);
    setPageState('file_selected');
    setValidationErrors([]);
    setPreviewData(null);
    setConfirmResult(null);
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) {
      toast.error(t('masterData.skuFactoryUpload.errors.fileRequired'));
      return;
    }
    setPageState('uploading');
    uploadMutation.mutate(selectedFile, {
      onSuccess: (response) => {
        if (response.data.success) {
          setPreviewData(response.data.data);
          setPageState('pending_confirm');
        }
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { error?: { details?: SkuValidationError[]; message?: string } } } };
        if (err?.response?.data?.error?.details) {
          setValidationErrors(err.response.data.error.details);
          setPageState('validation_error');
        } else {
          const serverMsg = err?.response?.data?.error?.message;
          toast.error(serverMsg || t('masterData.skuFactoryUpload.errors.serverError'));
          setPageState('idle');
        }
      },
    });
  }, [selectedFile, uploadMutation, t]);

  const handleBack = useCallback(() => {
    setPageState('idle');
    setSelectedFile(null);
    setValidationErrors([]);
    setPreviewData(null);
    setConfirmResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleConfirm = useCallback(() => {
    if (!previewData) return;

    const isAllSkip = newSkusAction === 'skip' && existingSkusAction === 'skip';
    if (isAllSkip) {
      toast.error(t('masterData.skuFactoryUpload.errors.noAction'));
      return;
    }

    setPageState('confirming');
    confirmMutation.mutate(
      {
        session_token: previewData.session_token,
        new_skus_action: newSkusAction,
        existing_skus_action: existingSkusAction,
      },
      {
        onSuccess: (response) => {
          if (response.data.success) {
            setConfirmResult(response.data.data);
            setPageState('success');
          }
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { error?: { code?: string; message?: string } } } };
          const errorCode = err?.response?.data?.error?.code;
          const errorMsg = err?.response?.data?.error?.message;
          if (errorCode === 'SESSION_EXPIRED') {
            toast.error(t('masterData.skuFactoryUpload.errors.sessionExpired'));
            setPageState('idle');
            setPreviewData(null);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          } else if (errorCode === 'NO_ACTION') {
            toast.error(errorMsg || t('masterData.skuFactoryUpload.errors.noAction'));
            setPageState('pending_confirm');
          } else {
            toast.error(errorMsg || t('masterData.skuFactoryUpload.errors.serverError'));
            setPageState('pending_confirm');
          }
        },
      }
    );
  }, [previewData, newSkusAction, existingSkusAction, confirmMutation, t]);

  const renderUploadZone = () => (
    <Card>
      <CardContent className="pt-6">
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
          <Upload className="mx-auto size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">
            {t('masterData.skuFactoryUpload.uploadZone.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('masterData.skuFactoryUpload.uploadZone.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('masterData.skuFactoryUpload.uploadZone.dragDrop')}
            <span className="mx-1">{t('masterData.skuFactoryUpload.uploadZone.browse')}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderFileSelected = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
          <FileText className="size-10 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile?.name}</p>
            <p className="text-sm text-muted-foreground">
              {t('masterData.skuFactoryUpload.uploadZone.selectedFile')}: {selectedFile?.size && (selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
          >
            {t('masterData.skuFactoryUpload.uploadZone.changeFile')}
          </Button>
        </div>
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
        <div className="flex gap-3 mt-4">
          <Button onClick={handleUpload} className="flex-1 gap-2">
            <Upload className="size-4" />
            {t('masterData.skuFactoryUpload.uploadZone.upload')}
          </Button>
          <Button variant="outline" onClick={handleBack}>
            {t('common.back')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderUploading = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <RefreshCw className="size-10 text-primary animate-spin" />
          <p className="text-lg font-medium">{t('masterData.skuFactoryUpload.uploadZone.upload')}</p>
          <Progress value={66} className="w-full max-w-sm" />
        </div>
      </CardContent>
    </Card>
  );

  const renderValidationError = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          {t('masterData.skuFactoryUpload.validation.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {t('masterData.skuFactoryUpload.validation.errorsFound', {
              count: validationErrors.length,
            })}
          </AlertDescription>
        </Alert>
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('masterData.skuFactoryUpload.validation.row')}</TableHead>
                <TableHead>{t('masterData.skuFactoryUpload.validation.column')}</TableHead>
                <TableHead>{t('masterData.skuFactoryUpload.validation.value')}</TableHead>
                <TableHead>{t('masterData.skuFactoryUpload.validation.message')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validationErrors.map((err, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-sm">{err.row}</TableCell>
                  <TableCell className="font-mono text-sm">{err.column}</TableCell>
                  <TableCell className="font-mono text-xs max-w-32 truncate">{err.value}</TableCell>
                  <TableCell className="text-sm">{err.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button variant="outline" onClick={handleBack} className="mt-4 gap-2">
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderPreview = () => {
    if (!previewData) return null;
    const { summary, new_skus, existing_skus } = previewData;
    const isAllSkip = newSkusAction === 'skip' && existingSkusAction === 'skip';

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t('masterData.skuFactoryUpload.preview.total')}</p>
              <p className="text-3xl font-bold mt-1">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t('masterData.skuFactoryUpload.preview.new')}</p>
              <p className="text-3xl font-bold mt-1 text-primary">{summary.new}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t('masterData.skuFactoryUpload.preview.existing')}</p>
              <p className="text-3xl font-bold mt-1 text-info">{summary.existing}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('masterData.skuFactoryUpload.preview.newSkus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={newSkusAction}
                onValueChange={(v) => setNewSkusAction(v as 'insert' | 'skip')}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="insert" id="action-insert" />
                  <label htmlFor="action-insert" className="text-sm font-medium cursor-pointer">
                    {t('masterData.skuFactoryUpload.actions.insert')}
                  </label>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <RadioGroupItem value="skip" id="action-skip-new" />
                  <label htmlFor="action-skip-new" className="text-sm font-medium cursor-pointer">
                    {t('masterData.skuFactoryUpload.actions.skip')}
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('masterData.skuFactoryUpload.preview.existingSkus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={existingSkusAction}
                onValueChange={(v) => setExistingSkusAction(v as 'update' | 'skip')}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="update" id="action-update" />
                  <label htmlFor="action-update" className="text-sm font-medium cursor-pointer">
                    {t('masterData.skuFactoryUpload.actions.update')}
                  </label>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <RadioGroupItem value="skip" id="action-skip-existing" />
                  <label htmlFor="action-skip-existing" className="text-sm font-medium cursor-pointer">
                    {t('masterData.skuFactoryUpload.actions.skip')}
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('masterData.skuFactoryUpload.preview.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('masterData.skuFactoryUpload.sessionExpiry')}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="new" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="new">
                  {t('masterData.skuFactoryUpload.preview.new')}
                  {summary.new > 0 && (
                    <Badge variant="secondary" className="ml-2">{summary.new}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="existing">
                  {t('masterData.skuFactoryUpload.preview.existing')}
                  {summary.existing > 0 && (
                    <Badge variant="secondary" className="ml-2">{summary.existing}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new">
                {new_skus.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {t('masterData.skuFactoryUpload.noData.newSkus')}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('masterData.skuFactoryUpload.table.maHangHoa')}</TableHead>
                          <TableHead>{t('masterData.skuFactoryUpload.table.tenHangVN')}</TableHead>
                          <TableHead>{t('masterData.skuFactoryUpload.table.factory')}</TableHead>
                          <TableHead>{t('masterData.skuFactoryUpload.table.dvt')}</TableHead>
                          <TableHead className="text-right">{t('masterData.skuFactoryUpload.table.trongLuong')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {new_skus.map((sku) => (
                          <TableRow key={sku.ma_hang_hoa}>
                            <TableCell className="font-mono text-sm">{sku.ma_hang_hoa}</TableCell>
                            <TableCell className="max-w-64 truncate">{sku.ten_hang_vn}</TableCell>
                            <TableCell><FactoryBadge factory={sku.factory} /></TableCell>
                            <TableCell>{sku.dvt || '—'}</TableCell>
                            <TableCell className="text-right">{sku.trong_luong_net}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="existing">
                {existing_skus.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {t('masterData.skuFactoryUpload.noData.existingSkus')}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('masterData.skuFactoryUpload.table.maHangHoa')}</TableHead>
                          <TableHead>{t('masterData.skuFactoryUpload.table.tenHangVN')}</TableHead>
                          <TableHead>{t('masterData.skuFactoryUpload.table.factory')}</TableHead>
                          <TableHead>{t('masterData.skuFactoryUpload.table.dvt')}</TableHead>
                          <TableHead className="text-right">
                            {t('masterData.skuFactoryUpload.table.trongLuong')} ({t('masterData.skuFactoryUpload.table.current')} / {t('masterData.skuFactoryUpload.table.new')})
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {existing_skus.map((sku) => (
                          <TableRow key={sku.ma_hang_hoa}>
                            <TableCell className="font-mono text-sm">{sku.ma_hang_hoa}</TableCell>
                            <TableCell className="max-w-48 truncate">{sku.ten_hang_vn}</TableCell>
                            <TableCell>
                              <SkuDiffCell
                                current={sku.current_in_db.factory}
                                next={sku.new_value.factory}
                              />
                            </TableCell>
                            <TableCell>
                              <SkuDiffCell
                                current={sku.current_in_db.dvt}
                                next={sku.new_value.dvt}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <SkuDiffCell
                                current={sku.current_in_db.trong_luong_net}
                                next={sku.new_value.trong_luong_net}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isAllSkip || confirmMutation.isPending}
            className="gap-2"
          >
            {confirmMutation.isPending ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                {t('masterData.skuFactoryUpload.actions.confirming')}
              </>
            ) : (
              t('masterData.skuFactoryUpload.actions.confirm')
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderConfirming = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <RefreshCw className="size-10 text-primary animate-spin" />
          <p className="text-lg font-medium">{t('masterData.skuFactoryUpload.actions.confirming')}</p>
          <Progress value={66} className="w-full max-w-sm" />
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccess = () => {
    if (!confirmResult) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            {t('masterData.skuFactoryUpload.result.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {confirmResult.inserted > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-2xl font-bold text-primary">{confirmResult.inserted}</p>
                <p className="text-sm text-primary/80 mt-1">
                  {t('masterData.skuFactoryUpload.result.inserted')}
                </p>
              </div>
            )}
            {confirmResult.updated > 0 && (
              <div className="p-4 rounded-lg bg-info/5 border border-info/20 text-center">
                <p className="text-2xl font-bold text-info">{confirmResult.updated}</p>
                <p className="text-sm text-info/80 mt-1">
                  {t('masterData.skuFactoryUpload.result.updated')}
                </p>
              </div>
            )}
            {confirmResult.skipped_new > 0 && (
              <div className="p-4 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-muted-foreground">{confirmResult.skipped_new}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('masterData.skuFactoryUpload.result.newSkus')} - {t('masterData.skuFactoryUpload.result.skipped')}
                </p>
              </div>
            )}
            {confirmResult.skipped_existing > 0 && (
              <div className="p-4 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-muted-foreground">{confirmResult.skipped_existing}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('masterData.skuFactoryUpload.result.existingSkus')} - {t('masterData.skuFactoryUpload.result.skipped')}
                </p>
              </div>
            )}
          </div>

          {Object.keys(confirmResult.by_factory).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">
                {t('masterData.skuFactoryUpload.result.byFactory')}
              </p>
              <div className="flex flex-wrap gap-2">
                {FACTORIES.map((f) => {
                  const count = confirmResult.by_factory[f] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={f}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                    >
                      <FactoryBadge factory={f} />
                      <span className="font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <Upload className="size-4" />
              {t('masterData.skuFactoryUpload.uploadZone.title')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {t('masterData.skuFactoryUpload.pageTitle')}
          </h1>
        </div>

        {pageState === 'idle' && renderUploadZone()}
        {pageState === 'file_selected' && renderFileSelected()}
        {pageState === 'uploading' && renderUploading()}
        {pageState === 'validation_error' && renderValidationError()}
        {pageState === 'pending_confirm' && renderPreview()}
        {pageState === 'confirming' && renderConfirming()}
        {pageState === 'success' && renderSuccess()}
      </div>
    </DashboardLayout>
  );
}
