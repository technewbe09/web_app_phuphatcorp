-- Migration 019: Create reconcile_job_configs and reconcile_job_logs tables
-- Feature: Job đối chiếu HĐ tự động

BEGIN;

CREATE TABLE IF NOT EXISTS reconcile_job_configs (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL DEFAULT 'Đối chiếu hóa đơn',
  lookback_days   INTEGER NOT NULL DEFAULT 180,
  schedule_hours  INTEGER[] NOT NULL DEFAULT '{8, 12, 18}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id),
  updated_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reconcile_job_configs IS 'Cấu hình job đối chiếu hóa đơn định kỳ';
COMMENT ON COLUMN reconcile_job_configs.lookback_days IS 'Số ngày quét ngược từ hôm nay';
COMMENT ON COLUMN reconcile_job_configs.schedule_hours IS 'Danh sách giờ chạy (0-23). VD: {8,12,18} = 8h, 12h, 18h mỗi ngày';

CREATE TABLE IF NOT EXISTS reconcile_job_logs (
  id              SERIAL PRIMARY KEY,
  config_id       INTEGER REFERENCES reconcile_job_configs(id) ON DELETE SET NULL,
  trigger_type    VARCHAR(10) NOT NULL DEFAULT 'scheduled',
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL DEFAULT 'running',
  lookback_days   INTEGER,
  scanned_count   INTEGER DEFAULT 0,
  matched_count   INTEGER DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reconcile_job_logs IS 'Lịch sử thực thi job đối chiếu';
COMMENT ON COLUMN reconcile_job_logs.trigger_type IS 'scheduled = định kỳ, manual = chạy thủ công';

CREATE INDEX IF NOT EXISTS idx_reconcile_job_logs_config_id ON reconcile_job_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_reconcile_job_logs_status ON reconcile_job_logs(status);
CREATE INDEX IF NOT EXISTS idx_reconcile_job_logs_started_at ON reconcile_job_logs(started_at);

COMMIT;
