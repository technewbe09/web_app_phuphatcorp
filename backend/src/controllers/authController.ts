import { Request, Response } from 'express';
import { body, ValidationChain } from 'express-validator';
import { authService } from '../services/authService';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/user';

export const registerSchema: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
];

export const loginSchema: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, role } = req.body;

      const existing = await authService.findUserByEmail(email);
      if (existing) {
        sendError(res, 'Email already registered', 409);
        return;
      }

      const user = await authService.createUser({ email, password, full_name, role });
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, { user, accessToken }, 'Registration successful', 201);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Registration failed', 500, error);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await authService.findUserByEmail(email);
      if (!user) {
        sendError(res, 'Invalid credentials', 401);
        return;
      }

      const valid = authService.comparePassword(password, user.password_hash);
      if (!valid) {
        sendError(res, 'Invalid credentials', 401);
        return;
      }

      const userPublic = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      };

      const accessToken = generateAccessToken(userPublic);
      const refreshToken = generateRefreshToken(userPublic);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, { user: userPublic, accessToken }, 'Login successful');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Login failed', 500, error);
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        sendError(res, 'Refresh token required', 401);
        return;
      }

      const { verifyToken } = await import('../utils/jwt');
      const payload = verifyToken(refreshToken);

      const user = await authService.findUserById(payload.userId);
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed');
    } catch {
      sendError(res, 'Invalid refresh token', 403);
    }
  },

  logout(_req: Request, res: Response): void {
    res.clearCookie('refreshToken');
    sendSuccess(res, undefined, 'Logged out successfully');
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const user = await authService.findUserById(req.user.userId);
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      sendSuccess(res, user, 'User profile');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to get user', 500, error);
    }
  },
};
