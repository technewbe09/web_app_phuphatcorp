-- ============================================================
-- Migration 033: VN provinces + wards master (2-tier)
-- Source: https://github.com/thanglequoc/vietnamese-provinces-database
-- Data load: run `npx tsx src/scripts/import-vn-provinces.ts` after migrate
--   (or embedded seed if data file present)
-- ============================================================

CREATE TABLE IF NOT EXISTS provinces (
  code                     VARCHAR(20) PRIMARY KEY,
  name                     VARCHAR(255) NOT NULL,
  full_name                VARCHAR(255),
  code_name                VARCHAR(255),
  administrative_unit_id   INTEGER
);

CREATE TABLE IF NOT EXISTS wards (
  code                     VARCHAR(20) PRIMARY KEY,
  name                     VARCHAR(255) NOT NULL,
  full_name                VARCHAR(255),
  code_name                VARCHAR(255),
  province_code            VARCHAR(20) NOT NULL REFERENCES provinces(code),
  administrative_unit_id   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_wards_province ON wards(province_code);
CREATE INDEX IF NOT EXISTS idx_provinces_name ON provinces(name);
CREATE INDEX IF NOT EXISTS idx_wards_name ON wards(name);
