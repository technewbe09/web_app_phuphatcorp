-- Migration: 006_create_drivers.sql
-- Creates drivers and driver_documents tables

CREATE TABLE IF NOT EXISTS drivers (
  id          SERIAL       PRIMARY KEY,
  ten_ky_hieu VARCHAR(100) NOT NULL UNIQUE,
  ho_ten      VARCHAR(255),
  lien_he     VARCHAR(100),
  cccd        VARCHAR(50),
  ghi_chu     TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status      ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_ten_ky_hieu ON drivers(ten_ky_hieu);

CREATE TABLE IF NOT EXISTS driver_documents (
  id         SERIAL       PRIMARY KEY,
  driver_id  INTEGER      NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  file_name  VARCHAR(255) NOT NULL,
  mime_type  VARCHAR(100),
  file_data  TEXT         NOT NULL,
  file_size  INTEGER,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
