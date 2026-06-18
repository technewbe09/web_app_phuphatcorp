-- ============================================================
-- Migration 016: Convert so_hoa_don from string[] to {so, ghi_chu}[]
-- Date: 2026-06-17
-- ============================================================
UPDATE driver_invoices
SET so_hoa_don = (
  SELECT jsonb_agg(
    jsonb_build_object('so', elem, 'ghi_chu', '')
    ORDER BY ordinality
  )
  FROM jsonb_array_elements_text(so_hoa_don) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(so_hoa_don) = 'array'
  AND jsonb_array_length(so_hoa_don) > 0
  AND (so_hoa_don->>0)::text NOT LIKE '{%';
