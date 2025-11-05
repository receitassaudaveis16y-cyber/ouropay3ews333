/*
  # Corrigir política de INSERT para wallets

  ## Alterações
  - Adiciona política de INSERT para permitir que o trigger crie carteiras automaticamente
  - O trigger usa SECURITY DEFINER para bypass de RLS durante a criação da carteira
*/

-- Adicionar política para permitir que o sistema insira wallets via trigger
CREATE POLICY "System can insert wallets" ON wallets FOR INSERT TO authenticated WITH CHECK (true);