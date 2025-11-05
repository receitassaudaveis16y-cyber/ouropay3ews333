/*
  # Create API Keys and Webhooks Tables

  ## Descrição
  Este migration adiciona funcionalidades essenciais para um gateway de pagamento competitivo:
  - Sistema de API Keys para integrações
  - Configuração de Webhooks para notificações
  - Logs de requisições para auditoria
  - Sistema de disputas e chargebacks

  ## 1. Novas Tabelas

  ### `api_keys`
  - `id` (uuid, primary key) - Identificador único
  - `user_id` (uuid, references auth.users) - Usuário dono da chave
  - `name` (text) - Nome descritivo da chave
  - `key_prefix` (text) - Prefixo da chave (ex: pk_live, sk_test)
  - `key_hash` (text) - Hash da chave para segurança
  - `key_display` (text) - Últimos 4 caracteres para display
  - `environment` (text) - Ambiente: 'test' ou 'production'
  - `permissions` (jsonb) - Permissões da chave
  - `is_active` (boolean) - Status da chave
  - `last_used_at` (timestamptz) - Último uso
  - `expires_at` (timestamptz) - Data de expiração
  - `created_at` (timestamptz) - Data de criação

  ### `webhooks`
  - `id` (uuid, primary key) - Identificador único
  - `user_id` (uuid, references auth.users) - Usuário dono do webhook
  - `url` (text) - URL de callback
  - `events` (jsonb) - Eventos que disparam o webhook
  - `secret` (text) - Secret para validação de assinatura
  - `is_active` (boolean) - Status do webhook
  - `retry_count` (integer) - Número de tentativas
  - `last_triggered_at` (timestamptz) - Última vez disparado
  - `created_at` (timestamptz) - Data de criação

  ### `webhook_logs`
  - `id` (uuid, primary key) - Identificador único
  - `webhook_id` (uuid, references webhooks) - Webhook relacionado
  - `event_type` (text) - Tipo de evento
  - `payload` (jsonb) - Dados enviados
  - `response_status` (integer) - Status HTTP da resposta
  - `response_body` (text) - Corpo da resposta
  - `attempt_number` (integer) - Número da tentativa
  - `created_at` (timestamptz) - Data de criação

  ### `disputes`
  - `id` (uuid, primary key) - Identificador único
  - `transaction_id` (uuid, references transactions) - Transação disputada
  - `user_id` (uuid, references auth.users) - Usuário relacionado
  - `type` (text) - Tipo: 'chargeback', 'dispute', 'inquiry'
  - `reason` (text) - Motivo da disputa
  - `amount` (decimal) - Valor disputado
  - `status` (text) - Status: 'open', 'under_review', 'won', 'lost', 'closed'
  - `due_date` (timestamptz) - Data limite para resposta
  - `evidence_url` (text) - URL das evidências
  - `resolution_notes` (text) - Notas da resolução
  - `created_at` (timestamptz) - Data de criação
  - `resolved_at` (timestamptz) - Data de resolução

  ### `api_logs`
  - `id` (uuid, primary key) - Identificador único
  - `user_id` (uuid, references auth.users) - Usuário da requisição
  - `api_key_id` (uuid, references api_keys) - API key usada
  - `endpoint` (text) - Endpoint acessado
  - `method` (text) - Método HTTP
  - `status_code` (integer) - Status da resposta
  - `ip_address` (text) - IP da requisição
  - `user_agent` (text) - User agent
  - `request_body` (jsonb) - Corpo da requisição
  - `response_body` (jsonb) - Corpo da resposta
  - `duration_ms` (integer) - Duração em milissegundos
  - `created_at` (timestamptz) - Data de criação

  ## 2. Segurança
  - RLS habilitado em todas as tabelas
  - Políticas restritivas para acesso apenas aos dados do usuário
  - Índices para performance
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  key_display text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test', 'production')) DEFAULT 'test',
  permissions jsonb DEFAULT '{"read": true, "write": true}'::jsonb,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  url text NOT NULL,
  events jsonb DEFAULT '["transaction.paid", "transaction.failed", "transaction.refunded"]'::jsonb,
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  retry_count integer DEFAULT 3,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempt_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('chargeback', 'dispute', 'inquiry')),
  reason text NOT NULL,
  amount decimal(10, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'under_review', 'won', 'lost', 'closed')) DEFAULT 'open',
  due_date timestamptz,
  evidence_url text,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create api_logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  ip_address text,
  user_agent text,
  request_body jsonb,
  response_body jsonb,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for webhooks
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

-- RLS Policies for webhook_logs
CREATE POLICY "Users can view own webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_logs.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- RLS Policies for disputes
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

-- RLS Policies for api_logs
CREATE POLICY "Users can view own API logs"
  ON api_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);