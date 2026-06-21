-- ============================================================
-- Migration 032: Seed Vehicle Data Permissions
-- Date: 2026-06-21
-- Module: Quản lý dữ liệu xe
-- ============================================================

-- ============================================================
-- 1. Permissions: module vehicle_data
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('vehicle_data.view',   'Xem dữ liệu xe',     'vehicle_data', 'Xem đăng kiểm và lịch sử thay nhớt'),
  ('vehicle_data.manage', 'Quản lý dữ liệu xe', 'vehicle_data', 'Thêm, sửa, xóa đăng kiểm, thay nhớt và cấu hình ngưỡng km')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. Role-Permissions
-- ============================================================

-- ADMIN: cả hai
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('vehicle_data.view', 'vehicle_data.manage')
ON CONFLICT DO NOTHING;

-- ACCOUNTANT: cả hai
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('vehicle_data.view', 'vehicle_data.manage')
ON CONFLICT DO NOTHING;

-- VIEWER: chỉ view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('vehicle_data.view')
ON CONFLICT DO NOTHING;
