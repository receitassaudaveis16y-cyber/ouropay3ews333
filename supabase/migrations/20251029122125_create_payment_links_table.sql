/*
  # Create Payment Links Table

  1. New Tables
    - `payment_links`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `title` (text) - Title of the product/service
      - `description` (text) - Description of what's being sold
      - `amount` (numeric) - Amount in the smallest currency unit (cents)
      - `slug` (text) - Unique URL slug for the payment link
      - `is_active` (boolean) - Whether the link is active
      - `clicks` (integer) - Number of times the link was clicked
      - `sales` (integer) - Number of successful sales
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp

  2. Security
    - Enable RLS on `payment_links` table
    - Add policy for users to manage their own payment links
    - Add policy for anonymous users to view active payment links by slug
*/

CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  slug text UNIQUE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  clicks integer DEFAULT 0 NOT NULL,
  sales integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment links"
  ON payment_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can view active links by slug"
  ON payment_links FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Users can create own payment links"
  ON payment_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment links"
  ON payment_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment links"
  ON payment_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_slug ON payment_links(slug);
CREATE INDEX IF NOT EXISTS idx_payment_links_is_active ON payment_links(is_active);
