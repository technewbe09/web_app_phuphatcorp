-- ============================================================
-- Migration 012: Customers (Danh sách khách nhận hàng)
-- Date: 2026-04-21
-- Module: Quản lý dữ liệu kế toán
-- ============================================================

-- ============================================================
-- 1. Tạo bảng customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id                    SERIAL PRIMARY KEY,

  -- Business data
  diem_tra_hang         VARCHAR(255) NOT NULL,        -- Điểm trả hàng (alias, identifier duy nhất)
  ten_khach_hang        VARCHAR(500) NOT NULL,         -- Tên pháp lý đầy đủ
  tuyen_phuong          VARCHAR(255),                  -- Tuyến-phường (mới)
  tuyen_cu              VARCHAR(255),                  -- Tuyến-cũ
  dia_chi_giao_hang     TEXT,                          -- Địa chỉ giao hàng đầy đủ
  boc_xep               BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = có bốc xếp, FALSE = không

  -- Lifecycle
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'deactive')),

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_diem_tra_hang ON customers(diem_tra_hang);
CREATE INDEX IF NOT EXISTS idx_customers_status        ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_tuyen_phuong  ON customers(tuyen_phuong);

-- ============================================================
-- 3. Trigger auto-update updated_at
--    (reuse update_updated_at_column() từ migration 004)
-- ============================================================
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- Note: Permissions accounting_data.view / accounting_data.manage
-- đã được tạo trong migration 009_create_weight_adjustments.sql
-- Không insert lại ở đây.
-- ============================================================
