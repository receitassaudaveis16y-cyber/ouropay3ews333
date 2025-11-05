/*
  # Create Payment Links Table

  1. New Tables
    - `payment_links`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text) - Product/service title
      - `description` (text) - Payment link description
      - `amount` (numeric) - Amount in BRL
      - `slug` (text, unique) - Unique URL slug
      - `is_active` (boolean) - Whether link is active
      - `clicks` (integer) - Number of times link was accessed
      - `sales` (integer) - Number of completed sales
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `payment_links` table
    - Add policy for authenticated users to manage their own links
    - Add policy for public read access to active links by slug

  3. Important Notes
    - Links are identified by a unique slug for clean URLs
    - Clicks and sales are tracked for analytics
    - Only authenticated users can create/manage links
    - Public can view active links via slug
*/

-- Create payment_links table
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  slug text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  sales integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_slug ON payment_links(slug);
CREATE INDEX IF NOT EXISTS idx_payment_links_is_active ON payment_links(is_active);

-- Enable RLS
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to manage their own links
CREATE POLICY "Users can view own payment links"
  ON payment_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment links"
  ON payment_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment links"
  ON payment_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment links"
  ON payment_links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for public read access to active links
CREATE POLICY "Public can view active payment links by slug"
  ON payment_links
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_links_updated_at();