-- Migration: 002_add_user_management.sql
-- Description: Add user management fields, user_activities table, and indexes

-- 1. ALTER TABLE users: add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Set is_active = TRUE for all existing rows (safety for re-run)
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

-- 2. CREATE TABLE user_activities
CREATE TABLE IF NOT EXISTS user_activities (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  target_user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_activities_actor ON user_activities(actor_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_target ON user_activities(target_user_id);
