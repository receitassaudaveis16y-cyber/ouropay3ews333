/*
  # GoldsPay - Complete Payment Gateway System
  
  1. Core Tables (in correct order)
    - `users` - Extended user profiles
    - `company_profiles` - Company information
    - `wallets` - User wallet balances
    - `customers` - Customer database
    - `transactions` - Payment transactions
    - `payment_links` - Payment link generator
    - `api_keys` - API key management
    - `webhooks` - Webhook configurations
    - `webhook_logs` - Webhook delivery logs
    - `disputes` - Chargebacks and disputes
    - `support_tickets` - Support system
    - `admin_roles` - Admin management
    - `system_settings` - Configuration
    - `fees` - Fee structure
    
  2. Security
    - Enable RLS on all tables
    - Proper policies for access control
    
  3. Triggers & Functions
    - Auto-create wallet on signup
    - Update wallet on transactions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  company_name text,
  document text,
  status text DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'suspended', 'blocked')),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Company Profiles
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  legal_name text NOT NULL,
  trade_name text,
  document_type text NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  document_number text UNIQUE NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zipcode text,
  address_country text DEFAULT 'BR',
  business_type text,
  monthly_revenue numeric(15,2),
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own company"
  ON company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own company"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance numeric(15,2) DEFAULT 0 CHECK (balance >= 0),
  available_balance numeric(15,2) DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric(15,2) DEFAULT 0 CHECK (pending_balance >= 0),
  currency text DEFAULT 'BRL',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert wallets"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id text,
  name text NOT NULL,
  email text NOT NULL,
  document text,
  phone text,
  birth_date date,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zipcode text,
  address_country text DEFAULT 'BR',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Payment Links
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'BRL',
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  slug text UNIQUE NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment links"
  ON payment_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create payment links"
  ON payment_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment links"
  ON payment_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payment links"
  ON payment_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can view active payment links"
  ON payment_links FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  payment_link_id uuid REFERENCES payment_links(id) ON DELETE SET NULL,
  external_id text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  net_amount numeric(15,2),
  fee_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'BRL',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'chargeback')),
  payment_method text CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer')),
  payment_provider text CHECK (payment_provider IN ('stripe', 'pagarme', 'mercadopago', 'internal')),
  provider_transaction_id text,
  description text,
  customer_email text,
  customer_name text,
  customer_document text,
  metadata jsonb DEFAULT '{}'::jsonb,
  installments integer DEFAULT 1,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  environment text DEFAULT 'test' CHECK (environment IN ('test', 'production')),
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  permissions jsonb DEFAULT '["read", "write"]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  is_active boolean DEFAULT true,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create webhooks"
  ON webhooks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own webhooks"
  ON webhooks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own webhooks"
  ON webhooks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id uuid REFERENCES webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'won', 'lost', 'closed')),
  amount numeric(15,2) NOT NULL,
  evidence_text text,
  evidence_files jsonb DEFAULT '[]'::jsonb,
  provider_dispute_id text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category text,
  assigned_to uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin Roles
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'support', 'financial')),
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public settings are viewable"
  ON system_settings FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Fees Configuration
CREATE TABLE IF NOT EXISTS fees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method text NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer')),
  percentage numeric(5,4) NOT NULL CHECK (percentage >= 0),
  fixed_amount numeric(10,2) DEFAULT 0 CHECK (fixed_amount >= 0),
  installment_percentage numeric(5,4),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fees"
  ON fees FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to create wallet on user signup
CREATE OR REPLACE FUNCTION create_wallet_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, available_balance, pending_balance)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create wallet
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_wallet_on_signup();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE wallets
    SET 
      balance = balance + NEW.net_amount,
      available_balance = available_balance + NEW.net_amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
    UPDATE wallets
    SET 
      balance = balance - NEW.net_amount,
      available_balance = available_balance - NEW.net_amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update wallet on transaction status change
DROP TRIGGER IF EXISTS on_transaction_status_changed ON transactions;
CREATE TRIGGER on_transaction_status_changed
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_wallet_balance();

-- Insert default fee structure
INSERT INTO fees (payment_method, percentage, fixed_amount, is_active) VALUES
  ('credit_card', 0.0399, 0.39, true),
  ('debit_card', 0.0299, 0.29, true),
  ('pix', 0.0099, 0, true),
  ('boleto', 0.0199, 2.50, true),
  ('bank_transfer', 0.0149, 0, true)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_slug ON payment_links(slug);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);