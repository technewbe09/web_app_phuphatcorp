import axiosClient from './axiosClient';

export interface Province {
  code: string;
  name: string;
  full_name: string | null;
}

export interface Ward {
  code: string;
  name: string;
  full_name: string | null;
  province_code: string;
}

export interface DeliveryRoute {
  id: number;
  supplier_id: number;
  province_code: string;
  ward_code: string | null;
  location_text: string | null;
  note: string | null;
  tinh: string;
  phuong: string;
  status: string;
  group_id?: number | null;
  group_name?: string | null;
}

export interface RouteGroupMember {
  route_id: number;
  province_code: string;
  ward_code: string | null;
  location_text: string | null;
  note: string | null;
  tinh: string;
  phuong: string;
}

export interface RouteGroup {
  id: number;
  supplier_id: number;
  name: string;
  province_code: string;
  tinh: string;
  is_residual: boolean;
  note: string | null;
  members: RouteGroupMember[];
}

export type PricingMode = 'by_weight' | 'by_trips';

export interface AdjustmentPeriod {
  id: number;
  start_date: string;
  end_date: string | null;
  percent: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PriceTierInput {
  range_from: number;
  range_to?: number | null;
  pricing_unit: 'chuyen' | 'tan';
  price: number;
  min_billable_ton?: number | null;
}

export interface RoutePriceVersion {
  id: number;
  price_config_id: number;
  effective_from: string;
  effective_to: string | null;
  pricing_mode: PricingMode;
  pallet_trip_price: number;
  adjustment_percent: number | null;
  base_version_id?: number | null;
  adjustment_period_id: number;
  note: string | null;
  tiers: PriceTierInput[];
  created_at?: string;
}

export interface RoutePriceConfigSummary {
  id: number;
  route_group_id: number;
  group_name: string;
  is_residual: boolean;
  province_code: string;
  tinh: string;
  current_version: RoutePriceVersion | null;
  version_count: number;
}

export interface LookupResult {
  khung_label: string;
  don_vi: 'Chuyến' | 'Tấn';
  price: number;
  group_name: string;
}

export const routePricingApi = {
  listProvinces: async (): Promise<Province[]> => {
    const res = await axiosClient.get<{ data: Province[] }>('/route-pricing/geo/provinces');
    return res.data.data;
  },

  listWards: async (province_code: string): Promise<Ward[]> => {
    const res = await axiosClient.get<{ data: Ward[] }>('/route-pricing/geo/wards', {
      params: { province_code },
    });
    return res.data.data;
  },

  listRoutes: async (params: {
    supplier_id: number;
    search?: string;
    province_code?: string;
  }): Promise<DeliveryRoute[]> => {
    const res = await axiosClient.get<{ data: DeliveryRoute[] }>('/route-pricing/routes', { params });
    return res.data.data;
  },

  createRoute: async (body: {
    supplier_id: number;
    province_code: string;
    ward_code?: string | null;
    location_text?: string | null;
    note?: string | null;
  }): Promise<DeliveryRoute> => {
    const res = await axiosClient.post<{ data: DeliveryRoute }>('/route-pricing/routes', body);
    return res.data.data;
  },

  updateRoute: async (
    id: number,
    body: {
      province_code: string;
      ward_code?: string | null;
      location_text?: string | null;
      note?: string | null;
    },
  ): Promise<DeliveryRoute> => {
    const res = await axiosClient.put<{ data: DeliveryRoute }>(`/route-pricing/routes/${id}`, body);
    return res.data.data;
  },

  deleteRoute: async (id: number): Promise<void> => {
    await axiosClient.delete(`/route-pricing/routes/${id}`);
  },

  listGroups: async (params: {
    supplier_id: number;
    province_code?: string;
    search?: string;
  }): Promise<RouteGroup[]> => {
    const res = await axiosClient.get<{ data: RouteGroup[] }>('/route-pricing/groups', { params });
    return res.data.data;
  },

  createGroup: async (body: {
    supplier_id: number;
    province_code: string;
    ward_codes?: string[];
    location_text?: string | null;
    note?: string | null;
  }): Promise<RouteGroup> => {
    const res = await axiosClient.post<{ data: RouteGroup }>('/route-pricing/groups', body);
    return res.data.data;
  },

  updateGroup: async (
    id: number,
    body: {
      ward_codes?: string[];
      location_text?: string | null;
      note?: string | null;
    },
  ): Promise<RouteGroup> => {
    const res = await axiosClient.put<{ data: RouteGroup }>(`/route-pricing/groups/${id}`, body);
    return res.data.data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await axiosClient.delete(`/route-pricing/groups/${id}`);
  },

  listPrices: async (params: {
    supplier_id: number;
    route_group_id?: number;
  }): Promise<RoutePriceConfigSummary[]> => {
    const res = await axiosClient.get<{ data: RoutePriceConfigSummary[] }>('/route-pricing/prices', {
      params,
    });
    return res.data.data;
  },

  listVersions: async (configId: number): Promise<RoutePriceVersion[]> => {
    const res = await axiosClient.get<{ data: RoutePriceVersion[] }>(
      `/route-pricing/prices/${configId}/versions`,
    );
    return res.data.data;
  },

  createPrice: async (body: {
    route_group_id: number;
    adjustment_period_id: number;
    pricing_mode: PricingMode;
    pallet_trip_price: number;
    note?: string | null;
    tiers: PriceTierInput[];
  }): Promise<RoutePriceVersion> => {
    const res = await axiosClient.post<{ data: RoutePriceVersion }>('/route-pricing/prices', body);
    return res.data.data;
  },

  updateAbsolutePrice: async (
    routeGroupId: number,
    body: {
      pricing_mode: PricingMode;
      pallet_trip_price: number;
      note?: string | null;
      tiers: PriceTierInput[];
    },
  ): Promise<RoutePriceVersion> => {
    const res = await axiosClient.put<{ data: RoutePriceVersion }>(
      `/route-pricing/prices/groups/${routeGroupId}/absolute`,
      body,
    );
    return res.data.data;
  },

  listAdjustmentPeriods: async (): Promise<AdjustmentPeriod[]> => {
    const res = await axiosClient.get<{ data: AdjustmentPeriod[] }>(
      '/route-pricing/adjustment-periods',
    );
    return res.data.data;
  },

  createAdjustmentPeriod: async (body: {
    start_date: string;
    percent: number;
    note?: string | null;
  }): Promise<{ period: AdjustmentPeriod; adjusted: number }> => {
    const res = await axiosClient.post<{
      data: { period: AdjustmentPeriod; adjusted: number };
    }>('/route-pricing/adjustment-periods', body);
    return res.data.data;
  },

  deleteAdjustmentPeriod: async (id: number): Promise<{ deleted_versions: number }> => {
    const res = await axiosClient.delete<{ data: { deleted_versions: number } }>(
      `/route-pricing/adjustment-periods/${id}`,
    );
    return res.data.data;
  },

  lookup: async (params: {
    supplier_id: number;
    tinh?: string;
    phuong?: string;
    province_code?: string;
    ward_code?: string;
    location_text?: string;
    note?: string;
    weight_mt?: number;
    trips_per_vehicle_day?: number;
    is_pallet?: boolean;
    as_of?: string;
  }): Promise<LookupResult> => {
    const res = await axiosClient.get<{ data: LookupResult }>('/route-pricing/lookup', { params });
    return res.data.data;
  },
};
