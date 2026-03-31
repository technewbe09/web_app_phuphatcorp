import { Router } from 'express';
import { usersController } from '../controllers/usersController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  paginationSchema,
  idParamSchema,
} from '../middleware/validators/userValidators';
import { UserRole } from '../types/user';

const router = Router();

// All routes require authentication + ADMIN role
router.use(authenticateToken);
router.use(authorizeRoles(UserRole.ADMIN));

// GET /users - List users with pagination/filter
router.get('/', ...validate(paginationSchema), usersController.getUsers);

// GET /users/:id - Get single user
router.get('/:id', ...validate(idParamSchema), usersController.getUserById);

// POST /users - Create new user
router.post('/', ...validate(createUserSchema), usersController.createUser);

// PUT /users/:id - Update user
router.put('/:id', ...validate([...idParamSchema, ...updateUserSchema]), usersController.updateUser);

// DELETE /users/:id - Delete user
router.delete('/:id', ...validate(idParamSchema), usersController.deleteUser);

// PATCH /users/:id/password - Reset password
router.patch('/:id/password', ...validate([...idParamSchema, ...resetPasswordSchema]), usersController.resetPassword);

export default router;
