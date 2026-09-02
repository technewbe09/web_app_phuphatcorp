import { Router } from 'express';
import {
  invoiceTrackingController,
  invoiceTrackingListSchema,
  invoiceTrackingDetailSchema,
  invoiceTrackingUploadSchema,
  invoiceTrackingReviewSchema,
  invoiceTrackingStatisticsSchema,
} from '../controllers/invoiceTrackingController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { resolveDataScope } from '../middleware/dataScope';

const router = Router();

router.use(authenticateToken);
router.use(resolveDataScope('invoice_tracking'));

router.get('/', requirePermission('invoice_tracking.view'), ...validate(invoiceTrackingListSchema), invoiceTrackingController.list);
router.get('/statistics', requirePermission('invoice_tracking.view'), ...validate(invoiceTrackingStatisticsSchema), invoiceTrackingController.getStatistics);
router.get('/:id', requirePermission('invoice_tracking.view'), ...validate(invoiceTrackingDetailSchema), invoiceTrackingController.getById);
router.get('/:id/history', requirePermission('invoice_tracking.view'), ...validate(invoiceTrackingDetailSchema), invoiceTrackingController.getHistory);
router.post('/:id/documents', requirePermission('invoice_tracking.view'), ...validate(invoiceTrackingUploadSchema), invoiceTrackingController.uploadDocuments);
router.put('/:id/review', requirePermission('invoice_tracking.manage'), ...validate(invoiceTrackingReviewSchema), invoiceTrackingController.review);

export default router;
