import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  fuelRecordController,
  fuelRecordCreateSchema,
  fuelRecordUpdateSchema,
  fuelRecordDeleteSchema,
} from '../controllers/fuelRecordController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const uploadDir = path.resolve('uploads/fuel-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const excelUpload = multer({
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

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'));
    }
  },
});

router.use(authenticateToken);

router.get('/', requirePermission('fuel.view'), fuelRecordController.list);
router.get('/statistics', requirePermission('fuel.view'), fuelRecordController.statistics);
router.get('/months', requirePermission('fuel.view'), fuelRecordController.months);
router.get('/batches', requirePermission('fuel.view'), fuelRecordController.batches);
router.get('/latest-odometer/:vehicleId', requirePermission('fuel.view'), fuelRecordController.latestOdometer);
router.get('/monitoring', requirePermission('fuel.view'), fuelRecordController.monitoring);
router.get('/:id/images', requirePermission('fuel.view'), fuelRecordController.getImages);
router.get('/:id', requirePermission('fuel.view'), fuelRecordController.getById);

router.post('/', requirePermission('fuel.manage'), ...validate(fuelRecordCreateSchema), fuelRecordController.create);
router.post('/upload', requirePermission('fuel.manage'), excelUpload.single('file'), fuelRecordController.upload);
router.post('/:id/images', requirePermission('fuel.manage'), imageUpload.single('image'), fuelRecordController.uploadImage);

router.put('/:id', requirePermission('fuel.manage'), ...validate(fuelRecordUpdateSchema), fuelRecordController.update);

router.delete('/:id/images/:imageId', requirePermission('fuel.manage'), fuelRecordController.deleteImage);
router.delete('/:id', requirePermission('fuel.manage'), ...validate(fuelRecordDeleteSchema), fuelRecordController.remove);
router.delete('/batches/:batchId', requirePermission('fuel.manage'), fuelRecordController.deleteBatch);

export default router;
