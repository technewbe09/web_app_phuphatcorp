-- ============================================================
-- Migration 041: Seed Route Pricing Permissions
-- Date: 2026-07-11
-- Module: route_pricing
-- ============================================================

INSERT INTO permissions (code, name, module, description) VALUES
  ('route_pricing.view',   'Xem giá theo tuyến',     'route_pricing', 'Xem tuyến, nhóm và bảng giá'),
  ('route_pricing.manage', 'Quản lý giá theo tuyến', 'route_pricing', 'CRUD tuyến/nhóm/giá và điều chỉnh %')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('route_pricing.view', 'route_pricing.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('route_pricing.view', 'route_pricing.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('route_pricing.view')
ON CONFLICT DO NOTHING;
