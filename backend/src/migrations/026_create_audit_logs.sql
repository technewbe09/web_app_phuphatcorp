-- ============================================================
-- Migration 026: Create audit log tables (access_logs + audit_logs)
-- Date: 2026-06-18
-- Mô tả: Hệ thống audit log 2 tầng:
--   - access_logs:  ghi nhận mọi POST/PUT/DELETE/PATCH (HTTP-level)
--   - audit_logs:   ghi nhận thao tác nghiệp vụ (Business-level)
-- ============================================================

-- ============================================================
-- 1. Bảng access_logs (HTTP request logging)
-- ============================================================
CREATE TABLE IF NOT EXISTS access_logs (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  method            VARCHAR(10) NOT NULL,
  path              VARCHAR(500) NOT NULL,
  status_code       SMALLINT NOT NULL,
  ip_address        VARCHAR(45),
  user_agent        TEXT,
  response_time_ms  INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id     ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at   ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_method       ON access_logs(method);
CREATE INDEX IF NOT EXISTS idx_access_logs_status_code  ON access_logs(status_code);

-- ============================================================
-- 2. Bảng audit_logs (Business event logging)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username          VARCHAR(100),
  action            VARCHAR(50) NOT NULL,
  entity_type       VARCHAR(50) NOT NULL,
  entity_id         INTEGER,
  entity_label      VARCHAR(255),
  details           JSONB,
  ip_address        VARCHAR(45),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type  ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity       ON audit_logs(entity_type, entity_id);

-- ============================================================
-- 3. Seed permission: logs.view
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('logs.view', 'Xem nhật ký hệ thống', 'logs', 'Xem nhật ký truy cập và nhật ký thao tác của người dùng')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. Gán permission cho ADMIN (toàn quyền)
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code = 'logs.view'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Gán permission cho ACCOUNTANT
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code = 'logs.view'
ON CONFLICT DO NOTHING;
