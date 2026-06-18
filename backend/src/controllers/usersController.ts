import { Request, Response } from 'express';
import { userService, ServiceError } from '../services/userService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/user';
import { auditService } from '../services/auditService';

export const usersController = {
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, role, is_active, page, limit } = req.query;

      const params: Parameters<typeof userService.getUsers>[0] = {};
      if (search) params.search = search as string;
      if (role) params.role = role as UserRole;
      if (is_active !== undefined) params.is_active = is_active === 'true';
      if (page) params.page = parseInt(page as string, 10);
      if (limit) params.limit = parseInt(limit as string, 10);

      const result = await userService.getUsers(params);
      sendSuccess(res, result, 'Users retrieved');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to get users', 500, error);
    }
  },

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await userService.getUserById(id);
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }
      sendSuccess(res, user, 'User retrieved');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to get user', 500, error);
    }
  },

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, full_name, role, role_id, username } = req.body;
      const actorId = req.user!.userId;

      const user = await userService.createUser({
        email,
        password,
        full_name,
        role,
        role_id,
        username,
        created_by: actorId,
      });

      sendSuccess(res, user, 'User created successfully', 201);

      auditService.logAudit({
        userId: actorId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'user',
        entityId: user.id,
        entityLabel: user.username || user.email,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to create user', 500, error);
    }
  },

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { full_name, role, role_id, is_active, username } = req.body;
      const actorId = req.user!.userId;

      const user = await userService.updateUser(id, {
        full_name,
        role,
        role_id,
        is_active,
        username,
        updated_by: actorId,
        actor_id: actorId,
      });

      sendSuccess(res, user, 'User updated successfully');

      auditService.logAudit({
        userId: actorId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'user',
        entityId: id,
        entityLabel: user.username || user.email,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to update user', 500, error);
    }
  },

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const actorId = req.user!.userId;

      const targetUser = await userService.getUserById(id);
      await userService.deleteUser(id, actorId);
      sendSuccess(res, undefined, 'User deleted successfully');

      auditService.logAudit({
        userId: actorId,
        username: req.user!.email,
        action: 'DELETE',
        entityType: 'user',
        entityId: id,
        entityLabel: targetUser?.username || targetUser?.email || `User #${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to delete user', 500, error);
    }
  },

  async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { new_password } = req.body;

      await userService.resetPassword(id, new_password);
      sendSuccess(res, undefined, 'Password reset successfully');

      const targetUser = await userService.getUserById(id);
      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'user',
        entityId: id,
        entityLabel: targetUser?.username || targetUser?.email || `User #${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to reset password', 500, error);
    }
  },
};
