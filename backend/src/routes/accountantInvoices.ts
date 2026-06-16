import { Router } from 'express';
import {
  accountantInvoiceController,
  listInvoicesSchema,
  missingSummarySchema,
} from '../controllers/accountantInvoiceController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  requirePermission('accounting_data.view'),
  ...validate(listInvoicesSchema),
  accountantInvoiceController.list,
);

router.get(
  '/missing-summary',
  requirePermission('accounting_data.view'),
  ...validate(missingSummarySchema),
  accountantInvoiceController.missingSummary,
);

export default router;
