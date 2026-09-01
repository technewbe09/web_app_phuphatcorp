import { Badge } from '../ui/Badge';
import { useI18n } from '../../i18n/useI18n';

interface InvoiceStatusBadgeProps {
  status: 'created' | 'pending_review' | 'completed' | 'request_supplement';
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const { t } = useI18n();

  const variantMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    created: 'default',
    pending_review: 'warning',
    completed: 'success',
    request_supplement: 'danger',
  };

  return <Badge variant={variantMap[status]}>{t(`invoice_tracking.status.${status}`)}</Badge>;
}
