import { Router } from 'express';
import {
  tripCodeController,
  tripCodeCreateSchema,
  tripCodeUpdateSchema,
  tripCodeDeleteSchema,
  tripCodeUploadSchema,
} from '../controllers/tripCodeController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', tripCodeController.list);
router.post('/', requirePermission('transport.manage'), ...validate(tripCodeCreateSchema), tripCodeController.create);
router.put('/:id', requirePermission('transport.manage'), ...validate(tripCodeUpdateSchema), tripCodeController.update);
router.delete('/:id', requirePermission('transport.manage'), ...validate(tripCodeDeleteSchema), tripCodeController.remove);
router.post('/upload', requirePermission('transport.manage'), ...validate(tripCodeUploadSchema), tripCodeController.upload);

export default router;
