import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadExcel } from '../middleware/upload';
import {
  deliveryScheduleController,
  deliveryScheduleUploadSchema,
  deliveryScheduleListSchema,
  deliveryScheduleDeleteSchema,
  deliveryScheduleStatisticsSchema,
  deliveryScheduleUpdateSchema,
} from '../controllers/deliveryScheduleController';

const router = Router();

// Get statistics for a date range
router.get(
  '/statistics',
  authenticateToken,
  requirePermission('transport.view'),
  validate(deliveryScheduleStatisticsSchema),
  deliveryScheduleController.getStatistics
);

// Upload delivery schedule from Excel
router.post(
  '/upload',
  authenticateToken,
  requirePermission('transport.manage'),
  uploadExcel.single('file'),
  validate(deliveryScheduleUploadSchema),
  deliveryScheduleController.upload
);

// Get list of delivery schedules
router.get(
  '/',
  authenticateToken,
  requirePermission('transport.view'),
  validate(deliveryScheduleListSchema),
  deliveryScheduleController.list
);

// Delete delivery schedules by date range
router.delete(
  '/by-date-range',
  authenticateToken,
  requirePermission('transport.manage'),
  validate(deliveryScheduleDeleteSchema),
  deliveryScheduleController.deleteByDateRange
);

// Update a single delivery schedule by id
router.put(
  '/:id',
  authenticateToken,
  requirePermission('transport.manage'),
  validate(deliveryScheduleUpdateSchema),
  deliveryScheduleController.updateById
);

// Delete a single delivery schedule by id
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('transport.manage'),
  deliveryScheduleController.deleteById
);

export default router;
