import { Response } from 'express';
import { body, param, query, ValidationChain } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { routePricingService } from '../services/routePricingService';
import { sendError, sendSuccess } from '../utils/response';

function handleServiceError(res: Response, err: unknown, fallback: string): void {
  const e = err as { code?: string; message?: string };
  const code = e?.code;
  const map: Record<string, { status: number; message: string }> = {
    MISSING_SUPPLIER: { status: 400, message: 'Thiếu nhà cung cấp' },
    MISSING_PROVINCE: { status: 400, message: 'Thiếu tỉnh' },
    SUPPLIER_NOT_FOUND: { status: 404, message: 'Không tìm thấy nhà cung cấp' },
    NOT_FOUND: { status: 404, message: e.message || 'Không tìm thấy' },
    INVALID_WARD: { status: 400, message: e.message || 'Phường/tỉnh không hợp lệ' },
    DUPLICATE_ROUTE: { status: 409, message: 'Tuyến đã tồn tại (cùng đích và ghi chú)' },
    ROUTE_IN_ACTIVE_GROUP: { status: 409, message: 'Tuyến đang thuộc nhóm, hãy gỡ khỏi nhóm trước' },
    DUPLICATE_RESIDUAL_GROUP: {
      status: 409,
      message: 'Đã có nhóm còn lại với cùng ghi chú cho tỉnh này',
    },
    DUPLICATE_GROUP_NAME: { status: 409, message: 'Tên nhóm đã tồn tại' },
    ABSOLUTE_UPDATE_FORBIDDEN: { status: 400, message: 'Đã có giá — chỉ được cập nhật bằng điều chỉnh %' },
    NOTHING_TO_ADJUST: { status: 400, message: 'Không có bảng giá để điều chỉnh' },
    OVERLAPPING_VERSION: { status: 409, message: 'Đã có phiên bản trùng ngày hiệu lực' },
    INVALID_TIERS: { status: 400, message: e.message || 'Bậc điều kiện không hợp lệ' },
    INVALID_DESTINATION: {
      status: 400,
      message: e.message || 'Chỉ chọn phường hoặc địa điểm, không chọn cả hai',
    },
    AMBIGUOUS_ROUTE: { status: 409, message: e.message || 'Khớp nhiều nhóm tuyến' },
    ROUTE_ALREADY_IN_GROUP: { status: 409, message: 'Phường đã thuộc nhóm khác' },
  };
  if (code && map[code]) {
    sendError(res, map[code].message, map[code].status, code);
    return;
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  sendError(res, fallback, 500, msg);
}

export const geoProvincesSchema: ValidationChain[] = [];

export const geoWardsSchema: ValidationChain[] = [
  query('province_code').notEmpty().withMessage('province_code là bắt buộc'),
];

export const routesListSchema: ValidationChain[] = [
  query('supplier_id').isInt({ min: 1 }).withMessage('supplier_id là bắt buộc'),
];

export const routeCreateSchema: ValidationChain[] = [
  body('supplier_id').isInt({ min: 1 }).withMessage('supplier_id là bắt buộc'),
  body('province_code').notEmpty().withMessage('province_code là bắt buộc'),
  body('ward_code').optional({ nullable: true }).isString(),
  body('location_text').optional({ nullable: true }).isString(),
  body('note').optional({ nullable: true }).isString(),
];

export const routeUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('province_code').notEmpty().withMessage('province_code là bắt buộc'),
  body('ward_code').optional({ nullable: true }).isString(),
  body('location_text').optional({ nullable: true }).isString(),
  body('note').optional({ nullable: true }).isString(),
];

export const routeDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
];

export const groupsListSchema: ValidationChain[] = [
  query('supplier_id').isInt({ min: 1 }).withMessage('supplier_id là bắt buộc'),
];

export const groupCreateSchema: ValidationChain[] = [
  body('supplier_id').isInt({ min: 1 }).withMessage('supplier_id là bắt buộc'),
  body('province_code').notEmpty().withMessage('province_code là bắt buộc'),
  body('ward_codes').optional().isArray(),
  body('ward_codes.*').optional().isString(),
  body('location_text').optional({ nullable: true }).isString(),
  body('note').optional({ nullable: true }),
];

