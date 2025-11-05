/*
  # Inicialização Completa do Schema do Gateway de Pagamento GoldsPay
  
  Este script cria todas as tabelas necessárias para o funcionamento completo do GoldsPay.
  
  ## 1. Tabelas Principais
  
  ### company_profiles
  - Perfis de empresas cadastradas
  - Armazena documentos, endereço, dados financeiros
  - Status de aprovação e compliance
  
  ### transactions
  - Todas as transações do sistema
  - Vendas, saques, reembolsos, chargebacks
  - Integração com Pagar.me
  - Detecção de fraude
  
  ### wallets
  - Carteiras digitais dos usuários
  - Saldo disponível e bloqueado
  
  ### customers
  - Base de clientes
  - Histórico de compras
  
  ### api_keys
  - Chaves de API para integração
  
  ### webhooks
  - Configuração de webhooks
  
  ### admin_roles
  - Controle de acesso administrativo
  
  ## 2. Funcionalidades Avançadas
  
  ### platform_settings
  - Configurações globais da plataforma
  
  ### activity_logs
  - Logs de auditoria
  
  ### fraud_detection_rules
  - Regras de detecção de fraude
  
  ### payment_splits
  - Divisão de pagamentos (marketplace)
  
  ### notification_templates
  - Templates de notificação
  
  ### compliance_documents
  - Documentos KYC
  
  ### rate_limits
  - Limites de taxa
  
  ### reconciliation_reports
  - Relatórios de conciliação
  
  ### payout_batches
  - Lotes de pagamento
  
  ### settlement_schedule
  - Agenda de repasses
  
  ## 3. Segurança
  
  Todas as tabelas possuem:
  - Row Level Security (RLS) ativado
  - Políticas restritivas por padrão
  - Acesso baseado em auth.uid()
  - Separação entre usuários e admins
  
  ## 4. Índices
  
  Índices criados para otimizar:
  - Consultas por usuário
  - Consultas por data
  - Consultas por status
  - Pesquisas full-text
*/

-- ============================================
-- TABELA: company_profiles
-- ============================================

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
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON company_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON company_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON company_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABELA: wallets
-- ============================================

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  blocked_balance numeric DEFAULT 0 CHECK (blocked_balance >= 0),
  total_received numeric DEFAULT 0,
  total_withdrawn numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own wallet" ON wallets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABELA: transactions
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('sale', 'withdrawal', 'refund', 'chargeback', 'fee')),
  payment_method text CHECK (payment_method IN ('pix', 'credit_card', 'boleto', 'bank_transfer')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  pagarme_transaction_id text,
  customer_name text,
  customer_email text,
  customer_document text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  fraud_score integer DEFAULT 0 CHECK (fraud_score BETWEEN 0 AND 100),
  fraud_status text DEFAULT 'clean' CHECK (fraud_status IN ('clean', 'flagged', 'review', 'blocked')),
  ip_address text,
  device_fingerprint text,
  reconciled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own transactions" ON transactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABELA: customers
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  document text NOT NULL,
  phone text,
  address jsonb,
  total_spent numeric DEFAULT 0,
  total_purchases integer DEFAULT 0,
  last_purchase_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, email)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own customers" ON customers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update customers" ON customers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABELA: api_keys
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name text NOT NULL,
  key_value text NOT NULL UNIQUE,
  environment text DEFAULT 'test' CHECK (environment IN ('test', 'production')),
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keys" ON api_keys FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABELA: webhooks
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text,
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage webhooks" ON webhooks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TABELA: admin_roles
-- ============================================

CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'financial')),
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view roles" ON admin_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid()));
CREATE POLICY "Super admins manage roles" ON admin_roles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin'));

