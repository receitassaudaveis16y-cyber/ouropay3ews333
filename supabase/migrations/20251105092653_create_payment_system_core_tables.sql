/*
  # Create Payment System Core Tables
  
  ## Tables Created
  
  1. **users** - User accounts
     - id (uuid, primary key)
     - email (text, unique)
     - full_name (text)
     - cpf (text, unique)
     - phone (text)
     - created_at (timestamp)
     - updated_at (timestamp)
  
  2. **wallets** - User wallets for balance management
     - id (uuid, primary key)
     - user_id (uuid, foreign key)
     - available_balance (decimal)
     - pending_balance (decimal)
     - total_withdrawn (decimal)
     - created_at (timestamp)
     - updated_at (timestamp)
  
  3. **transactions** - Payment transactions
     - id (uuid, primary key)
     - user_id (uuid, foreign key)
     - wallet_id (uuid, foreign key)
     - pagarme_transaction_id (text, unique)
     - amount (decimal)
     - fee (decimal)
     - net_amount (decimal)
     - payment_method (text)
     - status (text)
     - description (text)
     - customer_name (text)
     - customer_email (text)
     - metadata (jsonb)
     - paid_at (timestamp)
     - created_at (timestamp)
  
  4. **webhooks** - Webhook configurations
     - id (uuid, primary key)
     - user_id (uuid, foreign key)
     - url (text)
     - events (text array)
     - secret (text)
     - is_active (boolean)
     - retry_count (integer)
     - last_triggered_at (timestamp)
     - created_at (timestamp)
  
  5. **webhook_logs** - Webhook delivery logs
     - id (uuid, primary key)
     - webhook_id (uuid, foreign key)
     - event_type (text)
     - payload (jsonb)
     - response_status (integer)
     - response_body (text)
     - attempt_number (integer)
     - created_at (timestamp)
  
  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Proper foreign key constraints
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  cpf TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  pagarme_transaction_id TEXT UNIQUE,
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  description TEXT,
  customer_name TEXT,
  customer_email TEXT,
  metadata JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 3,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pagarme_id ON transactions(pagarme_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for wallets table
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for webhooks table
CREATE POLICY "Users can view own webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks"
  ON webhooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON webhooks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON webhooks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for webhook_logs table
CREATE POLICY "Users can view own webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_logs.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create wallet automatically when user signs up
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, available_balance, pending_balance, total_withdrawn)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create wallet on user creation
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();