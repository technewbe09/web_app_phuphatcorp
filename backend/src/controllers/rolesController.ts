import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { roleService } from '../services/roleService';
import { ServiceError } from '../services/roleService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';

export const rolesController = {
  async getRoles(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const roles = await roleService.getRoles();
      sendSuccess(res, { roles }, 'Roles retrieved');
    } catch (err) {
      sendError(res, 'Failed to get roles', 500, (err as Error).message);
    }
  },

  async getRoleById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const role = await roleService.getRoleById(id);
      if (!role) {
        sendError(res, 'Vai trò không tồn tại', 404);
        return;
      }
      sendSuccess(res, { role }, 'Role retrieved');
    } catch (err) {
      sendError(res, 'Failed to get role', 500, (err as Error).message);
    }
  },

  async createRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      const role = await roleService.createRole({ name, description });
      sendSuccess(res, { role }, 'Thêm vai trò thành công', 201);

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'CREATE',
        entityType: 'role',
        entityId: role.id,
        entityLabel: role.name,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      sendError(res, 'Failed to create role', 500, (err as Error).message);
    }
  },

  async updateRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, description } = req.body;
      const role = await roleService.updateRole(id, { name, description });
      sendSuccess(res, { role }, 'Cập nhật vai trò thành công');

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE',
        entityType: 'role',
        entityId: id,
        entityLabel: role.name,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      sendError(res, 'Failed to update role', 500, (err as Error).message);
    }
  },

  async toggleRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { is_active } = req.body;
      const result = await roleService.toggleRoleActive(id, is_active);
      const message = is_active ? 'Activate vai trò thành công' : 'Deactivate vai trò thành công';
      sendSuccess(res, result, message);

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'TOGGLE',
        entityType: 'role',
        entityId: id,
        entityLabel: result.role?.name || `Role #${id}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      sendError(res, 'Failed to toggle role', 500, (err as Error).message);
    }
  },

  async getRoleUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await roleService.getRoleUsers(id);
      sendSuccess(res, result, 'Role users retrieved');
    } catch (err) {
      sendError(res, 'Failed to get role users', 500, (err as Error).message);
    }
  },
};
