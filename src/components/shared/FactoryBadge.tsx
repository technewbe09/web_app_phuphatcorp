import { cn } from '@/lib/utils';

const FACTORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CLF: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  VFM: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  MCC: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  CLV: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  NDFC: { bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
};

const DEFAULT_STYLE = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

export type FactoryCode = 'CLF' | 'VFM' | 'MCC' | 'CLV' | 'NDFC';

interface FactoryBadgeProps {
  factory: string;
  className?: string;
}

export function FactoryBadge({ factory, className }: FactoryBadgeProps) {
  const style = FACTORY_STYLES[factory] ?? DEFAULT_STYLE;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      {factory}
    </span>
  );
}
