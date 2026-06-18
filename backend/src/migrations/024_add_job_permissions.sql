-- ============================================================
-- Migration 024: Add job management permissions
-- Date: 2026-06-18
-- Mô tả: Thêm permissions jobs.view / jobs.manage cho section "Quản lý Job"
-- ============================================================

-- ============================================================
-- 1. Thêm permissions mới
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('jobs.view',   'Xem cấu hình Job',     'jobs', 'Xem cấu hình job đối chiếu và lịch sử chạy'),
  ('jobs.manage', 'Quản lý cấu hình Job', 'jobs', 'Tạo, sửa, xóa cấu hình job, chạy thủ công')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ADMIN: toàn bộ permissions mới
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('jobs.view', 'jobs.manage')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. ACCOUNTANT: jobs full
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('jobs.view', 'jobs.manage')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. VIEWER: jobs view only
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code = 'jobs.view'
ON CONFLICT DO NOTHING;
