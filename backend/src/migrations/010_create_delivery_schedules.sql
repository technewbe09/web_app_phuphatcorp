-- Migration: Create delivery_schedules table
-- Created: 2026-04-18
-- Description: Bảng lưu lịch đi hàng upload từ file Excel

CREATE TABLE IF NOT EXISTS delivery_schedules (
  id                SERIAL PRIMARY KEY,
  ngay              DATE NOT NULL,
  stt               INTEGER NOT NULL,
  noi_giao          VARCHAR(255),
  tan               DECIMAL(10, 2),
  so_xe             VARCHAR(50),
  can_info          VARCHAR(255),
  ghi_chu           TEXT,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_delivery_schedules_ngay ON delivery_schedules(ngay);
CREATE INDEX idx_delivery_schedules_so_xe ON delivery_schedules(so_xe);
CREATE INDEX idx_delivery_schedules_created_by ON delivery_schedules(created_by);

-- Comments
COMMENT ON TABLE delivery_schedules IS 'Lịch đi hàng từ file Excel';
COMMENT ON COLUMN delivery_schedules.ngay IS 'Ngày đi hàng';
COMMENT ON COLUMN delivery_schedules.stt IS 'Số thứ tự';
COMMENT ON COLUMN delivery_schedules.noi_giao IS 'Nơi giao hàng';
COMMENT ON COLUMN delivery_schedules.tan IS 'Trọng lượng (tấn)';
COMMENT ON COLUMN delivery_schedules.so_xe IS 'Biển số xe (normalized)';
COMMENT ON COLUMN delivery_schedules.can_info IS 'Thông tin cân';
COMMENT ON COLUMN delivery_schedules.ghi_chu IS 'Ghi chú';
COMMENT ON COLUMN delivery_schedules.created_by IS 'User upload file';
