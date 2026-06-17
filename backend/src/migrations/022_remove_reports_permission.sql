-- ============================================================
-- Migration 022: Remove orphan permission reports.view
-- Date: 2026-06-17
-- Mô tả: reports.view không có sidebar entry, không route nào dùng
-- ============================================================

DELETE FROM role_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE code = 'reports.view');

DELETE FROM permissions WHERE code = 'reports.view';
