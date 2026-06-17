import { Router } from 'express';
import multer from 'multer';
import { vehicleController, vehicleDeleteSchema } from '../controllers/vehicleController';
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
router.post('/upload', requirePermission('catalog.manage'), upload.single('file'), vehicleController.upload);
router.delete('/:id', requirePermission('catalog.manage'), ...validate(vehicleDeleteSchema), vehicleController.remove);

export default router;
