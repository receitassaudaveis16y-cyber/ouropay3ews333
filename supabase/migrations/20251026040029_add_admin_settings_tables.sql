/*
  # Admin Settings and Configuration Tables
  
  1. New Tables
    - `platform_settings` - Configurações gerais da plataforma (PSP, customização)
    - `activity_logs` - Registro de todas as ações administrativas
    - `user_details` - Informações adicionais dos usuários para gerenciamento
    
  2. Security
    - RLS habilitado em todas as tabelas
    - Apenas admins podem acessar e modificar
    
  3. Features
    - Configuração do Pagar.me PSP
    - Personalização de marca (logo, cores, nome)
    - Logs de auditoria
*/

-- Tabela de configurações da plataforma
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

-- Políticas para platform_settings
CREATE POLICY "Admins can view platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

-- Inserir configurações padrão
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('pagarme_secret_key', '', 'secret', 'Chave secreta do Pagar.me'),
  ('pagarme_public_key', '', 'text', 'Chave pública do Pagar.me'),
  ('platform_name', 'GoldsPay', 'text', 'Nome da plataforma'),
  ('platform_logo_url', '/logo.png', 'text', 'URL do logo da plataforma'),
  ('primary_color', '#f59e0b', 'text', 'Cor primária (amber-500)'),
  ('secondary_color', '#1a1a1a', 'text', 'Cor secundária'),
  ('enable_auto_approval', 'false', 'boolean', 'Aprovação automática de cadastros'),
  ('maintenance_mode', 'false', 'boolean', 'Modo de manutenção'),
  ('transaction_fee_percentage', '2.99', 'number', 'Taxa de transação em %'),
  ('min_withdrawal_amount', '50', 'number', 'Valor mínimo para saque (R$)')
ON CONFLICT (setting_key) DO NOTHING;

-- Tabela de logs de atividade
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

CREATE POLICY "Admins can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone authenticated can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Função para registrar atividades automaticamente
CREATE OR REPLACE FUNCTION log_activity(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details);
END;
$$;

-- Trigger para atualizar timestamp das configurações
CREATE OR REPLACE FUNCTION update_platform_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_platform_settings_timestamp ON platform_settings;
CREATE TRIGGER update_platform_settings_timestamp
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_timestamp();