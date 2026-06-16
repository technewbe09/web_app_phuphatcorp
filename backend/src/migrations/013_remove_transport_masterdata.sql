-- Migration 013: Remove transport masterdata tables and dispatch schedule columns
-- Purpose: Remove "Mã chuyến", "Dữ liệu xe", "Thông tin tài xế" features
--          Clean up referencing columns in dispatch_schedules

-- Remove FK columns and text columns from dispatch_schedules
ALTER TABLE dispatch_schedules DROP COLUMN IF EXISTS vehicle_id;
ALTER TABLE dispatch_schedules DROP COLUMN IF EXISTS trip_code_id;
ALTER TABLE dispatch_schedules DROP COLUMN IF EXISTS bien_so;
ALTER TABLE dispatch_schedules DROP COLUMN IF EXISTS tai_xe;
ALTER TABLE dispatch_schedules DROP COLUMN IF EXISTS ma_chuyen;

-- Drop tables (child tables first due to FK)
DROP TABLE IF EXISTS driver_documents CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS trip_codes CASCADE;
