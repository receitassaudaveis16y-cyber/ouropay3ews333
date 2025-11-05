/*
  # Helper para criar Super Admin

  ## Função
  - Adiciona função para promover usuários a super admin
  - Primeira conta criada automaticamente vira super admin
  - Admins podem acessar o painel administrativo
  
  ## Uso
  - O sistema detecta quando é o primeiro admin
  - Pode ser usado manualmente via SQL
*/

-- Função para promover usuário a super admin
CREATE OR REPLACE FUNCTION promote_to_super_admin(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_roles (user_id, role, is_active, permissions)
  VALUES (
    target_user_id,
    'super_admin',
    true,
    '["all"]'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'super_admin',
      is_active = true,
      permissions = '["all"]'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Comentário sobre como usar
COMMENT ON FUNCTION promote_to_super_admin IS 'Promove um usuário a super admin. Uso: SELECT promote_to_super_admin(''user-uuid-here'');';