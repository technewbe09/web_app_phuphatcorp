-- ============================================================
-- Migration 020: Replace customer_suppliers junction with
--                 supplier_code column on customers (1-1 link)
-- Date: 2026-06-17
-- ============================================================

-- 1. Drop junction table (created in migration 019)
DROP TABLE IF EXISTS customer_suppliers CASCADE;

-- 2. Add supplier_code column to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(20);

-- 3. Index for lookups
CREATE INDEX IF NOT EXISTS idx_customers_supplier_code
  ON customers(supplier_code);
