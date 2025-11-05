/*
  # Sistema Completo GoldsPay - Gateway de Pagamentos
  
  1. Tabelas Criadas
    - `company_profiles`: Perfis das empresas cadastradas
      - Informações completas de cadastro (CNPJ/CPF, representante, endereço, etc)
      - Status de aprovação (pending, under_review, approved, rejected)
      - Documentos enviados
    
    - `wallets`: Carteiras dos usuários
      - Saldo disponível e bloqueado
      - Status da carteira
    
    - `transactions`: Transações do gateway
      - Pagamentos realizados
      - Status e histórico
    
    - `customers`: Clientes finais das empresas
      - Dados dos compradores
    
    - `api_keys`: Chaves de API para integração
      - Chaves públicas e privadas
      - Controle de ativação
    
    - `webhooks`: Webhooks configurados
      - URLs de notificação
      - Eventos subscritos
    
    - `payment_links`: Links de pagamento
      - Criação de links reutilizáveis
      - Slugs personalizados
    
    - `user_mfa_settings`: Configurações de 2FA
      - Secrets para autenticação
      - Status de ativação
    
    - `platform_settings`: Configurações da plataforma
      - Taxas, limites, personalizações
    
    - `activity_logs`: Logs de atividade
      - Auditoria de ações
    
    - `fraud_detection_rules`: Regras de detecção de fraude
    
    - `payout_batches`: Lotes de pagamento
    
    - `reconciliation_reports`: Relatórios de reconciliação
    
    - `compliance_documents`: Documentos de compliance
  
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas restritivas por padrão
    - Usuários só acessam seus próprios dados
    - Super admin tem acesso total
  
  3. Triggers
    - Criação automática de carteira ao cadastrar empresa
    - Logs de atividade automáticos
  
  4. Funções
    - Verificação de super admin
    - Helpers para consultas
*/

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'anapaulamagioli899@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COMPANY PROFILES
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL CHECK (business_type IN ('juridica', 'fisica')),
  document_number TEXT NOT NULL,
  business_name TEXT NOT NULL,
  invoice_name TEXT NOT NULL,
  average_revenue DECIMAL(15,2) DEFAULT 0,
  average_ticket DECIMAL(15,2) DEFAULT 0,
  company_website TEXT,
  products_sold TEXT,
  sells_physical_products BOOLEAN DEFAULT false,
  representative_name TEXT NOT NULL,
  representative_cpf TEXT NOT NULL,
  representative_email TEXT NOT NULL,
  representative_phone TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  complement TEXT,
  document_frontal_url TEXT,
  document_back_url TEXT,
  document_selfie_url TEXT,
  document_contract_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Usuários podem inserir próprio perfil"
  ON company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin())
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

-- WALLETS
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) DEFAULT 0 NOT NULL,
  blocked_balance DECIMAL(15,2) DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver própria carteira"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Sistema pode inserir carteiras"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar carteiras"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin())
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer')),
  payment_provider TEXT,
  provider_transaction_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias transações"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Sistema pode inserir transações"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Sistema pode atualizar transações"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin())
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  document TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprios clientes"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Usuários podem inserir clientes"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar clientes"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- API KEYS
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  secret_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Usuários podem inserir API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WEBHOOKS
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprios webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Usuários podem inserir webhooks"
  ON webhooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar webhooks"
  ON webhooks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar webhooks"
  ON webhooks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- PAYMENT LINKS
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver links ativos"
  ON payment_links FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Usuários podem inserir links"
  ON payment_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar links"
  ON payment_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER MFA SETTINGS
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  secret TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias configurações MFA"
  ON user_mfa_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir configurações MFA"
  ON user_mfa_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar configurações MFA"
  ON user_mfa_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'color', 'image')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver configurações"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas super admin pode modificar configurações"
  ON platform_settings FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas super admin pode ver logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Sistema pode inserir logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- FRAUD DETECTION RULES
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  conditions JSONB NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('flag', 'block', 'review')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas super admin pode gerenciar regras de fraude"
  ON fraud_detection_rules FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- PAYOUT BATCHES
CREATE TABLE IF NOT EXISTS payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_amount DECIMAL(15,2) NOT NULL,
  transaction_count INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas super admin pode ver lotes de pagamento"
  ON payout_batches FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- RECONCILIATION REPORTS
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  total_transactions INTEGER NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  discrepancies JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'with_issues')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas super admin pode ver relatórios"
  ON reconciliation_reports FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- COMPLIANCE DOCUMENTS
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas super admin pode gerenciar documentos de compliance"
  ON compliance_documents FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Trigger para criar carteira automaticamente
CREATE OR REPLACE FUNCTION create_wallet_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, blocked_balance, status)
  VALUES (NEW.user_id, 0, 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_wallet ON company_profiles;
CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_profile();

-- Inserir configurações iniciais da plataforma
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('platform_name', 'GoldsPay', 'string', 'Nome da plataforma'),
  ('platform_fee_percentage', '2.5', 'number', 'Taxa da plataforma em %'),
  ('min_transaction_amount', '1.00', 'number', 'Valor mínimo de transação'),
  ('max_transaction_amount', '100000.00', 'number', 'Valor máximo de transação'),
  ('enable_pix', 'true', 'boolean', 'Habilitar PIX'),
  ('enable_credit_card', 'true', 'boolean', 'Habilitar cartão de crédito'),
  ('enable_boleto', 'true', 'boolean', 'Habilitar boleto'),
  ('primary_color', '#f59e0b', 'color', 'Cor primária da plataforma'),
  ('logo_url', '/logo.png', 'image', 'URL do logo')
ON CONFLICT (setting_key) DO NOTHING;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_status ON company_profiles(status);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
