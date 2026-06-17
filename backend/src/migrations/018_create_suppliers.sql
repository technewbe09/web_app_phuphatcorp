-- ============================================================
-- Migration 018: Suppliers (Danh mục nhà cung cấp)
-- Date: 2026-06-17
-- Module: Quản lý danh mục
-- ============================================================

-- ============================================================
-- 1. Tạo bảng suppliers
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id              SERIAL PRIMARY KEY,
  supplier_code   VARCHAR(20) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  notes           TEXT,

  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'deactive')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code_active
  ON suppliers(supplier_code) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================
-- 3. Trigger auto-update updated_at
--    (reuse update_updated_at_column() từ migration 004)
-- ============================================================
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
