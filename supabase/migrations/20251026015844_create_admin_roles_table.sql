/*
  # Create Admin Roles Table
  
  This migration creates the admin roles system for the platform.
  
  1. New Tables
    - `admin_roles`
      - `id` (uuid, primary key) - Unique identifier for admin role
      - `user_id` (uuid, foreign key) - References auth.users table
      - `role` (text) - Role type (admin, super_admin)
      - `created_at` (timestamptz) - Timestamp when role was granted
      - `created_by` (uuid) - User who granted the role
  
  2. Security
    - Enable RLS on `admin_roles` table
    - Add policy for super_admins to read all admin roles
    - Add policy for super_admins to manage admin roles
    - Regular users cannot access admin_roles table
  
  3. Indexes
    - Create index on user_id for faster lookups
    - Create unique index on (user_id, role) to prevent duplicate role assignments
  
  4. Important Notes
    - Only super_admins can create or modify admin roles
    - This table controls access to the /admin route
    - Default setup: no admin users exist initially (must be created manually)
*/

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can read all admin roles
CREATE POLICY "Super admins can read all admin roles"
  ON admin_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  );

-- Policy: Super admins can insert admin roles
CREATE POLICY "Super admins can insert admin roles"
  ON admin_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  );

-- Policy: Super admins can update admin roles
CREATE POLICY "Super admins can update admin roles"
  ON admin_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  );

-- Policy: Super admins can delete admin roles
CREATE POLICY "Super admins can delete admin roles"
  ON admin_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  );

-- Policy: Users can check their own admin status
CREATE POLICY "Users can check their own admin status"
  ON admin_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
