-- ============================================================
-- Migration 021: Add missing permissions (accounting_data, catalog)
-- Date: 2026-06-17
-- Mô tả: Bổ sung permissions accounting_data.* và catalog.*
--         đang được dùng trong code nhưng chưa có trong DB seed
-- ============================================================

-- ============================================================
-- 1. Thêm permissions mới
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('accounting_data.view',   'Xem dữ liệu kế toán',        'accounting_data', 'Xem danh sách khách hàng, hoá đơn, điều chỉnh trọng lượng, đối chiếu'),
  ('accounting_data.manage', 'Quản lý dữ liệu kế toán',    'accounting_data', 'Tạo, sửa, xóa, upload dữ liệu kế toán'),
  ('catalog.view',           'Xem danh mục',                'catalog',         'Xem danh sách phương tiện, nhà cung cấp'),
  ('catalog.manage',         'Quản lý danh mục',            'catalog',         'Thêm, sửa, xóa, upload danh mục phương tiện, nhà cung cấp')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ADMIN: toàn bộ permissions mới
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('accounting_data.view', 'accounting_data.manage', 'catalog.view', 'catalog.manage')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. ACCOUNTANT: accounting_data full + catalog view
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('accounting_data.view', 'accounting_data.manage', 'catalog.view')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. VIEWER: chỉ view
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('accounting_data.view', 'catalog.view')
ON CONFLICT DO NOTHING;
