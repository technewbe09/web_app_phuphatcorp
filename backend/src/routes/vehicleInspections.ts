import { Router } from 'express';
import multer from 'multer';
import {
  inspectionController,
  inspectionCreateSchema,
  inspectionUpdateSchema,
  inspectionDeleteSchema,
  inspectionImageDeleteSchema,
} from '../controllers/inspectionController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for MinIO
});

// Public route: serve uploaded files (no auth — used by <img>/<a> tags)
router.get('/files/:filename', inspectionController.serveFile);

// All other routes require authentication
router.use(authenticateToken);

router.get('/', requirePermission('vehicle_data.view'), inspectionController.list);
router.get('/summary', requirePermission('vehicle_data.view'), inspectionController.getVehicleSummary);
router.get('/expiring', requirePermission('vehicle_data.view'), inspectionController.getExpiring);
router.get('/:id', requirePermission('vehicle_data.view'), inspectionController.getById);

router.post('/', requirePermission('vehicle_data.manage'), ...validate(inspectionCreateSchema), inspectionController.create);
router.post('/:id/images', requirePermission('vehicle_data.manage'), imageUpload.single('image'), inspectionController.uploadImage);

router.put('/:id', requirePermission('vehicle_data.manage'), ...validate(inspectionUpdateSchema), inspectionController.update);

router.delete('/:id/images/:imageId', requirePermission('vehicle_data.manage'), ...validate(inspectionImageDeleteSchema), inspectionController.deleteImage);
router.delete('/:id', requirePermission('vehicle_data.manage'), ...validate(inspectionDeleteSchema), inspectionController.remove);

export default router;
