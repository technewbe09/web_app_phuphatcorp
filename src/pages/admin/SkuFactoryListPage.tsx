import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Link } from 'react-router-dom';
import { Plus, Upload, Search, X, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSkuFactoryList } from '@/hooks/useSkuFactory';
import type { SkuListParams, SkuItem } from '@/api/masterData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FactoryBadge } from '@/components/shared/FactoryBadge';
import SkuFactoryForm from '@/components/admin/SkuFactoryForm';

const FACTORIES = ['CLF', 'VFM', 'MCC', 'CLV', 'NDFC'] as const;

export default function SkuFactoryListPage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [params, setParams] = useState<SkuListParams>({
    page: 1,
    limit: 20,
    sort_by: 'updated_at',
    sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  // Dialog state
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SkuItem | null>(null);

  const { data, isLoading, isFetching } = useSkuFactoryList(params);

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    const timer = setTimeout(() => {
      setParams(p => ({ ...p, search: value || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleFactoryToggle = useCallback((factory: string) => {
    setParams(p => {
      const current = p.factory ?? [];
      const next = current.includes(factory)
        ? current.filter(f => f !== factory)
        : [...current, factory];
      return { ...p, factory: next.length > 0 ? next : undefined, page: 1 };
    });
  }, []);

  const handleDvtChange = useCallback((dvt: string | null) => {
    setParams(p => ({ ...p, dvt: !dvt || dvt === 'all' ? undefined : dvt, page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setParams(p => ({ ...p, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setParams(p => ({ ...p, limit, page: 1 }));
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setEditingSku(null);
  }, []);

  const handleFormCancel = useCallback(() => {
    setFormOpen(false);
    setEditingSku(null);
  }, []);

  const handleEdit = useCallback((sku: SkuItem) => {
    setEditingSku(sku);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingSku(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const availableDvt = data?.filters?.available_dvt ?? [];
  const hasFilters = (params.factory && params.factory.length > 0) || params.dvt || params.search;

  const renderEmpty = () => {
    if (isLoading) return null;
    if (!data && !isFetching) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-48 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Search className="size-10" />
              <p className="text-lg font-medium">{t('masterData.skuFactoryList.empty.noData')}</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    if (items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-48 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Search className="size-10" />
              <p className="text-lg font-medium">
                {hasFilters ? t('masterData.skuFactoryList.empty.noFilteredResults') : t('masterData.skuFactoryList.empty.noResults')}
              </p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    return null;
  };

  const startItem = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('masterData.skuFactoryList.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/master-data/sku-factory/upload"
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
                'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                'px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <Upload className="size-4" />
              {t('masterData.skuFactoryList.actions.upload')}
            </Link>
            {canEdit && (
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="size-4" />
                {t('masterData.skuFactoryList.actions.add')}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('masterData.skuFactoryList.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Factory Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t('masterData.skuFactoryList.filter.factory')}:
            </span>
            <div className="flex gap-1">
              {FACTORIES.map(f => (
                <button
                  key={f}
                  onClick={() => handleFactoryToggle(f)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium border transition-colors',
                    (params.factory ?? []).includes(f)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* DVT Filter */}
          <Select
            value={params.dvt ?? 'all'}
            onValueChange={handleDvtChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('masterData.skuFactoryList.filter.allDvt')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('masterData.skuFactoryList.filter.allDvt')}</SelectItem>
              {availableDvt.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('masterData.skuFactoryList.table.maHangHoa')}</TableHead>
                <TableHead>{t('masterData.skuFactoryList.table.tenHangVn')}</TableHead>
                <TableHead>{t('masterData.skuFactoryList.table.factory')}</TableHead>
                <TableHead>{t('masterData.skuFactoryList.table.dvt')}</TableHead>
                <TableHead className="text-right">{t('masterData.skuFactoryList.table.trongLuongNet')}</TableHead>
                <TableHead className="text-right">{t('masterData.skuFactoryList.table.soGiaoDich')}</TableHead>
                <TableHead>{t('masterData.skuFactoryList.table.updatedAt')}</TableHead>
                {canEdit && <TableHead className="w-16">{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: canEdit ? 8 : 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : renderEmpty() ? renderEmpty() : items.map(sku => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono text-sm">{sku.ma_hang_hoa}</TableCell>
                  <TableCell className="max-w-64 truncate" title={sku.ten_hang_vn}>{sku.ten_hang_vn}</TableCell>
                  <TableCell><FactoryBadge factory={sku.factory} /></TableCell>
                  <TableCell>{sku.dvt ?? '—'}</TableCell>
                  <TableCell className="text-right">{sku.trong_luong_net}</TableCell>
                  <TableCell className="text-right">{sku.so_giao_dich ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sku.updated_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(sku)}
                        title={t('masterData.skuFactoryList.actions.edit')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {t('masterData.skuFactoryList.pagination.showing')} {startItem}–{endItem} {t('masterData.skuFactoryList.pagination.of')} {pagination.total} {t('masterData.skuFactoryList.pagination.items')}
              </span>
              <Select
                value={String(params.limit ?? 20)}
                onValueChange={(v) => handleLimitChange(Number(v))}
              >
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {t('masterData.skuFactoryList.pagination.perPage')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm px-3">
                {t('masterData.skuFactoryList.pagination.page')} {pagination.page} / {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {formOpen && (
        <SkuFactoryForm
          mode={formMode}
          initialData={formMode === 'edit' ? editingSku ?? undefined : undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
    </DashboardLayout>
  );
}
