-- ============================================================
-- Migration 004: Roles, Permissions, Role-Permissions
-- Date: 2026-04-06
-- ============================================================

-- ============================================================
-- 1. Tạo bảng roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(50)  UNIQUE NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. Tạo bảng permissions (predefined, không thêm qua UI)
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(100) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  module      VARCHAR(50)  NOT NULL,
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. Tạo bảng role_permissions (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 4. Thêm cột role_id vào users (giữ cột role cũ để backward compat)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- ============================================================
-- 5. Seed: Roles mặc định
-- ============================================================
INSERT INTO roles (name, code, description, is_active, is_system) VALUES
  ('Administrator', 'ADMIN',      'Vai trò quản trị cao nhất, toàn quyền hệ thống', TRUE, TRUE),
  ('Accountant',    'ACCOUNTANT', 'Kế toán viên',              TRUE, TRUE),
  ('Viewer',        'VIEWER',     'Người xem báo cáo',          TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 6. Seed: Permissions
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('dashboard.view',       'Xem Dashboard',                 'dashboard',     'Xem trang dashboard tổng quan'),
  ('delivery_data.view',   'Xem dữ liệu giao hàng',         'delivery_data', 'Xem danh sách và chi tiết dữ liệu giao hàng'),
  ('delivery_data.manage', 'Quản lý dữ liệu giao hàng',     'delivery_data', 'Tải lên và xử lý file dữ liệu giao hàng'),
  ('reports.view',         'Xem báo cáo',                   'reports',       'Xem trang báo cáo'),
  ('users.view',           'Xem danh sách người dùng',      'users',         'Xem danh sách và chi tiết người dùng'),
  ('users.manage',         'Quản lý người dùng',            'users',         'Tạo, sửa, deactivate và reset mật khẩu người dùng'),
  ('roles.view',           'Xem danh sách vai trò',         'roles',         'Xem danh sách vai trò'),
  ('roles.manage',         'Quản lý vai trò',               'roles',         'Tạo, sửa, activate/deactivate vai trò'),
  ('permissions.manage',   'Quản lý quyền',                 'permissions',   'Cấu hình quyền cho các vai trò')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7. Seed: Role-Permission defaults
-- ============================================================

-- ADMIN: toàn bộ quyền
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ACCOUNTANT: dashboard, delivery_data, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN (
    'dashboard.view',
    'delivery_data.view',
    'delivery_data.manage',
    'reports.view'
  )
ON CONFLICT DO NOTHING;

-- VIEWER: dashboard, delivery_data read-only, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN (
    'dashboard.view',
    'delivery_data.view',
    'reports.view'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. Data migration: gán role_id cho users hiện tại từ cột role
-- ============================================================
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role = r.code
  AND u.role_id IS NULL;

-- ============================================================
-- 9. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id       ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id                  ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_code                     ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_is_active                ON roles(is_active);

-- ============================================================
-- 10. Trigger: auto-update updated_at cho roles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
