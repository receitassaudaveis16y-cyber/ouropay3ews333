/*
  # Create Permanent Super Admin User Protection

  1. Security Features
    - Prevents deletion of super admin user
    - Auto-restores super admin privileges if removed
    - Ensures super admin always has full access

  2. Changes
    - Function to prevent super admin deletion
    - Function to ensure super admin exists in admin_roles
    - Triggers to protect and restore super admin
    - Helper function for manual checks

  3. Protected User
    - Email: anapaulamagioli899@gmail.com
    - Role: super_admin with all permissions
*/

-- Function to prevent super admin deletion from admin_roles
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = OLD.user_id
    AND email = 'anapaulamagioli899@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Cannot delete super admin user from admin_roles';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure super admin always exists in admin_roles
CREATE OR REPLACE FUNCTION ensure_super_admin_exists()
RETURNS void AS $$
DECLARE
  super_admin_user_id uuid;
BEGIN
  -- Get the user ID for the super admin email
  SELECT id INTO super_admin_user_id
  FROM auth.users
  WHERE email = 'anapaulamagioli899@gmail.com'
  LIMIT 1;

  -- If super admin user exists, ensure they're in admin_roles
  IF super_admin_user_id IS NOT NULL THEN
    INSERT INTO admin_roles (user_id, role, permissions, created_at, updated_at)
    VALUES (
      super_admin_user_id,
      'super_admin',
      '{"all_access": true, "manage_users": true, "manage_companies": true, "manage_transactions": true, "manage_settings": true, "view_reports": true}'::jsonb,
      now(),
      now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      role = 'super_admin',
      permissions = '{"all_access": true, "manage_users": true, "manage_companies": true, "manage_transactions": true, "manage_settings": true, "view_reports": true}'::jsonb,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function triggered when user is created or updated
CREATE OR REPLACE FUNCTION on_super_admin_user_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'anapaulamagioli899@gmail.com' THEN
    PERFORM ensure_super_admin_exists();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON admin_roles;
DROP TRIGGER IF EXISTS ensure_super_admin_trigger ON auth.users;

-- Create trigger to prevent deletion of super admin from admin_roles
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_deletion();

-- Create trigger to ensure super admin is added to admin_roles when user is created/updated
CREATE TRIGGER ensure_super_admin_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION on_super_admin_user_change();
