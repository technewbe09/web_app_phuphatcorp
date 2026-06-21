-- ============================================================
-- Migration 029: Seed Fuel Management Permissions
-- Date: 2026-06-21
-- Module: Quản lý dữ liệu dầu
-- ============================================================

-- ============================================================
-- 1. Permissions: module fuel
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('fuel.view',   'Xem dữ liệu dầu',    'fuel', 'Xem danh sách và thống kê dữ liệu dầu'),
  ('fuel.manage', 'Quản lý dữ liệu dầu', 'fuel', 'Thêm, sửa, xóa, upload dữ liệu dầu')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. Role-Permissions
-- ============================================================

-- ADMIN: cả hai
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('fuel.view', 'fuel.manage')
ON CONFLICT DO NOTHING;

-- ACCOUNTANT: cả hai
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('fuel.view', 'fuel.manage')
ON CONFLICT DO NOTHING;

-- VIEWER: chỉ view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('fuel.view')
ON CONFLICT DO NOTHING;
