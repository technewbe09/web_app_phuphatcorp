import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reconcileJobApi,
  type CreateConfigInput,
  type UpdateConfigInput,
  type LogFilters,
} from '../api/reconcileJobApi';

const CONFIGS_KEY = ['reconcile-jobs', 'configs'];
const LOGS_KEY = 'reconcile-jobs-logs';

export function useGetConfigs() {
  return useQuery({
    queryKey: CONFIGS_KEY,
    queryFn: () => reconcileJobApi.fetchConfigs(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConfigInput) => reconcileJobApi.createConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGS_KEY });
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateConfigInput }) =>
      reconcileJobApi.updateConfig(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGS_KEY });
    },
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reconcileJobApi.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGS_KEY });
    },
  });
}

export function useToggleConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reconcileJobApi.toggleConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGS_KEY });
    },
  });
}

export function useTriggerReconcile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { config_id?: number; lookback_days?: number }) =>
      reconcileJobApi.triggerReconcile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGS_KEY });
      queryClient.invalidateQueries({ queryKey: [LOGS_KEY] });
    },
  });
}

export function useGetLogs(filters: LogFilters = {}) {
  return useQuery({
    queryKey: [LOGS_KEY, filters],
    queryFn: () => reconcileJobApi.fetchLogs(filters),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
