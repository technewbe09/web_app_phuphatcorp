-- Migration 006: Create dispatch_schedules table
-- Purpose: Store vehicle dispatch schedule records by date
-- Note: bien_so, tai_xe, ma_chuyen store TEXT values (not FK IDs)
--       because records are date-based historical data and masterdata can change

CREATE TABLE IF NOT EXISTS dispatch_schedules (
  id           SERIAL PRIMARY KEY,
  ngay         DATE NOT NULL,
  loai_xe      VARCHAR(10) NOT NULL CHECK (loai_xe IN ('Xe lớn', 'Xe nhỏ')),
  xe_type      VARCHAR(10) NOT NULL CHECK (xe_type IN ('Xe nhà', 'Xe ngoài')),

  -- Stored values (NOT FK) — snapshot at time of creation
  bien_so      VARCHAR(50) NOT NULL,
  tai_xe       TEXT,
  ma_chuyen    VARCHAR(100),

  -- Trip info
  diem_nhan    TEXT NOT NULL,
  diem_tra     TEXT NOT NULL,
  gio_nhan     TIME NOT NULL,
  ghi_chu      TEXT,

  -- Optional convenience references (nullable, non-blocking)
  vehicle_id   INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_code_id INTEGER REFERENCES trip_codes(id) ON DELETE SET NULL,

  -- Audit
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_ngay ON dispatch_schedules(ngay);
CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_ngay_loai ON dispatch_schedules(ngay, loai_xe);
