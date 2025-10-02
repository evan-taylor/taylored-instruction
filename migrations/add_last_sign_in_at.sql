-- Add last_sign_in_at column to auth.users table
-- This migration adds the last_sign_in_at timestamp field to track when users last logged in

-- Add the column to auth.users table
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Add a comment to document the column purpose
COMMENT ON COLUMN auth.users.last_sign_in_at IS 'Timestamp of the user''s last successful sign-in';