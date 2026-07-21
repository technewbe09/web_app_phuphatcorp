import { Router } from 'express';
import multer from 'multer';
import {
  repairController,
  repairCreateSchema,
  repairUpdateSchema,
  repairDeleteSchema,
  repairImageDeleteSchema,
} from '../controllers/repairController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.get('/files/:filename', repairController.serveFile);

router.use(authenticateToken);

router.get('/summary', requirePermission('vehicle_data.view'), repairController.summary);
router.get('/vehicle/:vehicleId', requirePermission('vehicle_data.view'), repairController.listByVehicle);
router.get('/:id', requirePermission('vehicle_data.view'), repairController.getById);

router.post('/', requirePermission('vehicle_data.manage'), ...validate(repairCreateSchema), repairController.create);
router.post('/:id/images', requirePermission('vehicle_data.manage'), imageUpload.single('image'), repairController.uploadImage);

router.put('/:id', requirePermission('vehicle_data.manage'), ...validate(repairUpdateSchema), repairController.update);

router.delete('/:id/images/:imageId', requirePermission('vehicle_data.manage'), ...validate(repairImageDeleteSchema), repairController.deleteImage);
router.delete('/:id', requirePermission('vehicle_data.manage'), ...validate(repairDeleteSchema), repairController.remove);

export default router;
