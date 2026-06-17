import { Router } from 'express';
import {
  supplierController,
  supplierCreateSchema,
  supplierUpdateSchema,
  supplierDeleteSchema,
  supplierUploadSchema,
} from '../controllers/supplierController';
import { validate } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', supplierController.list);
router.post('/upload', ...validate(supplierUploadSchema), supplierController.upload);
router.post('/', ...validate(supplierCreateSchema), supplierController.create);
router.put('/:id', ...validate(supplierUpdateSchema), supplierController.update);
router.delete('/:id', ...validate(supplierDeleteSchema), supplierController.remove);

export default router;
