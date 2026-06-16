-- ============================================================
-- Migration 014: Driver Invoices (Hóa đơn tài xế)
-- Date: 2026-06-15
-- Module: Quản lý dữ liệu kế toán
-- ============================================================

-- ============================================================
-- 1. Tạo bảng driver_invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_invoices (
  id                    SERIAL PRIMARY KEY,

  -- Business data (from Excel sheet "XE NHỎ", columns B-G)
  ma                    VARCHAR(50) NOT NULL,
  ten_tx                VARCHAR(255) NOT NULL,
  ngay                  DATE NOT NULL,
  so_xe                 VARCHAR(50) NOT NULL,
  noi_giao              VARCHAR(255) NOT NULL,
  ghi_chu        TEXT,
  so_hoa_don            JSONB DEFAULT '[]'::jsonb,

  -- Upload metadata
  original_filename     VARCHAR(255),
  uploaded_by           INTEGER REFERENCES users(id),
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Unique constraint — composite key for duplicate detection
--    Same (ma, ngay, so_xe, ghi_chu) = duplicate row
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_invoices_unique
  ON driver_invoices(ma, ngay, so_xe, ghi_chu);

-- ============================================================
-- 3. Secondary indexes for queries and filters
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_driver_invoices_ngay        ON driver_invoices(ngay);
CREATE INDEX IF NOT EXISTS idx_driver_invoices_so_xe       ON driver_invoices(so_xe);
CREATE INDEX IF NOT EXISTS idx_driver_invoices_ma          ON driver_invoices(ma);
CREATE INDEX IF NOT EXISTS idx_driver_invoices_uploaded_by ON driver_invoices(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_driver_invoices_ghi_chu ON driver_invoices(ghi_chu);

-- ============================================================
-- Note: Permissions accounting_data.view / accounting_data.manage
-- đã được tạo trong migration 009_create_weight_adjustments.sql
-- Không insert lại ở đây.
-- ============================================================
