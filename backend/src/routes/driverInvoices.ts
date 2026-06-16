import { Router } from 'express';
import {
  driverInvoiceController,
  driverInvoiceListSchema,
  driverInvoiceDeleteSchema,
  driverInvoiceCreateSchema,
  driverInvoiceUploadSchema,
  driverInvoiceUpdateSchema,
} from '../controllers/driverInvoiceController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('accounting_data.view'), ...validate(driverInvoiceListSchema), driverInvoiceController.list);
router.get('/:id', requirePermission('accounting_data.view'), driverInvoiceController.getById);
router.post('/', requirePermission('accounting_data.manage'), ...validate(driverInvoiceCreateSchema), driverInvoiceController.create);
router.post('/upload', requirePermission('accounting_data.manage'), ...validate(driverInvoiceUploadSchema), driverInvoiceController.upload);
router.delete('/:id', requirePermission('accounting_data.manage'), ...validate(driverInvoiceDeleteSchema), driverInvoiceController.remove);
router.put('/:id', requirePermission('accounting_data.manage'), ...validate(driverInvoiceUpdateSchema), driverInvoiceController.update);

export default router;
