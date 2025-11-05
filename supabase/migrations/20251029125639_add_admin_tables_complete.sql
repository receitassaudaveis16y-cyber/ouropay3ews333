/*
  # Add Admin Panel Required Tables
  
  1. New Tables
    - `platform_settings` - Platform-wide configuration settings
    - `activity_logs` - Admin activity tracking
    - `fraud_detection_rules` - Fraud prevention rules
    - `payout_batches` - Batch payout management
    - `reconciliation_reports` - Financial reconciliation
    - `compliance_documents` - Compliance tracking
    - `user_registration_status` - User registration flow tracking
    
  2. Security
    - Enable RLS on all tables
    - Admin-only access policies
*/

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  setting_type text DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description text,
  category text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings"
  ON platform_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fraud Detection Rules
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN ('velocity', 'amount', 'pattern', 'blocklist', 'geolocation')),
  condition jsonb NOT NULL,
  action text NOT NULL CHECK (action IN ('block', 'review', 'alert')),
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud rules"
  ON fraud_detection_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Payout Batches
CREATE TABLE IF NOT EXISTS payout_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number text UNIQUE NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  total_transactions integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamptz,
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payout batches"
  ON payout_batches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Reconciliation Reports
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date date NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  total_transactions integer NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_fees numeric(15,2) NOT NULL DEFAULT 0,
  net_amount numeric(15,2) NOT NULL DEFAULT 0,
  discrepancies jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'has_issues')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(report_date, report_type)
);

ALTER TABLE reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliation reports"
  ON reconciliation_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Compliance Documents
CREATE TABLE IF NOT EXISTS compliance_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('identity', 'address_proof', 'business_license', 'tax_registration', 'bank_statement', 'other')),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance documents"
  ON compliance_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upload compliance documents"
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all compliance documents"
  ON compliance_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- User Registration Status
CREATE TABLE IF NOT EXISTS user_registration_status (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL,
  registration_step text DEFAULT 'created' CHECK (registration_step IN ('created', 'company_info', 'documents', 'completed')),
  is_complete boolean DEFAULT false,
  company_data_complete boolean DEFAULT false,
  documents_submitted boolean DEFAULT false,
  documents_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_registration_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registration status"
  ON user_registration_status FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage registration status"
  ON user_registration_status FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all registration statuses"
  ON user_registration_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_rules_priority ON fraud_detection_rules(priority);
CREATE INDEX IF NOT EXISTS idx_payout_batches_status ON payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_date ON reconciliation_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_user_id ON compliance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_status ON compliance_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_registration_status_user_id ON user_registration_status(user_id);

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, category) VALUES
  ('platform_name', 'GoldsPay', 'string', 'Nome da plataforma', 'general'),
  ('platform_logo', '/logo.png', 'string', 'URL do logo', 'branding'),
  ('primary_color', '#f59e0b', 'string', 'Cor primária', 'branding'),
  ('enable_2fa', 'false', 'boolean', 'Habilitar autenticação de 2 fatores', 'security'),
  ('min_withdrawal_amount', '10.00', 'number', 'Valor mínimo de saque', 'payments'),
  ('max_withdrawal_amount', '50000.00', 'number', 'Valor máximo de saque', 'payments'),
  ('withdrawal_processing_days', '2', 'number', 'Dias para processar saques', 'payments'),
  ('enable_pix', 'true', 'boolean', 'Habilitar pagamentos via PIX', 'payments'),
  ('enable_boleto', 'true', 'boolean', 'Habilitar pagamentos via Boleto', 'payments'),
  ('enable_credit_card', 'true', 'boolean', 'Habilitar cartão de crédito', 'payments'),
  ('support_email', 'support@goldspay.com', 'string', 'Email de suporte', 'support'),
  ('support_phone', '+55 11 99999-9999', 'string', 'Telefone de suporte', 'support')
ON CONFLICT (setting_key) DO NOTHING;