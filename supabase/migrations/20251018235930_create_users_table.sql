/*
  # Criar tabela de usuários

  1. Nova Tabela
    - `users`
      - `id` (uuid, chave primária) - Identificador único do usuário
      - `email` (text, único) - Email do usuário
      - `password` (text) - Senha criptografada do usuário
      - `created_at` (timestamptz) - Data de criação do registro
      - `updated_at` (timestamptz) - Data da última atualização

  2. Segurança
    - Habilitar RLS na tabela `users`
    - Política para usuários autenticados lerem seus próprios dados
    - Política para usuários autenticados atualizarem seus próprios dados
    - Política para inserção de novos usuários (registro)

  3. Notas Importantes
    - As senhas devem ser criptografadas antes de serem armazenadas
    - O email é único para evitar duplicatas
    - Timestamps automáticos para rastreamento de criação e atualização
*/

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem seus próprios dados
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política para usuários atualizarem seus próprios dados
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política para inserção (registro de novos usuários)
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Criar índice no email para buscas rápidas
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();