export const groupUpdateSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('ward_codes').optional().isArray(),
  body('ward_codes.*').optional().isString(),
  body('location_text').optional({ nullable: true }).isString(),
  body('note').optional({ nullable: true }),
];

export const groupDeleteSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
];

export const pricesListSchema: ValidationChain[] = [
  query('supplier_id').isInt({ min: 1 }).withMessage('supplier_id là bắt buộc'),
];

export const priceCreateSchema: ValidationChain[] = [
  body('route_group_id').isInt({ min: 1 }),
  body('effective_from').notEmpty().isISO8601().toDate(),
  body('pricing_mode').isIn(['by_weight', 'by_trips']).withMessage('pricing_mode không hợp lệ'),
  body('pallet_trip_price').isFloat({ min: 0 }).withMessage('Giá Pallet phải ≥ 0'),
  body('tiers').isArray({ min: 1 }),
  body('tiers.*.range_from').isFloat({ min: 0 }),
  body('tiers.*.range_to')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === undefined ? null : v))
    .custom((v) => v == null || (typeof v === 'number' ? !Number.isNaN(v) : !Number.isNaN(parseFloat(String(v)))))
    .withMessage('range_to phải là số hoặc null'),
  body('tiers.*.pricing_unit').isIn(['chuyen', 'tan']),
  body('tiers.*.price').isFloat({ gt: 0 }),
  body('tiers.*.min_billable_ton')
    .optional({ nullable: true })
    .customSanitizer((v) => {
      if (v === '' || v === undefined || v === null || Number(v) === 0) return null;
      return v;
    })
    .custom((v) => v == null || (typeof v === 'number' ? v > 0 : parseFloat(String(v)) > 0))
    .withMessage('min_billable_ton phải > 0 hoặc để trống'),
  body('note').optional({ nullable: true }),
];

export const priceAdjustSchema: ValidationChain[] = [
  body('percent').isFloat().withMessage('percent là bắt buộc'),
  body('effective_from').notEmpty().isISO8601().toDate(),
  body('note').optional({ nullable: true }),
];

export const versionsSchema: ValidationChain[] = [
  param('configId').isInt({ min: 1 }),
];

export const lookupSchema: ValidationChain[] = [
  query('supplier_id').isInt({ min: 1 }),
];

