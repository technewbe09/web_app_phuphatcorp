-- ============================================================
-- Migration 017: Add ghi_chu column to accountant_invoices
-- Date: 2026-06-17
-- ============================================================
ALTER TABLE accountant_invoices ADD COLUMN IF NOT EXISTS ghi_chu TEXT;
