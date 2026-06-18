import { Router } from 'express';
import {
  reconcileJobController,
  createConfigSchema,
  updateConfigSchema,
  getLogsSchema,
} from '../controllers/reconcileJobController';
import { validate } from '../middleware/validate';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/configs', requirePermission('jobs.view'), reconcileJobController.listConfigs);
router.post('/configs', requirePermission('jobs.manage'), ...validate(createConfigSchema), reconcileJobController.createConfig);
router.put('/configs/:id', requirePermission('jobs.manage'), ...validate(updateConfigSchema), reconcileJobController.updateConfig);
router.delete('/configs/:id', requirePermission('jobs.manage'), reconcileJobController.deleteConfig);
router.patch('/configs/:id/toggle', requirePermission('jobs.manage'), reconcileJobController.toggleConfig);
router.post('/trigger', requirePermission('jobs.manage'), reconcileJobController.triggerReconcile);
router.get('/logs', requirePermission('jobs.view'), ...validate(getLogsSchema), reconcileJobController.getLogs);

export default router;
