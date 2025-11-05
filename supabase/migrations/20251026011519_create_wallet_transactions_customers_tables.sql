/*
  # Create Wallet, Transactions and Customers Tables

  1. New Tables
    - `wallets` - Carteira dos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `available_balance` (decimal) - Saldo disponível para saque
      - `pending_balance` (decimal) - Saldo pendente de transações
      - `total_withdrawn` (decimal) - Total já sacado
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `transactions` - Transações de pagamento
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `customer_id` (uuid, references customers)
      - `amount` (decimal) - Valor da transação
      - `fee` (decimal) - Taxa cobrada
      - `net_amount` (decimal) - Valor líquido
      - `payment_method` (text) - pix, credit_card, boleto
      - `status` (text) - pending, paid, failed, refunded
      - `description` (text)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `paid_at` (timestamptz)
      - `created_at` (timestamptz)
      
    - `customers` - Clientes
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `document` (text) - CPF/CNPJ
      - `total_spent` (decimal)
      - `total_transactions` (integer)
      - `first_purchase_at` (timestamptz)
      - `last_purchase_at` (timestamptz)
      - `created_at` (timestamptz)

    - `withdrawals` - Saques da carteira
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `wallet_id` (uuid, references wallets)
      - `amount` (decimal)
      - `status` (text) - pending, processing, completed, failed
      - `bank_name` (text)
      - `account_type` (text)
      - `account_number` (text)
      - `requested_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  available_balance decimal(12, 2) DEFAULT 0 NOT NULL,
  pending_balance decimal(12, 2) DEFAULT 0 NOT NULL,
  total_withdrawn decimal(12, 2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  document text,
  total_spent decimal(12, 2) DEFAULT 0 NOT NULL,
  total_transactions integer DEFAULT 0 NOT NULL,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  customer_id uuid REFERENCES customers(id),
  amount decimal(12, 2) NOT NULL,
  fee decimal(12, 2) DEFAULT 0 NOT NULL,
  net_amount decimal(12, 2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  description text,
  customer_name text,
  customer_email text,
  customer_phone text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  wallet_id uuid REFERENCES wallets(id) NOT NULL,
  amount decimal(12, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  bank_name text,
  account_type text,
  account_number text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status);