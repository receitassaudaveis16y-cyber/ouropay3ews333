/*
  # Create Company Profiles Table

  1. New Tables
    - `company_profiles`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references auth.users) - Link to authenticated user
      - `business_type` (text) - Type: 'juridica' or 'fisica'
      - `document_number` (text) - CNPJ or CPF
      - `business_name` (text) - Razão Social or Nome Completo
      - `invoice_name` (text) - Name on invoice (max 12 chars)
      - `average_revenue` (decimal) - Média de Faturamento
      - `average_ticket` (decimal) - Ticket Médio
      - `company_website` (text) - Site da Empresa
      - `products_sold` (text) - Produtos Vendidos
      - `sells_physical_products` (boolean) - Vende produtos físicos
      - `representative_name` (text) - Nome do Representante
      - `representative_cpf` (text) - CPF do Representante
      - `representative_email` (text) - Email do Representante
      - `representative_phone` (text) - Telefone do Representante
      - `date_of_birth` (text) - Data de Nascimento
      - `mother_name` (text) - Nome da Mãe
      - `postal_code` (text) - CEP
      - `street` (text) - Logradouro
      - `number` (text) - Número
      - `neighborhood` (text) - Bairro
      - `city` (text) - Cidade
      - `state` (text) - Estado
      - `complement` (text) - Complemento
      - `document_frontal_url` (text) - URL do documento frontal
      - `document_back_url` (text) - URL do documento verso
      - `document_selfie_url` (text) - URL da selfie
      - `document_contract_url` (text) - URL do contrato social
      - `status` (text) - Status: 'pending', 'approved', 'rejected'
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `company_profiles` table
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  business_type text NOT NULL CHECK (business_type IN ('juridica', 'fisica')),
  document_number text NOT NULL,
  business_name text NOT NULL,
  invoice_name text NOT NULL,
  average_revenue decimal(12, 2) DEFAULT 0,
  average_ticket decimal(12, 2) DEFAULT 0,
  company_website text,
  products_sold text,
  sells_physical_products boolean DEFAULT false,
  representative_name text,
  representative_cpf text,
  representative_email text,
  representative_phone text,
  date_of_birth text,
  mother_name text,
  postal_code text,
  street text,
  number text,
  neighborhood text,
  city text,
  state text,
  complement text,
  document_frontal_url text,
  document_back_url text,
  document_selfie_url text,
  document_contract_url text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company profile"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company profile"
  ON company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company profile"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS company_profiles_user_id_idx ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS company_profiles_status_idx ON company_profiles(status);
CREATE INDEX IF NOT EXISTS company_profiles_document_number_idx ON company_profiles(document_number);

CREATE OR REPLACE FUNCTION update_company_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_company_profiles_updated_at();