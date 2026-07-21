-- ============================================================
-- Migration 034: Vehicle Insurance Records
-- Date: 2026-07-21
-- Module: Quản lý dữ liệu xe
-- Description: Bảng bảo hiểm (insurance_records),
--              ảnh/file bảo hiểm (insurance_images)
-- ============================================================

-- ============================================================
-- 1. Insurance Records (Bảo hiểm)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_records (
  id              SERIAL PRIMARY KEY,
  vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id),
  purchase_date   DATE NOT NULL,
  expiry_date     DATE NOT NULL,
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'superseded', 'deleted')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insurance_records_vehicle
  ON insurance_records(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_insurance_records_expiry
  ON insurance_records(expiry_date);

CREATE INDEX IF NOT EXISTS idx_insurance_records_status
  ON insurance_records(status);

DROP TRIGGER IF EXISTS update_insurance_records_updated_at ON insurance_records;
CREATE TRIGGER update_insurance_records_updated_at
  BEFORE UPDATE ON insurance_records
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 2. Insurance Images (Ảnh/file bảo hiểm)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_images (
  id                SERIAL PRIMARY KEY,
  insurance_id      INTEGER NOT NULL REFERENCES insurance_records(id) ON DELETE CASCADE,
  filename          VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path         VARCHAR(500) NOT NULL,
  file_size         BIGINT,
  mime_type         VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insurance_images_record
  ON insurance_images(insurance_id);
