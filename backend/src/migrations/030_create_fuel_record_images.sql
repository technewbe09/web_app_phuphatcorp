-- ============================================================
-- Migration 030: Fuel Record Images (Ảnh căn cứ đổ dầu)
-- Date: 2026-06-21
-- Module: Quản lý dữ liệu dầu
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_record_images (
  id                SERIAL PRIMARY KEY,
  fuel_record_id    INTEGER NOT NULL REFERENCES fuel_records(id) ON DELETE CASCADE,
  filename          VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path         VARCHAR(500) NOT NULL,
  file_size         BIGINT,
  mime_type         VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_record_images_record
  ON fuel_record_images(fuel_record_id);
