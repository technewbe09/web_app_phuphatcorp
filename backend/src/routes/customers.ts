import { Router } from 'express';
import {
  customerController,
  customerCreateSchema,
  customerUpdateSchema,
  customerDeleteSchema,
  customerUploadSchema,
} from '../controllers/customerController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('accounting_data.view'), customerController.list);
router.post('/upload', requirePermission('accounting_data.manage'), ...validate(customerUploadSchema), customerController.upload);
router.post('/', requirePermission('accounting_data.manage'), ...validate(customerCreateSchema), customerController.create);
router.put('/:id', requirePermission('accounting_data.manage'), ...validate(customerUpdateSchema), customerController.update);
router.delete('/:id', requirePermission('accounting_data.manage'), ...validate(customerDeleteSchema), customerController.remove);

export default router;
