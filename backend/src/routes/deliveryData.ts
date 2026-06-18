import { Router } from 'express';
import multer from 'multer';
import {
  deliveryDataController,
  listBatchesSchema,
  getBatchRowsSchema,
  deleteBatchSchema,
} from '../controllers/deliveryDataController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

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

router.post(
  '/import',
  requirePermission('delivery_data.manage'),
  upload.single('file'),
  deliveryDataController.importFile,
);
router.get(
  '/batches',
  requirePermission('delivery_data.view'),
  ...validate(listBatchesSchema),
  deliveryDataController.listBatches,
);
router.get(
  '/batches/:batchId',
  requirePermission('delivery_data.view'),
  deliveryDataController.getBatchStats,
);
router.delete(
  '/batches/:batchId',
  requirePermission('delivery_data.manage'),
  ...validate(deleteBatchSchema),
  deliveryDataController.deleteBatch,
);
router.post(
  '/batches/rows',
  requirePermission('delivery_data.view'),
  ...validate(getBatchRowsSchema),
  deliveryDataController.getBatchRows,
);

export default router;
