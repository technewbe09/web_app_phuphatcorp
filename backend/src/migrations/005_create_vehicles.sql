-- Migration: Create vehicles table
-- Date: 2026-04-06

CREATE TABLE IF NOT EXISTS vehicles (
  id         SERIAL       PRIMARY KEY,
  bien_so    VARCHAR(50)  NOT NULL,
  loai       VARCHAR(50)  NOT NULL,
  tai_xe     JSONB        NOT NULL DEFAULT '[]',
  status     VARCHAR(20)  NOT NULL DEFAULT 'active',
  start_date TIMESTAMP    NOT NULL DEFAULT NOW(),
  end_date   TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_bien_so        ON vehicles(bien_so);
CREATE INDEX IF NOT EXISTS idx_vehicles_status         ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_bien_so_status ON vehicles(bien_so, status);
