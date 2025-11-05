/*
  # Create Transactions and Wallet System Tables

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key) - Unique transaction identifier
      - `user_id` (uuid, references auth.users) - User who owns the transaction
      - `amount` (decimal) - Transaction amount in BRL
      - `type` (text) - Transaction type: 'sale', 'withdrawal', 'refund', 'chargeback'
      - `payment_method` (text) - Payment method: 'pix', 'credit_card', 'boleto'
      - `status` (text) - Status: 'paid', 'pending', 'failed', 'refunded'
      - `pagarme_transaction_id` (text) - Pagar.me transaction ID
      - `customer_name` (text) - Customer name
      - `customer_email` (text) - Customer email
      - `description` (text) - Transaction description
      - `created_at` (timestamptz) - Transaction creation timestamp
      - `paid_at` (timestamptz) - Transaction payment timestamp

    - `wallet_operations`
      - `id` (uuid, primary key) - Unique operation identifier
      - `user_id` (uuid, references auth.users) - User who owns the wallet
      - `operation_type` (text) - Operation type: 'withdrawal', 'receive', 'webhook'
      - `amount` (decimal) - Operation amount
      - `status` (text) - Status: 'completed', 'pending', 'failed'
      - `destination` (text) - Destination account/PIX key for withdrawals
      - `created_at` (timestamptz) - Operation creation timestamp

    - `checkout_links`
      - `id` (uuid, primary key) - Unique checkout link identifier
      - `user_id` (uuid, references auth.users) - User who created the link
      - `name` (text) - Checkout name/description
      - `amount` (decimal) - Checkout amount
      - `payment_methods` (jsonb) - Allowed payment methods
      - `link_code` (text, unique) - Short code for the checkout link
      - `qr_code` (text) - QR code data
      - `status` (text) - Status: 'active', 'inactive', 'expired'
      - `created_at` (timestamptz) - Creation timestamp
      - `expires_at` (timestamptz) - Expiration timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('sale', 'withdrawal', 'refund', 'chargeback')),
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')) DEFAULT 'pending',
  pagarme_transaction_id text,
  customer_name text,
  customer_email text,
  description text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Create wallet_operations table
CREATE TABLE IF NOT EXISTS wallet_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('withdrawal', 'receive', 'webhook')),
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('completed', 'pending', 'failed')) DEFAULT 'pending',
  destination text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create checkout_links table
CREATE TABLE IF NOT EXISTS checkout_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  payment_methods jsonb DEFAULT '["pix", "credit_card", "boleto"]',
  link_code text UNIQUE NOT NULL,
  qr_code text,
  status text NOT NULL CHECK (status IN ('active', 'inactive', 'expired')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on wallet_operations table
ALTER TABLE wallet_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_operations
CREATE POLICY "Users can view own wallet operations"
  ON wallet_operations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet operations"
  ON wallet_operations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet operations"
  ON wallet_operations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on checkout_links table
ALTER TABLE checkout_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkout_links
CREATE POLICY "Users can view own checkout links"
  ON checkout_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkout links"
  ON checkout_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkout links"
  ON checkout_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkout links"
  ON checkout_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_user_id ON wallet_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_links_user_id ON checkout_links(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_links_link_code ON checkout_links(link_code);