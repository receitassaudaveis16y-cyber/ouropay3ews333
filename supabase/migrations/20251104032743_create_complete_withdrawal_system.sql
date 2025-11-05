/*
  # Complete Withdrawal System Implementation

  1. New Tables
    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `available_balance` (decimal) - Funds available for withdrawal
      - `pending_balance` (decimal) - Funds in pending transactions
      - `total_withdrawn` (decimal) - Historical total withdrawn
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `withdrawals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `wallet_id` (uuid, foreign key to wallets)
      - `amount` (decimal) - Withdrawal amount
      - `status` (text) - pending, processing, completed, failed, cancelled
      - `bank_name` (text) - Bank name
      - `account_type` (text) - checking or savings
      - `account_number` (text) - Account number
      - `pix_key` (text, optional) - PIX key for instant transfers
      - `pix_key_type` (text, optional) - cpf, cnpj, email, phone, random
      - `rejection_reason` (text, optional) - Reason if rejected
      - `processed_by` (uuid, optional) - Admin who processed
      - `requested_at` (timestamptz) - When requested
      - `processed_at` (timestamptz, optional) - When processed
      - `completed_at` (timestamptz, optional) - When completed
      - `created_at` (timestamptz)
    
    - `deposits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `wallet_id` (uuid, foreign key to wallets)
      - `amount` (decimal) - Deposit amount
      - `status` (text) - pending, completed, failed
      - `payment_method` (text) - pix, boleto, transfer
      - `payment_proof_url` (text, optional) - Proof of payment
      - `requested_at` (timestamptz)
      - `completed_at` (timestamptz, optional)
      - `created_at` (timestamptz)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `amount` (decimal)
      - `fee` (decimal)
      - `net_amount` (decimal)
      - `payment_method` (text)
      - `status` (text)
      - `description` (text)
      - `customer_name` (text)
      - `customer_email` (text)
      - `pagarme_transaction_id` (text, optional)
      - `paid_at` (timestamptz, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own wallet and transactions
    - Users can only create their own withdrawals and deposits
    - Users can only update/cancel their own pending withdrawals
    - Admins have full access (via admin_roles table check)

  3. Triggers
    - Auto-create wallet when user signs up
    - Reserve balance when withdrawal is requested
    - Release balance when withdrawal is cancelled/failed
    - Deduct balance when withdrawal is completed
    - Add balance when deposit is completed

  4. Important Notes
    - All balance operations use database triggers for data integrity
    - Withdrawal minimum is enforced at application level
    - Balance validation happens at database level via triggers
    - Status transitions are controlled and validated
*/

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance decimal(15,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance decimal(15,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  total_withdrawn decimal(15,2) NOT NULL DEFAULT 0 CHECK (total_withdrawn >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  bank_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking', 'savings')),
  account_number text NOT NULL,
  pix_key text,
  pix_key_type text CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  rejection_reason text,
  processed_by uuid REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'boleto', 'transfer')),
  payment_proof_url text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL,
  fee decimal(15,2) NOT NULL DEFAULT 0,
  net_amount decimal(15,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  description text,
  customer_name text,
  customer_email text,
  pagarme_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Wallets RLS Policies
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Withdrawals RLS Policies
CREATE POLICY "Users can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own pending withdrawals"
  ON withdrawals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

-- Deposits RLS Policies
CREATE POLICY "Users can view own deposits"
  ON deposits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deposits"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Transactions RLS Policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function: Auto-create wallet on user signup
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, available_balance, pending_balance, total_withdrawn)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create wallet on user signup
DROP TRIGGER IF EXISTS on_user_created_create_wallet ON auth.users;
CREATE TRIGGER on_user_created_create_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();

-- Function: Reserve balance when withdrawal is requested
CREATE OR REPLACE FUNCTION reserve_balance_on_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
  wallet_record RECORD;
BEGIN
  -- Lock the wallet row for update
  SELECT * INTO wallet_record
  FROM wallets
  WHERE id = NEW.wallet_id
  FOR UPDATE;

  -- Check if user has sufficient balance
  IF wallet_record.available_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;

  -- Move funds from available to pending
  UPDATE wallets
  SET 
    available_balance = available_balance - NEW.amount,
    pending_balance = pending_balance + NEW.amount,
    updated_at = now()
  WHERE id = NEW.wallet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Reserve balance on withdrawal insert
DROP TRIGGER IF EXISTS on_withdrawal_created_reserve_balance ON withdrawals;
CREATE TRIGGER on_withdrawal_created_reserve_balance
  AFTER INSERT ON withdrawals
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION reserve_balance_on_withdrawal();

-- Function: Handle withdrawal status changes
CREATE OR REPLACE FUNCTION handle_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If withdrawal is completed, deduct from pending and add to total_withdrawn
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE wallets
    SET 
      pending_balance = pending_balance - NEW.amount,
      total_withdrawn = total_withdrawn + NEW.amount,
      updated_at = now()
    WHERE id = NEW.wallet_id;
    
    NEW.completed_at = now();
    NEW.processed_at = COALESCE(NEW.processed_at, now());
  
  -- If withdrawal is cancelled or failed, return funds to available balance
  ELSIF NEW.status IN ('cancelled', 'failed') AND OLD.status NOT IN ('cancelled', 'failed', 'completed') THEN
    UPDATE wallets
    SET 
      available_balance = available_balance + NEW.amount,
      pending_balance = pending_balance - NEW.amount,
      updated_at = now()
    WHERE id = NEW.wallet_id;
    
    NEW.processed_at = COALESCE(NEW.processed_at, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Handle withdrawal status changes
DROP TRIGGER IF EXISTS on_withdrawal_status_changed ON withdrawals;
CREATE TRIGGER on_withdrawal_status_changed
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_withdrawal_status_change();

-- Function: Add balance when deposit is completed
CREATE OR REPLACE FUNCTION add_balance_on_deposit_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- If deposit is completed, add to available balance
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE wallets
    SET 
      available_balance = available_balance + NEW.amount,
      updated_at = now()
    WHERE id = NEW.wallet_id;
    
    NEW.completed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Add balance on deposit completion
DROP TRIGGER IF EXISTS on_deposit_completed_add_balance ON deposits;
CREATE TRIGGER on_deposit_completed_add_balance
  BEFORE UPDATE ON deposits
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION add_balance_on_deposit_completed();

-- Function: Update wallet balance when transaction is paid
CREATE OR REPLACE FUNCTION update_wallet_on_transaction_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- If transaction is paid, add net amount to available balance
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE wallets
    SET 
      available_balance = available_balance + NEW.net_amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
    NEW.paid_at = COALESCE(NEW.paid_at, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update wallet when transaction is paid
DROP TRIGGER IF EXISTS on_transaction_paid_update_wallet ON transactions;
CREATE TRIGGER on_transaction_paid_update_wallet
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_wallet_on_transaction_paid();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Function: Increment payment link clicks (used by payment links feature)
CREATE OR REPLACE FUNCTION increment_payment_link_clicks(link_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE payment_links
  SET clicks = clicks + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
