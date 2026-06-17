import { Router } from 'express';
import {
  supplierController,
  supplierCreateSchema,
  supplierUpdateSchema,
  supplierDeleteSchema,
  supplierUploadSchema,
} from '../controllers/supplierController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('catalog.view'), supplierController.list);
router.post('/upload', requirePermission('catalog.manage'), ...validate(supplierUploadSchema), supplierController.upload);
router.post('/', requirePermission('catalog.manage'), ...validate(supplierCreateSchema), supplierController.create);
router.put('/:id', requirePermission('catalog.manage'), ...validate(supplierUpdateSchema), supplierController.update);
router.delete('/:id', requirePermission('catalog.manage'), ...validate(supplierDeleteSchema), supplierController.remove);

export default router;
