/*
  # Funcionalidades Completas de Gateway de Pagamento
  
  1. Configurações da Plataforma
    - `platform_settings` - Configurações globais (PSP, customização, limites)
    - `activity_logs` - Logs de auditoria de todas as ações
    
  2. Anti-Fraude e Segurança
    - `fraud_detection_rules` - Regras de detecção de fraude
    - Campos de fraude nas transações
    
  3. Marketplace e Splits
    - `payment_splits` - Divisão de pagamentos
    - `settlement_schedule` - Agenda de repasses
    - `payout_batches` - Lotes de pagamento
    
  4. Compliance e KYC
    - `compliance_documents` - Documentos KYC
    
  5. Notificações
    - `notification_templates` - Templates customizáveis
    
  6. Conciliação
    - `reconciliation_reports` - Relatórios de conciliação
    
  7. Controle
    - `rate_limits` - Limites por usuário
*/

-- Platform Settings
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
  ('platform_logo_url', '/logo.png', 'text', 'URL do logo'),
  ('primary_color', '#f59e0b', 'text', 'Cor primária'),
  ('secondary_color', '#1a1a1a', 'text', 'Cor secundária'),
  ('enable_auto_approval', 'false', 'boolean', 'Aprovação automática'),
  ('maintenance_mode', 'false', 'boolean', 'Modo manutenção'),
  ('transaction_fee_percentage', '2.99', 'number', 'Taxa %'),
  ('min_withdrawal_amount', '50', 'number', 'Saque mínimo')
ON CONFLICT (setting_key) DO NOTHING;

-- Activity Logs
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

-- Fraud Detection Rules
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

-- Notification Templates
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
  ('payment_approved', 'email', 'transaction.paid', 'Pagamento Aprovado', 'Seu pagamento foi aprovado!'),
  ('payment_failed', 'email', 'transaction.failed', 'Pagamento Recusado', 'Pagamento recusado.'),
  ('account_approved', 'email', 'account.approved', 'Conta Aprovada', 'Sua conta foi aprovada!')
ON CONFLICT (template_name) DO NOTHING;

-- Payment Splits
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

-- Reconciliation Reports
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

-- Payout Batches
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

-- Compliance Documents
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

-- Rate Limits
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

-- Settlement Schedule
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

-- Add fraud fields to transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fraud_score') THEN
    ALTER TABLE transactions ADD COLUMN fraud_score integer DEFAULT 0 CHECK (fraud_score BETWEEN 0 AND 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fraud_status') THEN
    ALTER TABLE transactions ADD COLUMN fraud_status text DEFAULT 'clean' CHECK (fraud_status IN ('clean', 'flagged', 'review', 'blocked'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'ip_address') THEN
    ALTER TABLE transactions ADD COLUMN ip_address text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'device_fingerprint') THEN
    ALTER TABLE transactions ADD COLUMN device_fingerprint text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reconciled') THEN
    ALTER TABLE transactions ADD COLUMN reconciled boolean DEFAULT false;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON fraud_detection_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_splits_recipient ON payment_splits(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_transaction ON payment_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON reconciliation_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_compliance_user ON compliance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fraud ON transactions(fraud_status) WHERE fraud_status != 'clean';