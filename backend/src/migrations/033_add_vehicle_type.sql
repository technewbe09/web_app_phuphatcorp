-- ============================================================
-- Migration 033: Add vehicle_type to vehicles
-- Date: 2026-07-14
-- Module: Quản lý danh mục
-- Description: Phân loại xe — 'Xe nhà' | 'Xe ngoài'
-- ============================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(10) NOT NULL DEFAULT 'Xe nhà'
  CHECK (vehicle_type IN ('Xe nhà', 'Xe ngoài'));

CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
