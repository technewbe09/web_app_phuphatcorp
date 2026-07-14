-- ============================================================
-- Migration 038: Route Pricing — pricing_mode + range_from/to
-- Date: 2026-07-13
-- Idempotent
-- ============================================================

-- 1) pricing_mode on versions
ALTER TABLE route_price_versions
  ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20);

-- 2) Unified range columns on tiers
ALTER TABLE route_price_tiers
  ADD COLUMN IF NOT EXISTS range_from NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS range_to NUMERIC(10,3);

-- 3) Backfill range: prefer trips when set, else ton
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_tiers' AND column_name = 'from_ton'
  ) THEN
    UPDATE route_price_tiers
    SET
      range_from = CASE
        WHEN from_trips_per_vehicle_day IS NOT NULL OR to_trips_per_vehicle_day IS NOT NULL
          THEN COALESCE(from_trips_per_vehicle_day, 0)
        ELSE from_ton
      END,
      range_to = CASE
        WHEN from_trips_per_vehicle_day IS NOT NULL OR to_trips_per_vehicle_day IS NOT NULL
          THEN to_trips_per_vehicle_day
        ELSE to_ton
      END
    WHERE range_from IS NULL;
  END IF;
END $$;

-- 4) Version mode: by_trips if any tier used trips fields; else by_weight
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_tiers' AND column_name = 'from_trips_per_vehicle_day'
  ) THEN
    UPDATE route_price_versions v
    SET pricing_mode = CASE
      WHEN EXISTS (
        SELECT 1 FROM route_price_tiers t
        WHERE t.price_version_id = v.id
          AND (t.from_trips_per_vehicle_day IS NOT NULL OR t.to_trips_per_vehicle_day IS NOT NULL)
      ) THEN 'by_trips'
      ELSE 'by_weight'
    END
    WHERE v.pricing_mode IS NULL;
  ELSE
    UPDATE route_price_versions
    SET pricing_mode = 'by_weight'
    WHERE pricing_mode IS NULL;
  END IF;
END $$;

UPDATE route_price_versions
SET pricing_mode = 'by_weight'
WHERE pricing_mode IS NULL;

-- 5) Enforce NOT NULL on new columns
ALTER TABLE route_price_versions
  ALTER COLUMN pricing_mode SET DEFAULT 'by_weight',
  ALTER COLUMN pricing_mode SET NOT NULL;

ALTER TABLE route_price_tiers
  ALTER COLUMN range_from SET NOT NULL;

-- 6) Drop old columns + obsolete checks
ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS chk_route_price_tiers_trips_unit;
ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS route_price_tiers_pricing_unit_check;
ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS route_price_tiers_check;
ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS chk_route_price_tiers_min_billable;

ALTER TABLE route_price_tiers
  DROP COLUMN IF EXISTS from_ton,
  DROP COLUMN IF EXISTS to_ton,
  DROP COLUMN IF EXISTS from_trips_per_vehicle_day,
  DROP COLUMN IF EXISTS to_trips_per_vehicle_day;

-- 7) New checks
ALTER TABLE route_price_versions DROP CONSTRAINT IF EXISTS chk_rpv_pricing_mode;
ALTER TABLE route_price_versions
  ADD CONSTRAINT chk_rpv_pricing_mode CHECK (pricing_mode IN ('by_weight', 'by_trips'));

ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS chk_rpt_pricing_unit;
ALTER TABLE route_price_tiers
  ADD CONSTRAINT chk_rpt_pricing_unit CHECK (pricing_unit IN ('chuyen', 'tan'));

ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS chk_rpt_min_billable;
ALTER TABLE route_price_tiers
  ADD CONSTRAINT chk_rpt_min_billable CHECK (
    (pricing_unit = 'chuyen' AND min_billable_ton IS NULL)
    OR (pricing_unit = 'tan')
  );

ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS chk_rpt_range_order;
ALTER TABLE route_price_tiers
  ADD CONSTRAINT chk_rpt_range_order CHECK (
    range_to IS NULL OR range_from <= range_to
  );

CREATE INDEX IF NOT EXISTS idx_rpt_version_range
  ON route_price_tiers(price_version_id, sort_order, range_from);
