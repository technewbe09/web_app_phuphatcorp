-- ============================================================
-- Migration 035: Add unique constraint on fuel_records (vehicle_id, record_date)
-- Date: 2026-06-21
-- Purpose: Enable UPSERT to avoid deleting existing data on upload
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_fuel_records_vehicle_date'
  ) THEN
    ALTER TABLE fuel_records
    ADD CONSTRAINT uq_fuel_records_vehicle_date
    UNIQUE (vehicle_id, record_date);
  END IF;
END $$;
