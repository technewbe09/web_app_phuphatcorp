-- ============================================================
-- Migration 037: Route Pricing CR — location text, route note,
--                 trips/vehicle/day on chuyen tiers
-- Date: 2026-07-12
-- Idempotent: safe on fresh DB after 034–036, and if an older
-- partial schema used destination_text / route_note / *_trips_per_day.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'destination_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'location_text'
  ) THEN
    ALTER TABLE delivery_routes RENAME COLUMN destination_text TO location_text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'route_note'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'note'
  ) THEN
    ALTER TABLE delivery_routes RENAME COLUMN route_note TO note;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_tiers' AND column_name = 'from_trips_per_day'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_tiers' AND column_name = 'from_trips_per_vehicle_day'
  ) THEN
    ALTER TABLE route_price_tiers RENAME COLUMN from_trips_per_day TO from_trips_per_vehicle_day;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_tiers' AND column_name = 'to_trips_per_day'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_tiers' AND column_name = 'to_trips_per_vehicle_day'
  ) THEN
    ALTER TABLE route_price_tiers RENAME COLUMN to_trips_per_day TO to_trips_per_vehicle_day;
  END IF;
END $$;

ALTER TABLE delivery_routes
  ALTER COLUMN ward_code DROP NOT NULL;

ALTER TABLE delivery_routes
  ADD COLUMN IF NOT EXISTS location_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS note VARCHAR(255);

UPDATE delivery_routes SET location_text = NULL WHERE location_text IS NOT NULL AND TRIM(location_text) = '';
UPDATE delivery_routes SET note = NULL WHERE note IS NOT NULL AND TRIM(note) = '';

ALTER TABLE delivery_routes DROP CONSTRAINT IF EXISTS chk_delivery_routes_dest;
ALTER TABLE delivery_routes DROP CONSTRAINT IF EXISTS chk_delivery_routes_destination;
ALTER TABLE delivery_routes
  ADD CONSTRAINT chk_delivery_routes_destination CHECK (
    (ward_code IS NOT NULL AND location_text IS NULL)
    OR (ward_code IS NULL AND location_text IS NOT NULL)
  );

DROP INDEX IF EXISTS idx_delivery_routes_unique_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_routes_unique_active
  ON delivery_routes (
    supplier_id,
    province_code,
    COALESCE(ward_code, ''),
    COALESCE(location_text, ''),
    COALESCE(NULLIF(TRIM(note), ''), '')
  )
  WHERE status = 'active';

DROP INDEX IF EXISTS idx_route_groups_residual_active;
DROP INDEX IF EXISTS idx_route_groups_residual_active_note;
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_groups_residual_active_note
  ON route_groups (
    supplier_id,
    province_code,
    COALESCE(NULLIF(TRIM(note), ''), '')
  )
  WHERE status = 'active' AND is_residual = TRUE;

ALTER TABLE route_price_tiers
  ADD COLUMN IF NOT EXISTS from_trips_per_vehicle_day NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS to_trips_per_vehicle_day NUMERIC(10,3);

ALTER TABLE route_price_tiers DROP CONSTRAINT IF EXISTS chk_route_price_tiers_trips_unit;
ALTER TABLE route_price_tiers
  ADD CONSTRAINT chk_route_price_tiers_trips_unit CHECK (
    (pricing_unit = 'tan' AND from_trips_per_vehicle_day IS NULL AND to_trips_per_vehicle_day IS NULL)
    OR (pricing_unit = 'chuyen')
  );
