import { Router } from 'express';
import {
  oilChangeController,
  oilChangeCreateSchema,
  oilChangeUpdateSchema,
  oilChangeDeleteSchema,
} from '../controllers/oilChangeController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { resolveDataScope } from '../middleware/dataScope';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticateToken);
router.use(resolveDataScope('vehicle_data'));

router.get('/', requirePermission('vehicle_data.view'), oilChangeController.list);
router.get('/due', requirePermission('vehicle_data.view'), oilChangeController.getDue);
router.get('/:id', requirePermission('vehicle_data.view'), oilChangeController.getById);

router.post('/', requirePermission('vehicle_data.manage'), ...validate(oilChangeCreateSchema), oilChangeController.create);

router.put('/:id', requirePermission('vehicle_data.manage'), ...validate(oilChangeUpdateSchema), oilChangeController.update);

router.delete('/:id', requirePermission('vehicle_data.manage'), ...validate(oilChangeDeleteSchema), oilChangeController.remove);

export default router;
