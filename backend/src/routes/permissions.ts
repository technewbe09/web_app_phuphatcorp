import { Router } from 'express';
import { permissionsController } from '../controllers/permissionsController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateRolePermissionsSchema } from '../middleware/validators/permissionValidators';

const router = Router();

router.use(authenticateToken);
router.use(requirePermission('permissions.manage'));

// GET /permissions — list all permissions grouped by module
router.get('/', permissionsController.getPermissions);

// GET /permissions/matrix — full role × permission matrix
router.get('/matrix', permissionsController.getPermissionMatrix);

// PUT /permissions/role/:roleId — update permissions for a role
router.put('/role/:roleId', ...validate(updateRolePermissionsSchema), permissionsController.updateRolePermissions);

export default router;
