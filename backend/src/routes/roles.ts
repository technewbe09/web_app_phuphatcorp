import { Router } from 'express';
import { rolesController } from '../controllers/rolesController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createRoleSchema,
  updateRoleSchema,
  toggleRoleSchema,
  roleIdParamSchema,
} from '../middleware/validators/roleValidators';

const router = Router();

router.use(authenticateToken);

// GET /roles — list all roles (requires roles.view)
router.get('/', requirePermission('roles.view'), rolesController.getRoles);

// GET /roles/:id — get role with permissions
router.get('/:id', requirePermission('roles.view'), ...validate(roleIdParamSchema), rolesController.getRoleById);

// GET /roles/:id/users — get users assigned to role
router.get('/:id/users', requirePermission('roles.view'), ...validate(roleIdParamSchema), rolesController.getRoleUsers);

// POST /roles — create new role
router.post('/', requirePermission('roles.manage'), ...validate(createRoleSchema), rolesController.createRole);

// PUT /roles/:id — update role name/description
router.put('/:id', requirePermission('roles.manage'), ...validate(updateRoleSchema), rolesController.updateRole);

// PATCH /roles/:id/toggle — activate/deactivate role
router.patch('/:id/toggle', requirePermission('roles.manage'), ...validate(toggleRoleSchema), rolesController.toggleRole);

export default router;
