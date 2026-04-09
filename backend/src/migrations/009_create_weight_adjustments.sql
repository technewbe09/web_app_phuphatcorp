-- ============================================================
-- Migration 009: Weight Adjustments (Điều chỉnh trọng lượng)
-- Date: 2026-04-07
-- Module: Quản lý dữ liệu kế toán
-- ============================================================

-- ============================================================
-- 1. Tạo bảng weight_adjustments
-- ============================================================
CREATE TABLE IF NOT EXISTS weight_adjustments (
  id                    SERIAL PRIMARY KEY,

  -- Business data
  ma_hang               VARCHAR(100) NOT NULL,
  ten_hang              VARCHAR(255) NOT NULL,
  gia_tri_cu            NUMERIC(15, 3),
  gia_tri_dieu_chinh    NUMERIC(15, 3) NOT NULL,

  -- Version management
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'deactive')),
  version               INTEGER NOT NULL DEFAULT 1,
  start_date            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date              TIMESTAMPTZ,

  -- Audit
  action_type           VARCHAR(20) NOT NULL DEFAULT 'create'
                          CHECK (action_type IN ('create', 'update', 'delete', 'upload')),
  action_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_by_name        VARCHAR(255),

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_weight_adjustments_ma_hang   ON weight_adjustments(ma_hang);
CREATE INDEX IF NOT EXISTS idx_weight_adjustments_status    ON weight_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_weight_adjustments_action_by ON weight_adjustments(action_by);

-- ============================================================
-- 3. Trigger auto-update updated_at
--    (reuse update_updated_at_column() từ migration 004)
-- ============================================================
DROP TRIGGER IF EXISTS update_weight_adjustments_updated_at ON weight_adjustments;
CREATE TRIGGER update_weight_adjustments_updated_at
  BEFORE UPDATE ON weight_adjustments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 4. Permissions: module accounting_data
-- ============================================================
INSERT INTO permissions (code, name, module, description) VALUES
  ('accounting_data.view',   'Xem dữ liệu kế toán',    'accounting_data', 'Xem danh sách điều chỉnh trọng lượng'),
  ('accounting_data.manage', 'Quản lý dữ liệu kế toán', 'accounting_data', 'Thêm, sửa, xóa, upload điều chỉnh trọng lượng')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 5. Role-Permissions
-- ============================================================

-- ADMIN: cả hai
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('accounting_data.view', 'accounting_data.manage')
ON CONFLICT DO NOTHING;

-- ACCOUNTANT: cả hai
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('accounting_data.view', 'accounting_data.manage')
ON CONFLICT DO NOTHING;

-- VIEWER: chỉ view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'VIEWER'
  AND p.code IN ('accounting_data.view')
ON CONFLICT DO NOTHING;
