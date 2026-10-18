-- ============================================================
-- Migration 057: Register vehicle_data Feature Scope & Data Scope Configs
-- Date: 2026-10-14
-- Module: vehicle_data
-- Description: Register vehicle_data in feature_scopes and configure default scopes for roles
-- ============================================================

-- 1. Register feature_scope for vehicle_data
INSERT INTO feature_scopes (feature_code, feature_name, module, allowed_scope_types, entity_types)
VALUES (
  'vehicle_data',
  'Dữ liệu & Bảo trì xe',
  'vehicle_data',
  ARRAY['all', 'entity', 'none'],
  ARRAY['vehicle']
)
ON CONFLICT (feature_code) DO UPDATE SET
  allowed_scope_types = EXCLUDED.allowed_scope_types,
  entity_types = EXCLUDED.entity_types,
  is_active = TRUE;

-- 2. Seed default role_scope_configs for vehicle_data
INSERT INTO role_scope_configs (feature_code, role_id, scope_type)
SELECT 'vehicle_data', r.id,
  CASE
    WHEN r.code = 'ADMIN' THEN 'all'
    WHEN r.code = 'ACCOUNTANT' THEN 'all'
    WHEN r.code = 'TAI_XE' THEN 'entity'
    ELSE 'none'
  END
FROM roles r
ON CONFLICT (feature_code, role_id) DO UPDATE SET
  scope_type = EXCLUDED.scope_type;

-- 3. Ensure TAI_XE role has vehicle_data.view permission
INSERT INTO permissions (code, name, module, description)
VALUES ('vehicle_data.view', 'Xem dữ liệu xe', 'vehicle_data', 'Xem thông tin xe, bảo hiểm, đăng kiểm, thay nhớt')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'TAI_XE'
  AND p.code = 'vehicle_data.view'
ON CONFLICT DO NOTHING;
