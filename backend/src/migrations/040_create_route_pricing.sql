-- ============================================================
-- Migration 040: Route Pricing schema (final)
-- Merges former 034 + 036 + 037 + 038 into one create migration.
-- Date: 2026-07-24
-- Module: route_pricing
-- ============================================================

-- 1) Tuyến đường — mỗi NCC có danh sách riêng
--    ward_code XOR location_text; optional note
CREATE TABLE IF NOT EXISTS delivery_routes (
  id              SERIAL PRIMARY KEY,
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id),
  province_code   VARCHAR(20) NOT NULL REFERENCES provinces(code),
  ward_code       VARCHAR(20) REFERENCES wards(code),
  tinh            VARCHAR(255) NOT NULL,
  phuong          VARCHAR(255) NOT NULL,
  location_text   VARCHAR(255),
  note            VARCHAR(255),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deactive')),
  created_by      INTEGER REFERENCES users(id),
  updated_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_delivery_routes_destination CHECK (
    (ward_code IS NOT NULL AND location_text IS NULL)
    OR (ward_code IS NULL AND location_text IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_supplier ON delivery_routes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_province ON delivery_routes(province_code);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_routes_unique_active
  ON delivery_routes (
    supplier_id,
    province_code,
    COALESCE(ward_code, ''),
    COALESCE(location_text, ''),
    COALESCE(NULLIF(TRIM(note), ''), '')
  )
  WHERE status = 'active';

DROP TRIGGER IF EXISTS update_delivery_routes_updated_at ON delivery_routes;
CREATE TRIGGER update_delivery_routes_updated_at
  BEFORE UPDATE ON delivery_routes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2) Nhóm tuyến
CREATE TABLE IF NOT EXISTS route_groups (
  id              SERIAL PRIMARY KEY,
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id),
  name            VARCHAR(255) NOT NULL,
  province_code   VARCHAR(20) NOT NULL REFERENCES provinces(code),
  tinh            VARCHAR(255) NOT NULL,
  is_residual     BOOLEAN NOT NULL DEFAULT FALSE,
  note            TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deactive')),
  created_by      INTEGER REFERENCES users(id),
  updated_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_groups_supplier ON route_groups(supplier_id);
CREATE INDEX IF NOT EXISTS idx_route_groups_province ON route_groups(province_code);
CREATE INDEX IF NOT EXISTS idx_route_groups_status ON route_groups(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_groups_residual_active_note
  ON route_groups (
    supplier_id,
    province_code,
    COALESCE(NULLIF(TRIM(note), ''), '')
  )
  WHERE status = 'active' AND is_residual = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_groups_name_active
  ON route_groups(supplier_id, province_code, name) WHERE status = 'active';

DROP TRIGGER IF EXISTS update_route_groups_updated_at ON route_groups;
CREATE TRIGGER update_route_groups_updated_at
  BEFORE UPDATE ON route_groups
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3) Thành viên nhóm
CREATE TABLE IF NOT EXISTS route_group_members (
  id              SERIAL PRIMARY KEY,
  route_group_id  INTEGER NOT NULL REFERENCES route_groups(id) ON DELETE CASCADE,
  route_id        INTEGER NOT NULL REFERENCES delivery_routes(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (route_group_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_rgm_group ON route_group_members(route_group_id);
CREATE INDEX IF NOT EXISTS idx_rgm_route ON route_group_members(route_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rgm_route_one_group ON route_group_members(route_id);

-- 4) Config giá 1-1 với nhóm
CREATE TABLE IF NOT EXISTS route_price_configs (
  id              SERIAL PRIMARY KEY,
  route_group_id  INTEGER NOT NULL REFERENCES route_groups(id) UNIQUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deactive')),
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_route_price_configs_updated_at ON route_price_configs;
CREATE TRIGGER update_route_price_configs_updated_at
  BEFORE UPDATE ON route_price_configs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5) Phiên bản giá (+ pricing_mode, race guards)
CREATE TABLE IF NOT EXISTS route_price_versions (
  id                  SERIAL PRIMARY KEY,
  price_config_id     INTEGER NOT NULL REFERENCES route_price_configs(id),
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  pricing_mode        VARCHAR(20) NOT NULL DEFAULT 'by_weight'
                        CHECK (pricing_mode IN ('by_weight', 'by_trips')),
  pallet_trip_price   NUMERIC(15,0) NOT NULL,
  adjustment_percent  NUMERIC(8,4),
  adjustment_batch_id UUID,
  base_version_id     INTEGER REFERENCES route_price_versions(id),
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rpv_config_from ON route_price_versions(price_config_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_rpv_batch ON route_price_versions(adjustment_batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rpv_one_open_per_config
  ON route_price_versions (price_config_id)
  WHERE effective_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rpv_config_effective_from
  ON route_price_versions (price_config_id, effective_from);

-- 6) Bậc điều kiện (unified range_from / range_to)
CREATE TABLE IF NOT EXISTS route_price_tiers (
  id                  SERIAL PRIMARY KEY,
  price_version_id    INTEGER NOT NULL REFERENCES route_price_versions(id) ON DELETE CASCADE,
  range_from          NUMERIC(10,3) NOT NULL,
  range_to            NUMERIC(10,3),
  pricing_unit        VARCHAR(10) NOT NULL CHECK (pricing_unit IN ('chuyen', 'tan')),
  price               NUMERIC(15,0) NOT NULL,
  min_billable_ton    NUMERIC(10,3),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT chk_rpt_min_billable CHECK (
    (pricing_unit = 'chuyen' AND min_billable_ton IS NULL)
    OR (pricing_unit = 'tan')
  ),
  CONSTRAINT chk_rpt_range_order CHECK (
    range_to IS NULL OR range_from <= range_to
  )
);

CREATE INDEX IF NOT EXISTS idx_rpt_version ON route_price_tiers(price_version_id);
CREATE INDEX IF NOT EXISTS idx_rpt_version_range
  ON route_price_tiers(price_version_id, sort_order, range_from);
