-- ============================================================
-- Migration 007: Transport & Dispatch Permissions
-- Date: 2026-04-07
-- Mô tả: Thêm permissions cho module Vận tải (trip codes,
--         phương tiện, tài xế) và Điều hành vận tải (dispatch)
-- ============================================================

-- ============================================================
-- 1. Thêm permissions mới
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('transport.view',   'Xem dữ liệu vận tải',    'transport', 'Xem danh sách mã chuyến, phương tiện, tài xế'),
  ('transport.manage', 'Quản lý dữ liệu vận tải', 'transport', 'Tạo, sửa, xóa mã chuyến, phương tiện, tài xế'),
  ('dispatch.view',    'Xem bảng điều phối',      'dispatch',  'Xem lịch điều phối xe theo ngày'),
  ('dispatch.manage',  'Điều phối xe',             'dispatch',  'Tạo và xóa lịch điều phối xe')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ADMIN: thêm đủ 4 permissions mới
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('transport.view', 'transport.manage', 'dispatch.view', 'dispatch.manage')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. ACCOUNTANT: toàn bộ 4 permissions
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('transport.view', 'transport.manage', 'dispatch.view', 'dispatch.manage')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. VIEWER: chỉ view (không manage)
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('transport.view', 'dispatch.view')
ON CONFLICT DO NOTHING;
