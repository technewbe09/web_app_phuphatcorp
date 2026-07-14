import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type PriceTierInput,
  routePricingApi,
} from '../api/routePricingApi';

export function useProvinces() {
  return useQuery({
    queryKey: ['route-pricing', 'provinces'],
    queryFn: () => routePricingApi.listProvinces(),
  });
}

export function useWards(provinceCode?: string) {
  return useQuery({
    queryKey: ['route-pricing', 'wards', provinceCode],
    queryFn: () => routePricingApi.listWards(provinceCode!),
    enabled: Boolean(provinceCode),
  });
}

export function useRoutes(supplierId?: number, search?: string) {
  return useQuery({
    queryKey: ['route-pricing', 'routes', supplierId, search],
    queryFn: () => routePricingApi.listRoutes({ supplier_id: supplierId!, search }),
    enabled: Boolean(supplierId),
  });
}

export function useGroups(supplierId?: number) {
  return useQuery({
    queryKey: ['route-pricing', 'groups', supplierId],
    queryFn: () => routePricingApi.listGroups({ supplier_id: supplierId! }),
    enabled: Boolean(supplierId),
  });
}

export function usePrices(supplierId?: number, routeGroupId?: number) {
  return useQuery({
    queryKey: ['route-pricing', 'prices', supplierId, routeGroupId],
    queryFn: () =>
      routePricingApi.listPrices({
        supplier_id: supplierId!,
        route_group_id: routeGroupId,
      }),
    enabled: Boolean(supplierId),
  });
}

export function usePriceVersions(configId?: number) {
  return useQuery({
    queryKey: ['route-pricing', 'price-versions', configId],
    queryFn: () => routePricingApi.listVersions(configId!),
    enabled: Boolean(configId && configId > 0),
  });
}

export function useRoutePricingMutations(supplierId?: number) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['route-pricing'] });
  };

  return {
    createRoute: useMutation({
      mutationFn: routePricingApi.createRoute,
      onSuccess: invalidate,
    }),
    updateRoute: useMutation({
      mutationFn: ({ id, ...body }: { id: number; province_code: string; ward_code: string }) =>
        routePricingApi.updateRoute(id, body),
      onSuccess: invalidate,
    }),
    deleteRoute: useMutation({
      mutationFn: (id: number) => routePricingApi.deleteRoute(id),
      onSuccess: invalidate,
    }),
    createGroup: useMutation({
      mutationFn: routePricingApi.createGroup,
      onSuccess: invalidate,
    }),
    updateGroup: useMutation({
      mutationFn: ({
        id,
        ...body
      }: {
        id: number;
        ward_codes?: string[];
        location_text?: string | null;
        note?: string | null;
      }) => routePricingApi.updateGroup(id, body),
      onSuccess: invalidate,
    }),
    deleteGroup: useMutation({
      mutationFn: (id: number) => routePricingApi.deleteGroup(id),
      onSuccess: invalidate,
    }),
    createPrice: useMutation({
      mutationFn: (body: {
        route_group_id: number;
        effective_from: string;
        pricing_mode: 'by_weight' | 'by_trips';
        pallet_trip_price: number;
        note?: string | null;
        tiers: PriceTierInput[];
      }) => routePricingApi.createPrice(body),
      onSuccess: invalidate,
    }),
    adjustPrices: useMutation({
      mutationFn: routePricingApi.adjustPrices,
      onSuccess: invalidate,
    }),
    supplierId,
  };
}
