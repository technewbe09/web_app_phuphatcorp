import { Router } from 'express';
import {
  weightAdjustmentController,
  weightAdjustmentCreateSchema,
  weightAdjustmentUpdateSchema,
  weightAdjustmentDeleteSchema,
  weightAdjustmentUploadSchema,
} from '../controllers/weightAdjustmentController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('accounting_data.view'), weightAdjustmentController.list);
router.post('/', requirePermission('accounting_data.manage'), ...validate(weightAdjustmentCreateSchema), weightAdjustmentController.create);
router.put('/:id', requirePermission('accounting_data.manage'), ...validate(weightAdjustmentUpdateSchema), weightAdjustmentController.update);
router.delete('/:id', requirePermission('accounting_data.manage'), ...validate(weightAdjustmentDeleteSchema), weightAdjustmentController.remove);
router.post('/upload', requirePermission('accounting_data.manage'), ...validate(weightAdjustmentUploadSchema), weightAdjustmentController.upload);

export default router;
