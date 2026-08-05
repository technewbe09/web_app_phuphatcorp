-- ============================================================
-- Migration 042: Route pricing adjustment periods
-- Date: 2026-07-31
-- Module: route_pricing
-- Version dates/% derived from period; versions store period FK only.
-- ============================================================

CREATE TABLE IF NOT EXISTS route_pricing_adjustment_periods (
  id              SERIAL PRIMARY KEY,
  start_date      DATE NOT NULL,
  end_date        DATE,
  percent         NUMERIC(8,4) NOT NULL,
  note            TEXT,
  created_by      INTEGER REFERENCES users(id),
  updated_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rp_adj_period_percent CHECK (percent <> 0),
  CONSTRAINT chk_rp_adj_period_end CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rp_adj_periods_start_unique
  ON route_pricing_adjustment_periods (start_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rp_adj_periods_one_open
  ON route_pricing_adjustment_periods ((TRUE))
  WHERE end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_rp_adj_periods_start
  ON route_pricing_adjustment_periods (start_date DESC);

DROP TRIGGER IF EXISTS update_route_pricing_adjustment_periods_updated_at
  ON route_pricing_adjustment_periods;
CREATE TRIGGER update_route_pricing_adjustment_periods_updated_at
  BEFORE UPDATE ON route_pricing_adjustment_periods
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE route_price_versions
  ADD COLUMN IF NOT EXISTS adjustment_period_id INTEGER
    REFERENCES route_pricing_adjustment_periods(id);

-- Backfill period FK from legacy effective_from when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'route_price_versions' AND column_name = 'effective_from'
  ) THEN
    UPDATE route_price_versions v
    SET adjustment_period_id = p.id
    FROM route_pricing_adjustment_periods p
    WHERE v.adjustment_period_id IS NULL
      AND v.effective_from = p.start_date;
  END IF;
END $$;

-- Fail loudly if any version still unlinked (prevents NOT NULL with orphans)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM route_price_versions WHERE adjustment_period_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'route_price_versions.adjustment_period_id still NULL — create matching periods or link manually before continuing';
  END IF;
END $$;

ALTER TABLE route_price_versions
  ALTER COLUMN adjustment_period_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rpv_adjustment_period
  ON route_price_versions (adjustment_period_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rpv_config_period
  ON route_price_versions (price_config_id, adjustment_period_id);

-- Drop legacy date/% columns and indexes (idempotent)
DROP INDEX IF EXISTS idx_rpv_config_from;
DROP INDEX IF EXISTS idx_rpv_batch;
DROP INDEX IF EXISTS idx_rpv_one_open_per_config;
DROP INDEX IF EXISTS idx_rpv_config_effective_from;

ALTER TABLE route_price_versions DROP COLUMN IF EXISTS effective_from;
ALTER TABLE route_price_versions DROP COLUMN IF EXISTS effective_to;
ALTER TABLE route_price_versions DROP COLUMN IF EXISTS adjustment_percent;
ALTER TABLE route_price_versions DROP COLUMN IF EXISTS adjustment_batch_id;
