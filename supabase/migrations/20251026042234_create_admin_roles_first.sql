/*
  # Create Admin Roles Table
  
  1. New Tables
    - `admin_roles` - Define quais usuários são administradores
    
  2. Security
    - RLS habilitado
    - Apenas admins existentes podem gerenciar
    
  3. Features
    - Diferentes níveis de acesso admin
    - Rastreamento de quem criou e quando
*/

-- Tabela de roles administrativos
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  role text DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'financial')),
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Super admins can manage admin roles"
  ON admin_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() 
        AND ar.role = 'super_admin' 
        AND ar.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() 
        AND ar.role = 'super_admin' 
        AND ar.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON admin_roles(is_active) WHERE is_active = true;