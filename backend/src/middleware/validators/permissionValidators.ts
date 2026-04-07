import { body, param, ValidationChain } from 'express-validator';

export const updateRolePermissionsSchema: ValidationChain[] = [
  param('roleId').isInt({ min: 1 }).toInt().withMessage('roleId phải là số nguyên lớn hơn 0'),
  body('permission_ids')
    .isArray().withMessage('permission_ids phải là mảng')
    .custom((arr: unknown[]) => arr.every((id) => Number.isInteger(id) && (id as number) > 0))
    .withMessage('Mỗi permission_id phải là số nguyên dương'),
];
