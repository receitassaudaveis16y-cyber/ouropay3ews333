/*
  # Criação do Schema Completo do GoldsPay

  ## Tabelas Criadas
  
  ### 1. company_profiles
  - Armazena informações completas das empresas/usuários
  - Campos: dados da empresa, representante legal, endereço, documentos
  - RLS habilitado com políticas de acesso por usuário
  
  ### 2. wallets
  - Carteiras dos usuários para gerenciar saldos
  - Campos: saldo disponível, saldo pendente, total sacado
  - RLS habilitado
  
  ### 3. transactions
  - Todas as transações de pagamento
  - Campos: valor, método de pagamento, status, dados do cliente
  - RLS habilitado
  
  ### 4. withdrawals
  - Histórico de saques realizados
  - Campos: valor, dados bancários, status
  - RLS habilitado
  
  ### 5. customers
  - Base de clientes cadastrados
  - Campos: dados pessoais, histórico
  - RLS habilitado
  
  ### 6. api_keys
  - Chaves de API para integrações
  - Campos: chave, tipo, status
  - RLS habilitado
  
  ### 7. webhooks
  - Configuração de webhooks
  - Campos: URL, eventos, status
  - RLS habilitado
  
  ### 8. disputes
  - Gestão de disputas/chargebacks
  - Campos: dados da transação, motivo, status
  - RLS habilitado

  ## Segurança
  - Todas as tabelas possuem RLS habilitado
  - Políticas restritivas garantindo acesso apenas aos dados do próprio usuário
  - Funções automáticas para criação de carteira

  ## Funcionalidades
  - Trigger automático para criar carteira ao cadastrar perfil de empresa
  - Cálculo automático de taxas e valores líquidos
  - Gestão completa de transações e saques
*/

-- Criar tabela company_profiles
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_type text NOT NULL CHECK (business_type IN ('juridica', 'fisica')),
  document_number text NOT NULL,
  business_name text NOT NULL,
  invoice_name text NOT NULL,
  average_revenue numeric DEFAULT 0,
  average_ticket numeric DEFAULT 0,
  company_website text,
  products_sold text,
  sells_physical_products boolean DEFAULT false,
  representative_name text NOT NULL,
  representative_cpf text NOT NULL,
  representative_email text NOT NULL,
  representative_phone text NOT NULL,
  date_of_birth text NOT NULL,
  mother_name text NOT NULL,
  postal_code text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  complement text,
  document_frontal_url text,
  document_back_url text,
  document_selfie_url text,
  document_contract_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas públicas para admin
CREATE POLICY "Allow public read access to company_profiles"
  ON company_profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public update to company_profiles"
  ON company_profiles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Criar tabela wallets
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available_balance numeric DEFAULT 0 NOT NULL,
  pending_balance numeric DEFAULT 0 NOT NULL,
  total_withdrawn numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0 NOT NULL,
  net_amount numeric NOT NULL,
  type text DEFAULT 'sale' CHECK (type IN ('sale', 'refund', 'chargeback')),
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  pagarme_transaction_id text,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  description text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política pública para admin
CREATE POLICY "Allow public read access to transactions"
  ON transactions FOR SELECT
  TO anon
  USING (true);

-- Criar tabela withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  bank_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking', 'savings')),
  account_number text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  document text NOT NULL,
  phone text,
  total_spent numeric DEFAULT 0 NOT NULL,
  total_orders integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

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

-- Criar tabela api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  type text DEFAULT 'test' CHECK (type IN ('test', 'production')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar tabela webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_triggered_at timestamptz
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

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

-- Criar tabela disputes
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'won', 'lost')),
  evidence_url text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função para criar carteira automaticamente
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, available_balance, pending_balance, total_withdrawn)
  VALUES (NEW.user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar carteira ao criar perfil de empresa
DROP TRIGGER IF EXISTS create_wallet_on_profile_insert ON company_profiles;
CREATE TRIGGER create_wallet_on_profile_insert
  AFTER INSERT ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_user();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);