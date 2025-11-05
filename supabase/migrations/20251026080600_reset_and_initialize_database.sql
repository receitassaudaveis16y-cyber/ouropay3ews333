/*
  # Reinicialização Completa do GoldsPay Gateway
  
  ## Tabelas Criadas
  
  1. **admin_roles** - Funções administrativas
  2. **company_profiles** - Perfis de empresas com aprovação
  3. **wallets** - Carteiras digitais
  4. **transactions** - Transações
  5. **customers** - Clientes
  6. **api_keys** - Chaves de API
  7. **webhooks** - Configurações de webhook
  8. **platform_settings** - Configurações da plataforma
  9. **activity_logs** - Logs de auditoria
  10. **fraud_detection_rules** - Regras antifraude
  11. **payment_splits** - Split de pagamentos
  12. **notification_templates** - Templates de notificação
  13. **compliance_documents** - Documentos de compliance
  14. **rate_limits** - Controle de taxa
  15. **reconciliation_reports** - Relatórios de conciliação
  16. **payout_batches** - Lotes de pagamento
  17. **settlement_schedule** - Agenda de liquidação
  
  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas restritivas por padrão
  - Separação de permissões admin/usuário
*/

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

CREATE POLICY "Admins can view roles" ON admin_roles FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.is_active = true));

CREATE POLICY "Super admins can manage roles" ON admin_roles FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true));

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
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON company_profiles FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON company_profiles FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON company_profiles FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON company_profiles FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Admins can update profiles for approval" ON company_profiles FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: wallets
-- ============================================

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  available_balance numeric DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric DEFAULT 0 CHECK (pending_balance >= 0),
  currency text DEFAULT 'BRL',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON wallets FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "System can insert wallets" ON wallets FOR INSERT TO authenticated 
  WITH CHECK (true);

-- ============================================
-- TABELA: transactions
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL CHECK (amount > 0),
  net_amount numeric,
  fee_amount numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'chargeback')),
  payment_method text NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer')),
  payment_gateway text DEFAULT 'pagarme',
  gateway_transaction_id text,
  gateway_response jsonb,
  description text,
  customer_email text,
  customer_name text,
  customer_document text,
  metadata jsonb DEFAULT '{}'::jsonb,
  refund_reason text,
  refunded_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: customers
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  document text,
  phone text,
  address jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own customers" ON customers FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all customers" ON customers FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: api_keys
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name text NOT NULL,
  key_value text NOT NULL UNIQUE,
  key_type text DEFAULT 'production' CHECK (key_type IN ('test', 'production')),
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  permissions jsonb DEFAULT '["read", "write"]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABELA: webhooks
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  is_active boolean DEFAULT true,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own webhooks" ON webhooks FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABELA: platform_settings
-- ============================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  setting_type text DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON platform_settings FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can view public settings" ON platform_settings FOR SELECT TO authenticated 
  USING (is_public = true);

-- ============================================
-- TABELA: activity_logs
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON activity_logs FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Authenticated users can insert logs" ON activity_logs FOR INSERT TO authenticated 
  WITH CHECK (true);

-- ============================================
-- TABELA: fraud_detection_rules
-- ============================================

CREATE TABLE IF NOT EXISTS fraud_detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('amount_threshold', 'velocity', 'blacklist', 'pattern')),
  conditions jsonb NOT NULL,
  action text DEFAULT 'flag' CHECK (action IN ('flag', 'block', 'review')),
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud rules" ON fraud_detection_rules FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: payment_splits
-- ============================================

CREATE TABLE IF NOT EXISTS payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) NOT NULL,
  split_type text DEFAULT 'percentage' CHECK (split_type IN ('percentage', 'fixed')),
  split_value numeric NOT NULL CHECK (split_value >= 0),
  amount numeric NOT NULL CHECK (amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own splits" ON payment_splits FOR SELECT TO authenticated 
  USING (auth.uid() = recipient_id OR EXISTS (
    SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all splits" ON payment_splits FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: notification_templates
-- ============================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  template_type text NOT NULL CHECK (template_type IN ('email', 'sms', 'push')),
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON notification_templates FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: compliance_documents
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('kyc', 'contract', 'terms', 'license', 'certificate')),
  document_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  expiry_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents" ON compliance_documents FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents" ON compliance_documents FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: rate_limits
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  max_requests integer DEFAULT 100,
  window_seconds integer DEFAULT 60,
  current_count integer DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own limits" ON rate_limits FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage rate limits" ON rate_limits FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: reconciliation_reports
-- ============================================

CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  total_transactions integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  total_fees numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  report_data jsonb DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliation" ON reconciliation_reports FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: payout_batches
-- ============================================

CREATE TABLE IF NOT EXISTS payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date date NOT NULL,
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
  transaction_count integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payouts" ON payout_batches FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: settlement_schedule
-- ============================================

CREATE TABLE IF NOT EXISTS settlement_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  schedule_type text DEFAULT 'auto' CHECK (schedule_type IN ('auto', 'manual', 'daily', 'weekly', 'monthly')),
  min_amount numeric DEFAULT 0,
  settlement_day integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settlement_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedule" ON settlement_schedule FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Auto-criar wallet ao criar usuário
-- ============================================

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, available_balance, pending_balance)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_create_wallet ON auth.users;
CREATE TRIGGER on_user_created_create_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();

-- ============================================
-- ÍNDICES para Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_profiles_status ON company_profiles(status);
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================
-- Configurações Iniciais da Plataforma
-- ============================================

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
  ('platform_name', 'GoldsPay', 'string', 'Nome da plataforma', true),
  ('default_fee_percentage', '2.99', 'number', 'Taxa padrão em percentual', false),
  ('max_transaction_amount', '100000', 'number', 'Valor máximo de transação', false),
  ('min_transaction_amount', '1', 'number', 'Valor mínimo de transação', false),
  ('auto_approval_enabled', 'false', 'boolean', 'Aprovação automática de contas', false),
  ('maintenance_mode', 'false', 'boolean', 'Modo de manutenção', true)
ON CONFLICT (setting_key) DO NOTHING;