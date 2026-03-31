import { Router } from 'express';
import { authController, registerSchema, loginSchema } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', ...validate(registerSchema), authController.register);
router.post('/login', ...validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);

export default router;
