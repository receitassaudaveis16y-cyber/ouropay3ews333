/*
  # Create API Keys Table

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `name` (text) - Descriptive name for the key
      - `key_prefix` (text) - Key prefix (e.g., "sk_test", "sk_live")
      - `key_hash` (text) - Full API key (should be hashed in production)
      - `key_display` (text) - Last 4 characters for display
      - `environment` (text) - Either 'test' or 'production'
      - `is_active` (boolean) - Whether the key is active
      - `last_used_at` (timestamptz) - Last time the key was used
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp

  2. Security
    - Enable RLS on `api_keys` table
    - Add policy for users to manage their own API keys
    - Add policy for users to read their own API keys
    - Add policy for users to delete their own API keys
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  key_display text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test', 'production')),
  is_active boolean DEFAULT true NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
