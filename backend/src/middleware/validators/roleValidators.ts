import { body, param, ValidationChain } from 'express-validator';

export const createRoleSchema: ValidationChain[] = [
  body('name')
    .notEmpty().withMessage('Tên vai trò là bắt buộc')
    .isLength({ min: 2 }).withMessage('Tên vai trò tối thiểu 2 ký tự')
    .isLength({ max: 100 }).withMessage('Tên vai trò tối đa 100 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Mô tả tối đa 500 ký tự'),
];

export const updateRoleSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID phải là số nguyên lớn hơn 0'),
  body('name')
    .notEmpty().withMessage('Tên vai trò là bắt buộc')
    .isLength({ min: 2 }).withMessage('Tên vai trò tối thiểu 2 ký tự')
    .isLength({ max: 100 }).withMessage('Tên vai trò tối đa 100 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Mô tả tối đa 500 ký tự'),
];

export const toggleRoleSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID phải là số nguyên lớn hơn 0'),
  body('is_active').isBoolean().withMessage('is_active phải là boolean'),
];

export const roleIdParamSchema: ValidationChain[] = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID phải là số nguyên lớn hơn 0'),
];
