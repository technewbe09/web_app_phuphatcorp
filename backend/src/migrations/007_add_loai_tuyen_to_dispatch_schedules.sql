-- Migration 007: Add loai_tuyen column to dispatch_schedules
-- loai_tuyen distinguishes fixed routes ('Tuyến cố định') from outside routes ('Tuyến ngoài')
-- Existing rows default to 'Tuyến cố định' to preserve current behavior

ALTER TABLE dispatch_schedules
  ADD COLUMN IF NOT EXISTS loai_tuyen VARCHAR(20) NOT NULL DEFAULT 'Tuyến cố định'
  CHECK (loai_tuyen IN ('Tuyến cố định', 'Tuyến ngoài'));
