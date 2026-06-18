import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { permissionService } from '../services/permissionService';
import { ServiceError } from '../services/roleService';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/auditService';

export const permissionsController = {
  async getPermissions(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await permissionService.getAllPermissions();
      sendSuccess(res, data, 'Permissions retrieved');
    } catch (err) {
      sendError(res, 'Failed to get permissions', 500, (err as Error).message);
    }
  },

  async getPermissionMatrix(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await permissionService.getPermissionMatrix();
      sendSuccess(res, data, 'Permission matrix retrieved');
    } catch (err) {
      sendError(res, 'Failed to get permission matrix', 500, (err as Error).message);
    }
  },

  async updateRolePermissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.roleId, 10);
      const { permission_ids } = req.body;
      await permissionService.updateRolePermissions(roleId, permission_ids);
      sendSuccess(res, undefined, 'Cập nhật quyền thành công');

      auditService.logAudit({
        userId: req.user!.userId,
        username: req.user!.email,
        action: 'UPDATE_PERMISSIONS',
        entityType: 'permission',
        entityId: roleId,
        entityLabel: `Role #${roleId}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      if (err instanceof ServiceError) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
      }
      sendError(res, 'Failed to update permissions', 500, (err as Error).message);
    }
  },
};