export const routePricingController = {
  async listProvinces(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await routePricingService.listProvinces();
      sendSuccess(res, data, 'Danh sách tỉnh');
    } catch (err) {
      handleServiceError(res, err, 'Không tải được danh sách tỉnh');
    }
  },

  async listWards(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await routePricingService.listWards(String(req.query.province_code));
      sendSuccess(res, data, 'Danh sách phường');
    } catch (err) {
      handleServiceError(res, err, 'Không tải được danh sách phường');
    }
  },

  async listRoutes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const supplierId = parseInt(String(req.query.supplier_id), 10);
      const data = await routePricingService.listRoutes(supplierId, {
        search: req.query.search as string | undefined,
        province_code: req.query.province_code as string | undefined,
        status: (req.query.status as string) || 'active',
      });
      sendSuccess(res, data, 'Danh sách tuyến');
    } catch (err) {
      handleServiceError(res, err, 'Không tải được danh sách tuyến');
    }
  },

  async createRoute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await routePricingService.createRoute(req.body, req.user!.userId);
      sendSuccess(res, data, 'Đã tạo tuyến', 201);
    } catch (err) {
      handleServiceError(res, err, 'Không tạo được tuyến');
    }
  },

  async updateRoute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await routePricingService.updateRoute(id, req.body, req.user!.userId);
      sendSuccess(res, data, 'Đã cập nhật tuyến');
    } catch (err) {
      handleServiceError(res, err, 'Không cập nhật được tuyến');
    }
  },

  async deleteRoute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await routePricingService.softDeleteRoute(id);
      sendSuccess(res, null, 'Đã xóa tuyến');
    } catch (err) {
      handleServiceError(res, err, 'Không xóa được tuyến');
    }
  },

  async listGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const supplierId = parseInt(String(req.query.supplier_id), 10);
      const data = await routePricingService.listGroups(supplierId, {
        province_code: req.query.province_code as string | undefined,
        search: req.query.search as string | undefined,
      });
      sendSuccess(res, data, 'Danh sách nhóm');
    } catch (err) {
      handleServiceError(res, err, 'Không tải được danh sách nhóm');
    }
  },

  async createGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await routePricingService.createGroup(
        {
          supplier_id: req.body.supplier_id,
          province_code: req.body.province_code,
          ward_codes: req.body.ward_codes,
          location_text: req.body.location_text,
          note: req.body.note,
        },
        req.user!.userId,
      );
      sendSuccess(res, data, 'Đã tạo nhóm', 201);
    } catch (err) {
      handleServiceError(res, err, 'Không tạo được nhóm');
    }
  },

  async updateGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await routePricingService.updateGroup(
        id,
        {
          note: req.body.note,
          ward_codes: req.body.ward_codes,
          location_text: req.body.location_text,
        },
        req.user!.userId,
      );
      sendSuccess(res, data, 'Đã cập nhật nhóm');
    } catch (err) {
      handleServiceError(res, err, 'Không cập nhật được nhóm');
    }
  },

  async deleteGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await routePricingService.softDeleteGroup(id, req.user!.userId);
      sendSuccess(res, null, 'Đã xóa nhóm');
    } catch (err) {
      handleServiceError(res, err, 'Không xóa được nhóm');
    }
  },

  async listPrices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const supplierId = parseInt(String(req.query.supplier_id), 10);
      const groupId = req.query.route_group_id
        ? parseInt(String(req.query.route_group_id), 10)
        : undefined;
      const data = await routePricingService.listPrices(supplierId, groupId);
      sendSuccess(res, data, 'Danh sách bảng giá');
    } catch (err) {
      handleServiceError(res, err, 'Không tải được bảng giá');
    }
  },

  async listVersions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const configId = parseInt(req.params.configId, 10);
      const data = await routePricingService.listVersions(configId);
      sendSuccess(res, data, 'Lịch sử phiên bản giá');
    } catch (err) {
      handleServiceError(res, err, 'Không tải được lịch sử giá');
    }
  },

  async createPrice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const effectiveFrom =
        req.body.effective_from instanceof Date
          ? req.body.effective_from.toISOString().slice(0, 10)
          : String(req.body.effective_from).slice(0, 10);
      const data = await routePricingService.createAbsolutePrice(
        {
          route_group_id: req.body.route_group_id,
          effective_from: effectiveFrom,
          pricing_mode: req.body.pricing_mode,
          pallet_trip_price: Number(req.body.pallet_trip_price),
          note: req.body.note,
          tiers: req.body.tiers,
        },
        req.user!.userId,
      );
      sendSuccess(res, data, 'Đã tạo bảng giá gốc', 201);
    } catch (err) {
      handleServiceError(res, err, 'Không tạo được bảng giá');
    }
  },

  async adjustPrices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const effectiveFrom =
        req.body.effective_from instanceof Date
          ? req.body.effective_from.toISOString().slice(0, 10)
          : String(req.body.effective_from).slice(0, 10);
      const data = await routePricingService.adjustPercentGlobal(
        {
          percent: Number(req.body.percent),
          effective_from: effectiveFrom,
          note: req.body.note,
        },
        req.user!.userId,
      );
      sendSuccess(res, data, `Đã điều chỉnh giá cho ${data.adjusted} bảng giá`);
    } catch (err) {
      handleServiceError(res, err, 'Không điều chỉnh được giá');
    }
  },

  async lookup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await routePricingService.lookup({
        supplier_id: parseInt(String(req.query.supplier_id), 10),
        province_code: req.query.province_code as string | undefined,
        ward_code: req.query.ward_code as string | undefined,
        location_text: req.query.location_text as string | undefined,
        note: req.query.note as string | undefined,
        tinh: req.query.tinh as string | undefined,
        phuong: req.query.phuong as string | undefined,
        weight_mt: req.query.weight_mt != null ? Number(req.query.weight_mt) : undefined,
        trips_per_vehicle_day:
          req.query.trips_per_vehicle_day != null && String(req.query.trips_per_vehicle_day) !== ''
            ? Number(req.query.trips_per_vehicle_day)
            : undefined,
        is_pallet: String(req.query.is_pallet) === 'true',
        as_of: req.query.as_of as string | undefined,
      });
      sendSuccess(res, data, 'Lookup giá tuyến');
    } catch (err) {
      handleServiceError(res, err, 'Không lookup được giá');
    }
  },
};
