import { Router } from 'express';
import {
  driverController,
  driverCreateSchema,
  driverUpdateSchema,
  driverDeleteSchema,
  driverDocParamSchema,
  driverDocDeleteSchema,
  driverUploadDocSchema,
} from '../controllers/driverController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('transport.view'), driverController.list);
router.post('/', requirePermission('transport.manage'), ...validate(driverCreateSchema), driverController.create);
router.put('/:id', requirePermission('transport.manage'), ...validate(driverUpdateSchema), driverController.update);
router.delete('/:id', requirePermission('transport.manage'), ...validate(driverDeleteSchema), driverController.remove);

router.get('/:id/documents', requirePermission('transport.view'), ...validate(driverDocParamSchema), driverController.getDocuments);
router.post('/:id/documents', requirePermission('transport.manage'), ...validate(driverUploadDocSchema), driverController.uploadDocument);
router.delete('/:id/documents/:docId', requirePermission('transport.manage'), ...validate(driverDocDeleteSchema), driverController.deleteDocument);
router.get('/:id/documents/:docId', requirePermission('transport.view'), ...validate(driverDocDeleteSchema), driverController.downloadDocument);

export default router;
