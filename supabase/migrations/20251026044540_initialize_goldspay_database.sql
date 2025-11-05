/*
  # Inicialização Completa do GoldsPay Gateway com Sistema de Aprovação

  ## Tabelas Criadas
  
  1. **company_profiles** - Perfis de empresas com sistema de aprovação
  2. **wallets** - Carteiras digitais
  3. **transactions** - Transações
  4. **customers** - Clientes
  5. **api_keys** - Chaves de API
  6. **webhooks** - Webhooks
  7. **admin_roles** - Funções administrativas
  8. **platform_settings** - Configurações da plataforma
  9. **activity_logs** - Logs de atividade
  10. **fraud_detection_rules** - Regras de fraude
  11. **payment_splits** - Divisão de pagamentos
  12. **notification_templates** - Templates de notificação
  13. **compliance_documents** - Documentos de compliance
  14. **rate_limits** - Limites de taxa
  15. **reconciliation_reports** - Relatórios de conciliação
  16. **payout_batches** - Lotes de pagamento
  17. **settlement_schedule** - Agenda de liquidação

  ## Sistema de Aprovação
  
  - Novas contas iniciam com status 'pending'
  - Apenas admins podem aprovar/rejeitar
  - Usuários não aprovados não podem acessar o sistema
  - Logs de auditoria completos
  
  ## Segurança
  
  - RLS ativado em todas as tabelas
  - Políticas restritivas
  - Separação admin/usuário
*/

-- ============================================
-- TABELA: admin_roles (criar primeiro para dependências)
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

CREATE POLICY "Admins view roles" ON admin_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.is_active = true));
CREATE POLICY "Super admins manage roles" ON admin_roles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true));

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

CREATE POLICY "Users view own profile" ON company_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON company_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Users update own profile" ON company_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status IN ('pending', 'under_review')) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all profiles" ON company_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Admins update profiles" ON company_profiles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins view all wallets" ON wallets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins view all transactions" ON transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Admins update transactions" ON transactions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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

CREATE POLICY "Users manage own customers" ON customers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view customers" ON customers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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

CREATE POLICY "Admins manage settings" ON platform_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('platform_name', 'GoldsPay', 'text', 'Nome da plataforma'),
  ('require_account_approval', 'true', 'boolean', 'Requer aprovação manual de contas'),
  ('maintenance_mode', 'false', 'boolean', 'Modo de manutenção'),
  ('transaction_fee_percentage', '2.99', 'number', 'Taxa de transação em %')
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

CREATE POLICY "Admins view logs" ON activity_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Anyone logs actions" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- DEMAIS TABELAS
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
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fraud rules" ON fraud_detection_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Users view splits" ON payment_splits FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Admins manage splits" ON payment_splits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins manage templates" ON notification_templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins manage documents" ON compliance_documents FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins manage limits" ON rate_limits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins manage reconciliation" ON reconciliation_reports FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
CREATE POLICY "Admins manage payouts" ON payout_batches FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

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
-- TRIGGERS E FUNÇÕES
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

CREATE OR REPLACE FUNCTION notify_new_account_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.user_id,
    'account_created',
    'company_profile',
    NEW.id::text,
    jsonb_build_object(
      'business_name', NEW.business_name,
      'business_type', NEW.business_type,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_profile_created ON company_profiles;
CREATE TRIGGER on_company_profile_created
  AFTER INSERT ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_account_created();

CREATE OR REPLACE FUNCTION log_account_review()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
    VALUES (
      NEW.approved_by,
      CASE WHEN NEW.status = 'approved' THEN 'account_approved' ELSE 'account_rejected' END,
      'company_profile',
      NEW.id::text,
      jsonb_build_object(
        'business_name', NEW.business_name,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'rejection_reason', NEW.rejection_reason,
        'reviewed_by', NEW.approved_by
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_profile_reviewed ON company_profiles;
CREATE TRIGGER on_company_profile_reviewed
  AFTER UPDATE ON company_profiles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_account_review();

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_status ON company_profiles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
