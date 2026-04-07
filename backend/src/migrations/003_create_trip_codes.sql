-- Migration: 003_create_trip_codes.sql
-- Description: Tạo bảng trip_codes cho masterdata Mã chuyến

CREATE TABLE IF NOT EXISTS trip_codes (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR(255) NOT NULL,
  tuyen       VARCHAR(255) NOT NULL,
  so_tien     DECIMAL(15, 2),
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  start_date  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date    TIMESTAMP,
  boc_xep     VARCHAR(500),
  ghi_chu     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Note: ma is NOT unique at DB level.
-- Uniqueness (among active rows) is enforced at the application layer.

CREATE INDEX IF NOT EXISTS idx_trip_codes_ma ON trip_codes(ma);
CREATE INDEX IF NOT EXISTS idx_trip_codes_status ON trip_codes(status);
CREATE INDEX IF NOT EXISTS idx_trip_codes_ma_status ON trip_codes(ma, status);
