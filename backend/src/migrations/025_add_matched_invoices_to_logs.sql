-- ============================================================
-- Migration 025: Add matched_invoices to reconcile_job_logs
-- Date: 2026-06-18
-- Mô tả: Lưu danh sách hóa đơn đã được cập nhật trong mỗi lần job chạy
-- ============================================================

ALTER TABLE reconcile_job_logs
ADD COLUMN IF NOT EXISTS matched_invoices JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN reconcile_job_logs.matched_invoices IS 'Danh sách hóa đơn đã khớp: [{id, so_hoa_don, so_xe, ngay}]';
