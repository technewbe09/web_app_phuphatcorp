-- ============================================================
-- Migration 031: Vehicle Inspection & Oil Change Records
-- Date: 2026-06-21
-- Module: Quản lý dữ liệu xe
-- Description: Bảng đăng kiểm (inspection_records),
--              ảnh đăng kiểm (inspection_images),
--              lịch sử thay nhớt (oil_change_records),
--              + cột oil_change_interval_km cho vehicles
-- ============================================================

-- ============================================================
-- 1. Inspection Records (Đăng kiểm)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_records (
  id              SERIAL PRIMARY KEY,
  vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id),
  inspection_date DATE NOT NULL,
  expiry_date     DATE NOT NULL,
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'superseded', 'deleted')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspection_records_vehicle
  ON inspection_records(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_inspection_records_expiry
  ON inspection_records(expiry_date);

CREATE INDEX IF NOT EXISTS idx_inspection_records_status
  ON inspection_records(status);

DROP TRIGGER IF EXISTS update_inspection_records_updated_at ON inspection_records;
CREATE TRIGGER update_inspection_records_updated_at
  BEFORE UPDATE ON inspection_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 2. Inspection Images (Ảnh đăng kiểm)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_images (
  id                SERIAL PRIMARY KEY,
  inspection_id     INTEGER NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
  filename          VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path         VARCHAR(500) NOT NULL,
  file_size         BIGINT,
  mime_type         VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspection_images_record
  ON inspection_images(inspection_id);

-- ============================================================
-- 3. Oil Change Records (Lịch sử thay nhớt)
-- ============================================================
CREATE TABLE IF NOT EXISTS oil_change_records (
  id              SERIAL PRIMARY KEY,
  vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id),
  change_date     DATE NOT NULL,
  odometer_at     NUMERIC(10,1) NOT NULL,
  oil_type        VARCHAR(100),
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'deleted')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oil_change_records_vehicle
  ON oil_change_records(vehicle_id, change_date);

DROP TRIGGER IF EXISTS update_oil_change_records_updated_at ON oil_change_records;
CREATE TRIGGER update_oil_change_records_updated_at
  BEFORE UPDATE ON oil_change_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 4. Alter vehicles — add oil_change_interval_km
-- ============================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS oil_change_interval_km INTEGER NOT NULL DEFAULT 5000;
