-- ============================================================
-- Migration 034: Add location to fuel_records
-- Date: 2026-06-21
-- Module: Quản lý dữ liệu dầu
-- Description: Thêm trường location để lưu vị trí đổ dầu
-- ============================================================

ALTER TABLE fuel_records
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_fuel_records_location ON fuel_records(location);
