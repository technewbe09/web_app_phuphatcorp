-- ============================================================
-- Migration 036: Vehicle Repair Records (Lịch sử sửa xe)
-- Date: 2026-07-21
-- Module: Quản lý dữ liệu xe
-- Description: Bảng repair_records (bill sửa xe),
--              bảng repair_items (hạng mục sửa chữa)
-- ============================================================

-- ============================================================
-- 1. Repair Records (Bill sửa xe)
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_records (
  id              SERIAL PRIMARY KEY,
  vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id),
  repair_date     DATE NOT NULL,
  garage_name     VARCHAR(255) NOT NULL,
  total_amount    BIGINT NOT NULL DEFAULT 0,
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'deleted')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repair_records_vehicle
  ON repair_records(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_repair_records_date
  ON repair_records(repair_date DESC);

CREATE INDEX IF NOT EXISTS idx_repair_records_status
  ON repair_records(status);

DROP TRIGGER IF EXISTS update_repair_records_updated_at ON repair_records;
CREATE TRIGGER update_repair_records_updated_at
  BEFORE UPDATE ON repair_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 2. Repair Items (Hạng mục sửa chữa)
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_items (
  id              SERIAL PRIMARY KEY,
  repair_id       INTEGER NOT NULL REFERENCES repair_records(id) ON DELETE CASCADE,
  item_name       VARCHAR(255) NOT NULL,
  parts_cost      BIGINT NOT NULL DEFAULT 0,
  labor_cost      BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repair_items_repair
  ON repair_items(repair_id);
