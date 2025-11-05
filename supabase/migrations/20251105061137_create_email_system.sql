/*
  # Sistema de Notificações por Email

  1. Novas Tabelas
    - `email_logs`
      - `id` (uuid, primary key)
      - `recipient` (text) - Email do destinatário
      - `subject` (text) - Assunto do email
      - `type` (text) - Tipo: payment_received, withdrawal_approved, account_created, etc
      - `status` (text) - Status: sent, failed, pending
      - `provider_id` (text) - ID do provedor (Resend)
      - `error_message` (text) - Mensagem de erro se falhou
      - `sent_at` (timestamp)
      - `created_at` (timestamp)
    
    - `email_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `payment_notifications` (boolean) - Notificações de pagamento
      - `withdrawal_notifications` (boolean) - Notificações de saque
      - `marketing_emails` (boolean) - Emails de marketing
      - `security_alerts` (boolean) - Alertas de segurança
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS em todas as tabelas
    - Políticas para usuários verem apenas seus próprios dados
    - Admins podem ver todos os dados
*/

-- Tabela de logs de email
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.is_active = true
    )
  );

-- Tabela de preferências de email
CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_notifications boolean DEFAULT true,
  withdrawal_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  security_alerts boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Função para criar preferências de email ao criar usuário
CREATE OR REPLACE FUNCTION create_email_preferences_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar preferências automaticamente
DROP TRIGGER IF EXISTS on_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_email_preferences_for_user();

-- Função para enviar notificação de pagamento
CREATE OR REPLACE FUNCTION notify_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  user_prefs record;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    SELECT * INTO user_prefs
    FROM email_preferences
    WHERE user_id = NEW.user_id;
    
    IF user_prefs.payment_notifications = true THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'to', user_email,
          'subject', 'Pagamento Recebido - GoldsPay',
          'type', 'payment_received',
          'html', '<h1>Pagamento Recebido!</h1><p>Você recebeu um pagamento de ' || NEW.amount || '.</p>'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificar pagamento
DROP TRIGGER IF EXISTS on_payment_received ON transactions;
CREATE TRIGGER on_payment_received
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_received();

-- Função para notificar saque aprovado
CREATE OR REPLACE FUNCTION notify_withdrawal_status()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  user_prefs record;
  email_subject text;
  email_body text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    SELECT * INTO user_prefs
    FROM email_preferences
    WHERE user_id = NEW.user_id;
    
    IF user_prefs.withdrawal_notifications = true THEN
      email_subject := 'Saque Aprovado - GoldsPay';
      email_body := '<h1>Saque Aprovado!</h1><p>Seu saque de ' || NEW.amount || ' foi aprovado e será processado em breve.</p>';
      
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'to', user_email,
          'subject', email_subject,
          'type', 'withdrawal_approved',
          'html', email_body
        )
      );
    END IF;
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    SELECT * INTO user_prefs
    FROM email_preferences
    WHERE user_id = NEW.user_id;
    
    IF user_prefs.withdrawal_notifications = true THEN
      email_subject := 'Saque Rejeitado - GoldsPay';
      email_body := '<h1>Saque Rejeitado</h1><p>Seu saque de ' || NEW.amount || ' foi rejeitado.</p><p>Motivo: ' || COALESCE(NEW.rejection_reason, 'Não especificado') || '</p>';
      
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'to', user_email,
          'subject', email_subject,
          'type', 'withdrawal_rejected',
          'html', email_body
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificar saque
DROP TRIGGER IF EXISTS on_withdrawal_status_change ON withdrawals;
CREATE TRIGGER on_withdrawal_status_change
  AFTER UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION notify_withdrawal_status();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
