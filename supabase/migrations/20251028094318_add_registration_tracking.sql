/*
  # Add User Registration Tracking System
  
  1. New Table
    - `user_registration_status` - Rastreia o progresso do cadastro dos usuários
  
  2. Security
    - Enable RLS on `user_registration_status` table
    - Add policies for users to view/update their own status
  
  3. Triggers
    - Create trigger to auto-create registration status on user signup
*/

CREATE TABLE IF NOT EXISTS user_registration_status (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  registration_step text DEFAULT 'created' CHECK (registration_step IN ('created', 'company_info', 'documents', 'completed')),
  is_complete boolean DEFAULT false,
  company_data_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_registration_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registration status"
  ON user_registration_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own registration status"
  ON user_registration_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all registration statuses"
  ON user_registration_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_registration_status_user_id ON user_registration_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_registration_status_is_complete ON user_registration_status(is_complete);
CREATE INDEX IF NOT EXISTS idx_user_registration_status_email ON user_registration_status(email);

CREATE OR REPLACE FUNCTION create_registration_status_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_registration_status (user_id, email, registration_step, is_complete)
  VALUES (NEW.id, NEW.email, 'created', false);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_registration ON auth.users;
CREATE TRIGGER on_auth_user_created_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_registration_status_on_signup();