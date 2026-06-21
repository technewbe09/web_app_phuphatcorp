-- ============================================================
-- Migration 028: Fuel Records (Quản lý dữ liệu dầu)
-- Date: 2026-06-21
-- Module: Quản lý dữ liệu dầu
-- Description: Lưu trữ dữ liệu đổ dầu của từng xe,
--              đối chiếu số thực tế (tài xế ghi) vs GPS
-- ============================================================

-- ============================================================
-- 1. Tạo bảng fuel_records
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_records (
  id            SERIAL PRIMARY KEY,

  -- Foreign key to vehicles
  vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id),

  -- Date of fuel fill-up
  record_date   DATE NOT NULL,

  -- Manual records (tài xế ghi / thực tế)
  odometer_old  NUMERIC(10,1) NOT NULL,
  odometer_new  NUMERIC(10,1) NOT NULL,
  distance      NUMERIC(10,1) NOT NULL,        -- odometer_new - odometer_old
  liters        NUMERIC(10,2) NOT NULL,
  fuel_rate     NUMERIC(14,6),                 -- L/100km: liters * 100 / distance

  -- GPS tracking records (định vị)
  gps_old       NUMERIC(10,1),
  gps_new       NUMERIC(10,1),
  gps_distance  NUMERIC(10,1),                 -- gps_new - gps_old
  gps_liters    NUMERIC(10,2),
  gps_fuel_rate NUMERIC(14,6),                 -- GPS L/100km

  -- Financial
  unit_price    NUMERIC(10,2) NOT NULL,
  total_cost    NUMERIC(15,2) NOT NULL,        -- liters * unit_price

  -- Metadata
  batch_id      VARCHAR(50),
  notes         TEXT,

  -- Audit
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_date
  ON fuel_records(vehicle_id, record_date);

CREATE INDEX IF NOT EXISTS idx_fuel_records_date
  ON fuel_records(record_date);

CREATE INDEX IF NOT EXISTS idx_fuel_records_batch
  ON fuel_records(batch_id);

-- ============================================================
-- 3. Trigger auto-update updated_at
-- ============================================================
DROP TRIGGER IF EXISTS update_fuel_records_updated_at ON fuel_records;
CREATE TRIGGER update_fuel_records_updated_at
  BEFORE UPDATE ON fuel_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
