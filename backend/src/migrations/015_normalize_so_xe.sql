-- ============================================================
-- Migration 015: Normalize so_xe format
-- Date: 2026-06-15
-- Remove hyphens, commas, spaces from so_xe values
-- ============================================================
UPDATE driver_invoices SET so_xe = regexp_replace(so_xe, '[-,\s]', '', 'g') WHERE so_xe ~ '[-,\s]';
