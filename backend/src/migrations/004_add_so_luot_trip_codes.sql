-- Migration: Add so_luot column to trip_codes
-- Date: 2026-04-06

ALTER TABLE trip_codes
  ADD COLUMN IF NOT EXISTS so_luot INTEGER NOT NULL DEFAULT 1;
