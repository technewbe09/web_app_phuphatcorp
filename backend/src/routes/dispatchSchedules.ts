import { Router } from 'express';
import {
  dispatchScheduleController,
  dispatchListQuerySchema,
  dispatchCreateSchema,
  dispatchUpdateSchema,
  dispatchDeleteSchema,
} from '../controllers/dispatchScheduleController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', ...validate(dispatchListQuerySchema), dispatchScheduleController.list);
router.post('/', requirePermission('dispatch.manage'), ...validate(dispatchCreateSchema), dispatchScheduleController.create);
router.put('/:id', requirePermission('dispatch.manage'), ...validate(dispatchUpdateSchema), dispatchScheduleController.update);
router.delete('/:id', requirePermission('dispatch.manage'), ...validate(dispatchDeleteSchema), dispatchScheduleController.remove);

export default router;
