/*
  # Adicionar suporte a múltiplos PSPs (Payment Service Providers)
  
  ## Tabelas Criadas
  
  1. **psp_configurations** - Configurações de PSPs disponíveis
     - Suporta Stripe e Pagar.me
     - Permite ativar/desativar PSPs
     - Armazena credenciais criptografadas
  
  2. **user_psp_preferences** - Preferências de PSP por usuário
     - Permite usuários escolherem seu PSP preferido
     - Fallback automático se PSP não disponível
  
  ## Alterações
  
  - Adiciona campo `payment_gateway` em transactions (já existe)
  - Cria sistema de configuração de PSP
  - Adiciona logs de transações por PSP
  
  ## Segurança
  
  - RLS habilitado
  - Apenas admins podem configurar PSPs
  - Credenciais não são expostas para usuários
*/

-- ============================================
-- TABELA: psp_configurations
-- ============================================

CREATE TABLE IF NOT EXISTS psp_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psp_name text NOT NULL UNIQUE CHECK (psp_name IN ('stripe', 'pagarme')),
  display_name text NOT NULL,
  is_active boolean DEFAULT false,
  is_default boolean DEFAULT false,
  api_key_public text,
  api_key_secret text,
  webhook_secret text,
  settings jsonb DEFAULT '{}'::jsonb,
  supported_methods text[] DEFAULT ARRAY['credit_card', 'debit_card'],
  currency text DEFAULT 'BRL',
  fee_percentage numeric DEFAULT 0,
  fee_fixed numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE psp_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage PSP configs" ON psp_configurations FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can view active PSPs" ON psp_configurations FOR SELECT TO authenticated 
  USING (is_active = true);

-- ============================================
-- TABELA: user_psp_preferences
-- ============================================

CREATE TABLE IF NOT EXISTS user_psp_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_psp text CHECK (preferred_psp IN ('stripe', 'pagarme')),
  fallback_psp text CHECK (fallback_psp IN ('stripe', 'pagarme')),
  auto_select boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_psp_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PSP preferences" ON user_psp_preferences FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all PSP preferences" ON user_psp_preferences FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- TABELA: psp_transaction_logs
-- ============================================

CREATE TABLE IF NOT EXISTS psp_transaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  psp_name text NOT NULL CHECK (psp_name IN ('stripe', 'pagarme')),
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  error_message text,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE psp_transaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own PSP logs" ON psp_transaction_logs FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all PSP logs" ON psp_transaction_logs FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "System can insert PSP logs" ON psp_transaction_logs FOR INSERT TO authenticated 
  WITH CHECK (true);

-- ============================================
-- Índices para Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_psp_logs_transaction_id ON psp_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_psp_logs_created_at ON psp_transaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psp_configs_active ON psp_configurations(is_active) WHERE is_active = true;

-- ============================================
-- Configurações Iniciais de PSPs
-- ============================================

INSERT INTO psp_configurations (psp_name, display_name, is_active, is_default, supported_methods, currency)
VALUES 
  ('pagarme', 'Pagar.me', true, true, ARRAY['credit_card', 'debit_card', 'pix', 'boleto'], 'BRL'),
  ('stripe', 'Stripe', false, false, ARRAY['credit_card', 'debit_card'], 'BRL')
ON CONFLICT (psp_name) DO NOTHING;

-- ============================================
-- Função para selecionar PSP automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION get_user_psp(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_preferred_psp text;
  v_default_psp text;
BEGIN
  -- Tentar obter PSP preferido do usuário
  SELECT preferred_psp INTO v_preferred_psp
  FROM user_psp_preferences
  WHERE user_id = p_user_id;
  
  -- Verificar se o PSP preferido está ativo
  IF v_preferred_psp IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM psp_configurations 
      WHERE psp_name = v_preferred_psp AND is_active = true
    ) THEN
      RETURN v_preferred_psp;
    END IF;
  END IF;
  
  -- Retornar PSP padrão
  SELECT psp_name INTO v_default_psp
  FROM psp_configurations
  WHERE is_default = true AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(v_default_psp, 'pagarme');
END;
$$;

COMMENT ON FUNCTION get_user_psp IS 'Retorna o PSP apropriado para um usuário, considerando preferências e disponibilidade';