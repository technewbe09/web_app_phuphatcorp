-- 036: Race guards for route_price_versions
-- - At most one open version per config (effective_to IS NULL)
-- - Unique effective_from per config (no duplicate start dates)

CREATE UNIQUE INDEX IF NOT EXISTS idx_rpv_one_open_per_config
  ON route_price_versions (price_config_id)
  WHERE effective_to IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rpv_config_effective_from
  ON route_price_versions (price_config_id, effective_from);
