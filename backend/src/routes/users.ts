import { Router } from 'express';
import { usersController } from '../controllers/usersController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  paginationSchema,
  idParamSchema,
} from '../middleware/validators/userValidators';

const router = Router();

router.use(authenticateToken);

// GET /users - List users (requires users.view)
router.get('/', requirePermission('users.view'), ...validate(paginationSchema), usersController.getUsers);

// GET /users/:id - Get single user (requires users.view)
router.get('/:id', requirePermission('users.view'), ...validate(idParamSchema), usersController.getUserById);

// POST /users - Create new user (requires users.manage)
router.post('/', requirePermission('users.manage'), ...validate(createUserSchema), usersController.createUser);

// PUT /users/:id - Update user (requires users.manage)
router.put('/:id', requirePermission('users.manage'), ...validate([...idParamSchema, ...updateUserSchema]), usersController.updateUser);

// DELETE /users/:id - Delete user (requires users.manage)
router.delete('/:id', requirePermission('users.manage'), ...validate(idParamSchema), usersController.deleteUser);

// PATCH /users/:id/password - Reset password (requires users.manage)
router.patch('/:id/password', requirePermission('users.manage'), ...validate([...idParamSchema, ...resetPasswordSchema]), usersController.resetPassword);

export default router;
