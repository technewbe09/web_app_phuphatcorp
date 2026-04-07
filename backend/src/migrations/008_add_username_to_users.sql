-- Migration: Add username column to users table
-- Users log in with username instead of email
-- Both email and username must be unique

-- Step 1: Add nullable column first (to handle existing rows)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Step 2: Populate existing rows with a unique username derived from email prefix + id
UPDATE users
SET username = SPLIT_PART(email, '@', 1) || '_' || id
WHERE username IS NULL;

-- Step 3: Add UNIQUE constraint
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Step 4: Make NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Step 5: Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
