import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

const uploadDir = path.resolve('uploads/inspection-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

router.get('/', requirePermission('vehicle_data.view'), inspectionController.list);
router.get('/expiring', requirePermission('vehicle_data.view'), inspectionController.getExpiring);
router.get('/:id', requirePermission('vehicle_data.view'), inspectionController.getById);

router.post('/', requirePermission('vehicle_data.manage'), ...validate(inspectionCreateSchema), inspectionController.create);
router.post('/:id/images', requirePermission('vehicle_data.manage'), imageUpload.single('image'), inspectionController.uploadImage);

router.put('/:id', requirePermission('vehicle_data.manage'), ...validate(inspectionUpdateSchema), inspectionController.update);

router.delete('/:id/images/:imageId', requirePermission('vehicle_data.manage'), ...validate(inspectionImageDeleteSchema), inspectionController.deleteImage);
router.delete('/:id', requirePermission('vehicle_data.manage'), ...validate(inspectionDeleteSchema), inspectionController.remove);

export default router;
