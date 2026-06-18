import { useQuery } from '@tanstack/react-query';
import { auditLogApi } from '../api/auditLogApi';
import type { AccessLogFilters, AuditLogFilters } from '../api/auditLogApi';

export function useAccessLogs(filters: AccessLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', 'access', filters],
    queryFn: () => auditLogApi.getAccessLogs(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', 'audit', filters],
    queryFn: () => auditLogApi.getAuditLogs(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
