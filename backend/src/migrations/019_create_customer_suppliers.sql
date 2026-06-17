-- ============================================================
-- Migration 019: Customer-Supplier Junction Table
-- Date: 2026-06-17
-- Module: Quản lý dữ liệu kế toán — Liên kết khách hàng ↔ nhà cung cấp
-- ============================================================

-- ============================================================
-- 1. Tạo bảng customer_suppliers (junction N-N)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_suppliers (
  id              SERIAL PRIMARY KEY,

  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Mỗi cặp (customer, supplier) chỉ xuất hiện 1 lần
  UNIQUE(customer_id, supplier_id)
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customer_suppliers_customer ON customer_suppliers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_suppliers_supplier ON customer_suppliers(supplier_id);
