import { Router } from 'express';
import multer from 'multer';
import { vehicleController, vehicleDeleteSchema, vehicleCreateSchema, vehicleUpdateSchema, oilIntervalSchema } from '../controllers/vehicleController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file .xlsx'));
    }
  },
});

router.use(authenticateToken);

router.get('/', requirePermission('catalog.view'), vehicleController.getAll);
router.get('/:id/summary', vehicleController.summary);
router.post('/upload', requirePermission('catalog.manage'), upload.single('file'), vehicleController.upload);
router.post('/', requirePermission('catalog.manage'), ...validate(vehicleCreateSchema), vehicleController.create);
router.delete('/:id', requirePermission('catalog.manage'), ...validate(vehicleDeleteSchema), vehicleController.remove);
router.patch('/:id/toggle', requirePermission('catalog.manage'), ...validate(vehicleDeleteSchema), vehicleController.toggleStatus);
router.put('/:id', requirePermission('catalog.manage'), ...validate(vehicleUpdateSchema), vehicleController.update);
router.put('/:id/oil-interval', requirePermission('vehicle_data.manage'), ...validate(oilIntervalSchema), vehicleController.updateOilInterval);

export default router;
