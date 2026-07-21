-- ============================================================
-- Migration 037: Repair Images (Ảnh sửa xe)
-- Date: 2026-07-21
-- Module: Quản lý dữ liệu xe
-- Description: Bảng lưu ảnh đính kèm cho mỗi bill sửa xe
-- ============================================================

CREATE TABLE IF NOT EXISTS repair_images (
  id                SERIAL PRIMARY KEY,
  repair_id         INTEGER NOT NULL REFERENCES repair_records(id) ON DELETE CASCADE,
  filename          VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path         VARCHAR(500) NOT NULL,
  file_size         BIGINT,
  mime_type         VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repair_images_repair
  ON repair_images(repair_id);
