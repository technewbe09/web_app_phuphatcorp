/**
 * riceDeliveryApi.ts
 * Fetch delivery schedules để làm master data cho tính năng xử lý data gạo.
 * Tái dụng API delivery-schedules đã có, nhưng fetch ALL (không phân trang)
 * trong 1 date range để build MasterPlateMap.
 */

import axiosClient from './axiosClient';

export interface SchedulePlate {
  ngay: string;      // YYYY-MM-DD
  so_xe: string | null;
}

export interface FetchPlatesResult {
  schedules: SchedulePlate[];
  totalFetched: number;
}

export const riceDeliveryApi = {
  /**
   * Lấy toàn bộ biển số + ngày trong khoảng date range.
   * Dùng limit lớn để lấy hết (delivery_schedules thường không quá vài nghìn dòng/tháng).
   */
  fetchPlatesForRange: async (
    fromDate: string,
    toDate: string
  ): Promise<FetchPlatesResult> => {
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
      limit: '100',
      page: '1',
    });

    const response = await axiosClient.get<{
      data: {
        schedules: SchedulePlate[];
        meta: { total: number; total_pages: number };
      };
    }>(`/delivery-schedules?${params.toString()}`);

    const { schedules, meta } = response.data.data;

    // Nếu có nhiều hơn 5000 dòng, fetch thêm các page
    let allSchedules = [...schedules];

    if (meta.total_pages > 1) {
      for (let page = 2; page <= meta.total_pages; page++) {
        const p2 = new URLSearchParams({
          from_date: fromDate,
          to_date: toDate,
          limit: '100',
          page: String(page),
        });
        const r2 = await axiosClient.get<{
          data: { schedules: SchedulePlate[] };
        }>(`/delivery-schedules?${p2.toString()}`);
        allSchedules = allSchedules.concat(r2.data.data.schedules);
      }
    }

    return {
      schedules: allSchedules,
      totalFetched: allSchedules.length,
    };
  },
};
