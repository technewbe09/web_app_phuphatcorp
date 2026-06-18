import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { auditController } from '../controllers/auditController';

const router = Router();

router.use(authenticateToken);
router.use(auditMiddleware);

router.get('/access', requirePermission('logs.view'), auditController.getAccessLogs);
router.get('/audit', requirePermission('logs.view'), auditController.getAuditLogs);

export default router;
