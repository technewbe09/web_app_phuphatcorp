-- Migration: Add loai column to delivery_schedules
-- Created: 2026-04-18
-- Description: Phân loại "Giá tấn" (cột A-F) và "Giá chuyến" (cột G-L)

ALTER TABLE delivery_schedules
ADD COLUMN IF NOT EXISTS loai VARCHAR(20);

-- Add comment
COMMENT ON COLUMN delivery_schedules.loai IS 'Loại giá: "Giá tấn" (cột A-F) hoặc "Giá chuyến" (cột G-L)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_loai ON delivery_schedules(loai);
