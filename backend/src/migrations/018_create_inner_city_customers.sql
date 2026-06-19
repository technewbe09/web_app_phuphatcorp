-- ============================================================
-- Migration 018: Inner City Customers (Danh mục KH nội thành)
-- Date: 2026-06-16
-- Module: Quản lý danh mục
-- ============================================================

CREATE TABLE IF NOT EXISTS inner_city_customers (
  id              SERIAL PRIMARY KEY,
  customer_name   VARCHAR(255) NOT NULL,
  customer_code   VARCHAR(100) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'deactive')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inner_city_customers_code_active
  ON inner_city_customers(customer_code) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_inner_city_customers_status ON inner_city_customers(status);

DROP TRIGGER IF EXISTS update_inner_city_customers_updated_at ON inner_city_customers;
CREATE TRIGGER update_inner_city_customers_updated_at
  BEFORE UPDATE ON inner_city_customers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
