import { Router } from 'express';
import multer from 'multer';
import {
  insuranceController,
  insuranceCreateSchema,
  insuranceUpdateSchema,
  insuranceDeleteSchema,
  insuranceImageDeleteSchema,
} from '../controllers/insuranceController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.get('/files/:filename', insuranceController.serveFile);

router.use(authenticateToken);

router.get('/', requirePermission('vehicle_data.view'), insuranceController.list);
router.get('/summary', requirePermission('vehicle_data.view'), insuranceController.getVehicleSummary);
router.get('/expiring', requirePermission('vehicle_data.view'), insuranceController.getExpiring);
router.get('/:id', requirePermission('vehicle_data.view'), insuranceController.getById);

router.post('/', requirePermission('vehicle_data.manage'), ...validate(insuranceCreateSchema), insuranceController.create);
router.post('/:id/images', requirePermission('vehicle_data.manage'), imageUpload.single('image'), insuranceController.uploadImage);

router.put('/:id', requirePermission('vehicle_data.manage'), ...validate(insuranceUpdateSchema), insuranceController.update);

router.delete('/:id/images/:imageId', requirePermission('vehicle_data.manage'), ...validate(insuranceImageDeleteSchema), insuranceController.deleteImage);
router.delete('/:id', requirePermission('vehicle_data.manage'), ...validate(insuranceDeleteSchema), insuranceController.remove);

export default router;
