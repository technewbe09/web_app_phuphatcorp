-- ============================================================
-- Migration 017: Vehicles (Danh mục xe)
-- Date: 2026-06-16
-- Module: Quản lý danh mục
-- Note: plate_number format = XXYXXXXX (e.g. 50H70216), no dash,
--       aligned with driver_invoices.so_xe normalization
-- ============================================================

-- ============================================================
-- 1. Tạo bảng vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id            SERIAL PRIMARY KEY,
  plate_number  VARCHAR(20) NOT NULL,
  driver_name   VARCHAR(255) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'deactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate_number_active
  ON vehicles(plate_number) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_name ON vehicles(driver_name);

-- ============================================================
-- 3. Trigger auto-update updated_at
--    (reuse update_updated_at_column() từ migration 004)
-- ============================================================
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
