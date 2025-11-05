/*
  # Create User MFA Settings Table
  
  1. New Tables
    - `user_mfa_settings` - Store user 2FA settings (TOTP secrets, backup codes, etc)
    
  2. Security
    - Enable RLS on table
    - Users can only access their own MFA settings
*/

CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  mfa_enabled boolean DEFAULT false,
  totp_secret text,
  totp_enabled boolean DEFAULT false,
  backup_codes text[] DEFAULT '{}',
  backup_codes_used text[] DEFAULT '{}',
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA settings"
  ON user_mfa_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own MFA settings"
  ON user_mfa_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own MFA settings"
  ON user_mfa_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);