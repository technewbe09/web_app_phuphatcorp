-- Migration 016: Create delivery_data and accountant_invoices tables
-- Feature: Import dữ liệu 5 nhà vào database & Đối chiếu hóa đơn

BEGIN;

-- 1. delivery_data: lưu trữ toàn bộ dữ liệu từ file Excel 5 nhà (34 cột)
CREATE TABLE IF NOT EXISTS delivery_data (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(50) NOT NULL,

  -- Column mapping from Excel (34 columns, index 0-33)
  channel            TEXT,    -- [0]  Channel
  sub_channel        TEXT,    -- [1]  Sub-channel
  dien_giai_ct       TEXT,    -- [2]  Diễn giải chi tiết (HĐ)
  dien_giai          TEXT,    -- [3]  Diễn giải
  slot               TEXT,    -- [4]  Slot
  waybill_no         TEXT,    -- [5]  Waybill No
  slot_no            TEXT,    -- [6]  Slot No
  user_tao_hd        TEXT,    -- [7]  User tạo Hóa đơn
  user_tao_pxk       TEXT,    -- [8]  User tạo PXK
  po_number          TEXT,    -- [9]  PO Number
  warehouse_no       TEXT,    -- [10] Warehouse No
  warehouse_name     TEXT,    -- [11] Warehouse Name
  ma_pxk             TEXT,    -- [12] Mã PXK
  so_chung_tu        TEXT,    -- [13] Số chứng từ ghi sổ
  so_seri            TEXT,    -- [14] Số Seri
  dia_chi            TEXT,    -- [15] Địa chỉ giao hàng (vn)
  ten_hang_hoa       TEXT,    -- [16] Tên hàng hóa
  ma_dvt             TEXT,    -- [17] Mã ĐVT (Bán hàng)
  sp_trong_luong     NUMERIC(15,3),  -- [18] SP - Trọng lượng Net
  hd_trong_luong     NUMERIC(15,3),  -- [19] HĐ - Trọng lượng (Net)
  ma_ncc             VARCHAR(50),    -- [20] Mã nhà cung cấp
  ma_kh              VARCHAR(50),    -- [21] Mã khách hàng
  ten_kh             VARCHAR(500),   -- [22] Tên khách hàng
  ma_hang            VARCHAR(100),   -- [23] Mã hàng hóa
  ten_hang_en        TEXT,    -- [24] Tên hàng hóa (En)
  loai_hang          TEXT,    -- [25] Loại hàng
  ma_lh_giao         TEXT,    -- [26] Mã liên hệ giao hàng
  so_luong           NUMERIC(15,3),  -- [27] Số lượng (DVT bán hàng)
  so_tau_xe          VARCHAR(100),   -- [28] Số tàu/ Số xe
  tai_xe             VARCHAR(255),   -- [29] Tài xế
  so_cont            TEXT,    -- [30] Số Cont
  ngay_hd            DATE,    -- [31] Ngày hóa đơn
  so_hd              TEXT,    -- [32] Số hóa đơn
  thong_tin_bs       TEXT,    -- [33] Thông tin bổ sung 08

  -- Metadata
  original_filename  VARCHAR(255),
  uploaded_by        INTEGER REFERENCES users(id),
  uploaded_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for delivery_data
CREATE INDEX IF NOT EXISTS idx_delivery_data_batch_id ON delivery_data(batch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_data_ngay_hd ON delivery_data(ngay_hd);
CREATE INDEX IF NOT EXISTS idx_delivery_data_so_hd ON delivery_data(so_hd);
CREATE INDEX IF NOT EXISTS idx_delivery_data_so_tau_xe ON delivery_data(so_tau_xe);
CREATE INDEX IF NOT EXISTS idx_delivery_data_ma_ncc ON delivery_data(ma_ncc);

-- 2. accountant_invoices: hóa đơn bóc tách từ delivery_data để đối chiếu với driver_invoices
CREATE TABLE IF NOT EXISTS accountant_invoices (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(50) NOT NULL,
  ngay DATE NOT NULL,
  so_xe VARCHAR(100) NOT NULL,
  so_hoa_don TEXT NOT NULL,
  trang_thai VARCHAR(20) NOT NULL DEFAULT 'không có',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for accountant_invoices
CREATE INDEX IF NOT EXISTS idx_accountant_invoices_batch_id ON accountant_invoices(batch_id);
CREATE INDEX IF NOT EXISTS idx_accountant_invoices_ngay ON accountant_invoices(ngay);
CREATE INDEX IF NOT EXISTS idx_accountant_invoices_so_hoa_don ON accountant_invoices(so_hoa_don);
CREATE INDEX IF NOT EXISTS idx_accountant_invoices_trang_thai ON accountant_invoices(trang_thai);
CREATE INDEX IF NOT EXISTS idx_accountant_invoices_so_xe ON accountant_invoices(so_xe);

COMMIT;