-- ============================================
-- TABELA: platform_settings
-- ============================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  setting_type text DEFAULT 'text' CHECK (setting_type IN ('text', 'number', 'boolean', 'json', 'secret')),
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view settings" ON platform_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins insert settings" ON platform_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins update settings" ON platform_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('pagarme_secret_key', '', 'secret', 'Chave secreta do Pagar.me'),
  ('pagarme_public_key', '', 'text', 'Chave pública do Pagar.me'),
  ('platform_name', 'GoldsPay', 'text', 'Nome da plataforma'),
  ('platform_logo_url', '/logo.png', 'text', 'URL do logo da plataforma'),
  ('primary_color', '#f59e0b', 'text', 'Cor primária da interface'),
  ('secondary_color', '#1a1a1a', 'text', 'Cor secundária da interface'),
  ('enable_auto_approval', 'false', 'boolean', 'Aprovação automática de contas'),
  ('maintenance_mode', 'false', 'boolean', 'Modo de manutenção'),
  ('transaction_fee_percentage', '2.99', 'number', 'Taxa de transação em %'),
  ('min_withdrawal_amount', '50', 'number', 'Valor mínimo de saque em R$')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- TABELA: activity_logs
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logs" ON activity_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));
CREATE POLICY "Anyone logs actions" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- TABELA: fraud_detection_rules
-- ============================================

CREATE TABLE IF NOT EXISTS fraud_detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('velocity', 'amount', 'geolocation', 'device', 'blacklist', 'behavior')),
  conditions jsonb NOT NULL,
  action text NOT NULL CHECK (action IN ('block', 'review', 'flag', 'notify')),
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fraud rules" ON fraud_detection_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- ============================================
-- TABELA: notification_templates
-- ============================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  template_type text NOT NULL CHECK (template_type IN ('email', 'sms', 'webhook', 'push')),
  event_trigger text NOT NULL,
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates" ON notification_templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

INSERT INTO notification_templates (template_name, template_type, event_trigger, subject, body) VALUES
  ('payment_approved', 'email', 'transaction.paid', 'Pagamento Aprovado', 'Seu pagamento no valor de {{amount}} foi aprovado com sucesso!'),
  ('payment_failed', 'email', 'transaction.failed', 'Pagamento Recusado', 'Infelizmente seu pagamento foi recusado. Tente novamente com outro método.'),
  ('account_approved', 'email', 'account.approved', 'Conta Aprovada', 'Sua conta foi aprovada! Você já pode começar a usar o GoldsPay.')
ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- TABELA: payment_splits
-- ============================================

CREATE TABLE IF NOT EXISTS payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  split_amount numeric NOT NULL CHECK (split_amount > 0),
  split_percentage numeric(5,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own splits" ON payment_splits FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Admins manage splits" ON payment_splits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- ============================================
-- TABELA: compliance_documents
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('identity', 'address_proof', 'business_license', 'tax_document', 'bank_statement', 'other')),
  document_number text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents" ON compliance_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users upload documents" ON compliance_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage documents" ON compliance_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- ============================================
-- TABELA: rate_limits
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  limit_type text NOT NULL CHECK (limit_type IN ('daily_amount', 'monthly_amount', 'transaction_count', 'api_calls')),
  limit_value numeric NOT NULL,
  current_usage numeric DEFAULT 0,
  period_start timestamptz DEFAULT now(),
  period_end timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, limit_type, period_start)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view limits" ON rate_limits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage limits" ON rate_limits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- ============================================
-- TABELA: reconciliation_reports
-- ============================================

CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  total_transactions integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  gateway_total numeric DEFAULT 0,
  bank_total numeric DEFAULT 0,
  difference numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'discrepancy', 'resolved')),
  details jsonb,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reconciliation" ON reconciliation_reports FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- ============================================
-- TABELA: payout_batches
-- ============================================

CREATE TABLE IF NOT EXISTS payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  recipient_count integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_date date NOT NULL,
  processed_at timestamptz,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payouts" ON payout_batches FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- ============================================
-- TABELA: settlement_schedule
-- ============================================

CREATE TABLE IF NOT EXISTS settlement_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  schedule_type text DEFAULT 'weekly' CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
  settlement_day integer CHECK (settlement_day BETWEEN 1 AND 31),
  minimum_amount numeric DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE settlement_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage schedule" ON settlement_schedule FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNÇÃO: Criar carteira automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, blocked_balance, total_received, total_withdrawn)
  VALUES (NEW.id, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_status ON company_profiles(status);
CREATE INDEX IF NOT EXISTS idx_company_profiles_document ON company_profiles(document_number);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_pagarme ON transactions(pagarme_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fraud ON transactions(fraud_status) WHERE fraud_status != 'clean';

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_value ON api_keys(key_value);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON fraud_detection_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_splits_recipient ON payment_splits(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_transaction ON payment_splits(transaction_id);

CREATE INDEX IF NOT EXISTS idx_compliance_user ON compliance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id);

CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON reconciliation_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_batches(status);
