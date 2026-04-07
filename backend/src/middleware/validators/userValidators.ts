import { body, query, param, ValidationChain } from 'express-validator';
import { UserRole } from '../../types/user';

export const createUserSchema: ValidationChain[] = [
  body('full_name').notEmpty().withMessage('Họ tên là bắt buộc'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  // Support both legacy role (string) and new role_id (number)
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Vai trò không hợp lệ'),
  body('role_id')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('role_id phải là số nguyên dương'),
];

export const updateUserSchema: ValidationChain[] = [
  body('full_name').optional().notEmpty().withMessage('Họ tên không được để trống'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Vai trò không hợp lệ'),
  body('role_id')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('role_id phải là số nguyên dương'),
  body('is_active').optional().isBoolean().withMessage('Trạng thái không hợp lệ'),
];

export const resetPasswordSchema: ValidationChain[] = [
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
];

export const paginationSchema: ValidationChain[] = [
  query('search').optional().isString(),
  query('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Vai trò không hợp lệ'),
  query('is_active').optional().isBoolean(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Trang phải là số nguyên lớn hơn 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Số bản ghi phải từ 1 đến 100'),
];

export const idParamSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID phải là số nguyên lớn hơn 0'),
];
