-- ============================================================
-- Migration 038: Performance — composite index cho repair_records
-- Date: 2026-07-21
-- Description: Thêm composite index (vehicle_id, repair_date DESC)
--              để tối ưu DISTINCT ON trong getSummary query
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_repair_records_vehicle_date
  ON repair_records(vehicle_id, repair_date DESC)
  WHERE status = 'active';
