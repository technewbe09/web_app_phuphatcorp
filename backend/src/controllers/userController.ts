import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { pool } from '../config/database';
import { UserPublic, UserRole } from '../types/user';

export const userController = {
  async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query<UserPublic>(
        'SELECT id, email, full_name, role FROM users ORDER BY id ASC',
      );
      sendSuccess(res, result.rows, 'Users retrieved');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to get users', 500, error);
    }
  },

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query<UserPublic>(
        'SELECT id, email, full_name, role FROM users WHERE id = $1',
        [id],
      );
      if (result.rows.length === 0) {
        sendError(res, 'User not found', 404);
        return;
      }
      sendSuccess(res, result.rows[0], 'User retrieved');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      sendError(res, 'Failed to get user', 500, error);
    }
  },
};
