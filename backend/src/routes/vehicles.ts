import { Router } from 'express';
import {
  vehicleController,
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleDeleteSchema,
  vehicleUploadSchema,
} from '../controllers/vehicleController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', vehicleController.list);
router.post('/', requirePermission('transport.manage'), ...validate(vehicleCreateSchema), vehicleController.create);
router.put('/:id', requirePermission('transport.manage'), ...validate(vehicleUpdateSchema), vehicleController.update);
router.delete('/:id', requirePermission('transport.manage'), ...validate(vehicleDeleteSchema), vehicleController.remove);
router.post('/upload', requirePermission('transport.manage'), ...validate(vehicleUploadSchema), vehicleController.upload);

export default router;
