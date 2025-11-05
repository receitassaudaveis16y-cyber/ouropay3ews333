/*
  # Configuração Pagar.me

  1. Nova Tabela
    - `pagarme_config`
      - `id` (uuid, primary key)
      - `secret_key` (text)
      - `public_key` (text)
      - `account_id` (text)
      - `webhook_url` (text)
      - `is_active` (boolean)
      - `environment` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS
    - Acesso público para leitura (necessário para processar pagamentos)
*/

-- Criar tabela de configuração do Pagar.me
CREATE TABLE IF NOT EXISTS pagarme_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_key text NOT NULL,
  public_key text NOT NULL,
  account_id text NOT NULL,
  webhook_url text NOT NULL,
  is_active boolean DEFAULT true,
  environment text DEFAULT 'production' CHECK (environment IN ('test', 'production')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pagarme_config ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura para usuários autenticados (necessário para processar pagamentos)
CREATE POLICY "Authenticated users can view active pagarme config"
  ON pagarme_config
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Inserir configuração inicial do Pagar.me
INSERT INTO pagarme_config (
  secret_key,
  public_key,
  account_id,
  webhook_url,
  is_active,
  environment
) VALUES (
  'sk_68bd65abe63f4779aa3dbf4410bd7467',
  'pk_9L6EKEACaTLGKxgo',
  'acc_Q1RD6wzfxspdY67O',
  'https://ouropay.fun/webhook/pagarme',
  true,
  'production'
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pagarme_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pagarme_config_updated_at_trigger
  BEFORE UPDATE ON pagarme_config
  FOR EACH ROW
  EXECUTE FUNCTION update_pagarme_config_updated_at();