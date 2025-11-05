/*
  # Add User Registration Tracking System
  
  1. New Table
    - `user_registration_status` - Rastreia o progresso do cadastro dos usuários
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text) - Email do usuário
      - `registration_step` (text) - Etapa atual do cadastro
      - `is_complete` (boolean) - Se o cadastro está completo
      - `company_data_complete` (boolean) - Se os dados da empresa foram preenchidos
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_registration_status` table
    - Add policies for users to view/update their own status
    - Add policies for admins to view all registration statuses
  
  3. Triggers
    - Create trigger to auto-create registration status on user signup
    - Update registration status when company profile is modified
*/

-- Create user registration status table
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

-- Enable RLS
ALTER TABLE user_registration_status ENABLE ROW LEVEL SECURITY;

-- Users can view own registration status
CREATE POLICY "Users can view own registration status"
  ON user_registration_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own registration status
CREATE POLICY "Users can update own registration status"
  ON user_registration_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all registration statuses
CREATE POLICY "Admins can view all registration statuses"
  ON user_registration_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

-- Admins can update all registration statuses
CREATE POLICY "Admins can update all registration statuses"
  ON user_registration_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_registration_status_user_id ON user_registration_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_registration_status_is_complete ON user_registration_status(is_complete);
CREATE INDEX IF NOT EXISTS idx_user_registration_status_email ON user_registration_status(email);

-- Function to create registration status on user signup
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

-- Trigger to create registration status automatically
DROP TRIGGER IF EXISTS on_auth_user_created_registration ON auth.users;
CREATE TRIGGER on_auth_user_created_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_registration_status_on_signup();

-- Function to update registration status when company profile is created/updated
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_registration_status (user_id, email, registration_step, company_data_complete, is_complete, updated_at)
  VALUES (
    NEW.user_id,
    NEW.representative_email,
    CASE
      WHEN NEW.document_frontal_url IS NOT NULL 
           AND NEW.document_back_url IS NOT NULL 
           AND NEW.document_selfie_url IS NOT NULL THEN 'completed'
      WHEN NEW.business_name IS NOT NULL THEN 'company_info'
      ELSE 'created'
    END,
    (NEW.business_name IS NOT NULL),
    (NEW.document_frontal_url IS NOT NULL 
     AND NEW.document_back_url IS NOT NULL 
     AND NEW.document_selfie_url IS NOT NULL),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    registration_step = CASE
      WHEN NEW.document_frontal_url IS NOT NULL 
           AND NEW.document_back_url IS NOT NULL 
           AND NEW.document_selfie_url IS NOT NULL THEN 'completed'
      WHEN NEW.business_name IS NOT NULL THEN 'company_info'
      ELSE 'created'
    END,
    company_data_complete = (NEW.business_name IS NOT NULL),
    is_complete = (
      NEW.document_frontal_url IS NOT NULL 
      AND NEW.document_back_url IS NOT NULL 
      AND NEW.document_selfie_url IS NOT NULL
    ),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update registration status when company profile changes
DROP TRIGGER IF EXISTS on_company_profile_change ON company_profiles;
CREATE TRIGGER on_company_profile_change
  AFTER INSERT OR UPDATE ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_status();