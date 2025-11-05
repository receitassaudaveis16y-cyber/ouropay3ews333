/*
  # Tabelas para 2FA e Links de Pagamento

  ## Tabelas Criadas
  
  ### user_mfa_settings
  - Armazena configurações de 2FA por usuário
  - `id` (uuid, primary key)
  - `user_id` (uuid, referência para auth.users)
  - `is_enabled` (boolean) - Se o 2FA está ativado
  - `secret` (text) - Secret do TOTP para gerar códigos
  - `backup_codes` (jsonb) - Códigos de backup em caso de perda do dispositivo
  - `created_at` (timestamptz)
  - `enabled_at` (timestamptz) - Quando foi ativado
  
  ### payment_links
  - Armazena links de pagamento criados pelos usuários
  - `id` (uuid, primary key)
  - `user_id` (uuid, referência para auth.users)
  - `title` (text) - Título do produto/serviço
  - `description` (text) - Descrição
  - `amount` (numeric) - Valor em centavos
  - `slug` (text, unique) - Slug único para o link
  - `is_active` (boolean) - Se o link está ativo
  - `clicks` (integer) - Número de cliques
  - `sales` (integer) - Número de vendas
  - `metadata` (jsonb) - Metadados adicionais
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Usuários podem ver e gerenciar apenas suas próprias configurações
  - Policies restritivas para garantir segurança
*/

-- TABELA: user_mfa_settings
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled boolean DEFAULT false,
  secret text,
  backup_codes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  enabled_at timestamptz
);

ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MFA settings" ON user_mfa_settings FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA settings" ON user_mfa_settings FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings" ON user_mfa_settings FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABELA: payment_links
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  amount numeric NOT NULL CHECK (amount > 0),
  slug text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  sales integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment links" ON payment_links FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment links" ON payment_links FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment links" ON payment_links FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment links" ON payment_links FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- Policy para permitir acesso público aos links de pagamento (para quando alguém clicar no link)
CREATE POLICY "Anyone can view active payment links by slug" ON payment_links FOR SELECT TO anon
  USING (is_active = true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_slug ON payment_links(slug);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_links_updated_at
  BEFORE UPDATE ON payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_links_updated_at();
