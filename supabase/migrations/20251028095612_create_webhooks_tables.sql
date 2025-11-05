/*
  # Create Webhooks Tables

  1. New Tables
    - `webhooks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `url` (text) - Webhook endpoint URL
      - `events` (text[]) - Array of event types to listen for
      - `secret` (text) - Webhook secret for signature verification
      - `is_active` (boolean) - Whether webhook is active
      - `retry_count` (integer) - Number of retry attempts on failure
      - `last_triggered_at` (timestamptz) - Last time webhook was triggered
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `webhook_logs`
      - `id` (uuid, primary key)
      - `webhook_id` (uuid, foreign key to webhooks)
      - `event_type` (text) - Type of event that triggered the webhook
      - `payload` (jsonb) - Event payload sent to webhook
      - `response_status` (integer) - HTTP response status from webhook endpoint
      - `response_body` (text) - Response body from webhook endpoint
      - `attempt_number` (integer) - Attempt number (for retries)
      - `error_message` (text) - Error message if webhook failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own webhooks
    - Add policies for viewing webhook logs

  3. Important Notes
    - Webhooks can be configured to listen for multiple event types
    - Failed webhooks are retried based on retry_count
    - All webhook attempts are logged for debugging
    - Secrets are generated automatically for signature verification
*/

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  retry_count integer DEFAULT 3 CHECK (retry_count >= 0 AND retry_count <= 10),
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  response_status integer,
  response_body text,
  attempt_number integer DEFAULT 1,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies for webhooks table
CREATE POLICY "Users can view own webhooks"
  ON webhooks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON webhooks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON webhooks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for webhook_logs table
CREATE POLICY "Users can view own webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_logs.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhooks_updated_at();