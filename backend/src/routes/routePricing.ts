import { Router } from 'express';
import {
  geoWardsSchema,
  groupCreateSchema,
  groupDeleteSchema,
  groupUpdateSchema,
  groupsListSchema,
  lookupSchema,
  priceAdjustSchema,
  priceCreateSchema,
  pricesListSchema,
  routeCreateSchema,
  routeDeleteSchema,
  routePricingController,
  routeUpdateSchema,
  routesListSchema,
  versionsSchema,
} from '../controllers/routePricingController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticateToken);

router.get('/geo/provinces', requirePermission('route_pricing.view'), routePricingController.listProvinces);
router.get(
  '/geo/wards',
  requirePermission('route_pricing.view'),
  ...validate(geoWardsSchema),
  routePricingController.listWards,
);

router.get(
  '/routes',
  requirePermission('route_pricing.view'),
  ...validate(routesListSchema),
  routePricingController.listRoutes,
);
router.post(
  '/routes',
  requirePermission('route_pricing.manage'),
  ...validate(routeCreateSchema),
  routePricingController.createRoute,
);
router.put(
  '/routes/:id',
  requirePermission('route_pricing.manage'),
  ...validate(routeUpdateSchema),
  routePricingController.updateRoute,
);
router.delete(
  '/routes/:id',
  requirePermission('route_pricing.manage'),
  ...validate(routeDeleteSchema),
  routePricingController.deleteRoute,
);

router.get(
  '/groups',
  requirePermission('route_pricing.view'),
  ...validate(groupsListSchema),
  routePricingController.listGroups,
);
router.post(
  '/groups',
  requirePermission('route_pricing.manage'),
  ...validate(groupCreateSchema),
  routePricingController.createGroup,
);
router.put(
  '/groups/:id',
  requirePermission('route_pricing.manage'),
  ...validate(groupUpdateSchema),
  routePricingController.updateGroup,
);
router.delete(
  '/groups/:id',
  requirePermission('route_pricing.manage'),
  ...validate(groupDeleteSchema),
  routePricingController.deleteGroup,
);

router.get(
  '/prices',
  requirePermission('route_pricing.view'),
  ...validate(pricesListSchema),
  routePricingController.listPrices,
);
router.get(
  '/prices/:configId/versions',
  requirePermission('route_pricing.view'),
  ...validate(versionsSchema),
  routePricingController.listVersions,
);
router.post(
  '/prices',
  requirePermission('route_pricing.manage'),
  ...validate(priceCreateSchema),
  routePricingController.createPrice,
);
router.post(
  '/prices/adjust',
  requirePermission('route_pricing.manage'),
  ...validate(priceAdjustSchema),
  routePricingController.adjustPrices,
);

router.get(
  '/lookup',
  requirePermission('route_pricing.view'),
  ...validate(lookupSchema),
  routePricingController.lookup,
);

export default router;
