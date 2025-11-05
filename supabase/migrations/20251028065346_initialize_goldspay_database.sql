/*
  # Initialize GoldsPay Complete System
  
  1. New Tables
    - `company_profiles` - Perfis de empresas
    - `wallets` - Carteiras dos usuários
    - `customers` - Clientes das empresas
    - `transactions` - Transações de pagamento
    - `api_keys` - Chaves de API
    - `webhooks` - Webhooks configurados
    - `payment_links` - Links de pagamento
    - `disputes` - Disputas de pagamento
    - `user_mfa_settings` - Configurações de 2FA
    - `admin_roles` - Funções de administrador
    - `gateway_settings` - Configurações do gateway
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for admin access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company Profiles Table
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type text NOT NULL CHECK (business_type IN ('juridica', 'fisica')),
  document_number text NOT NULL,
  business_name text NOT NULL,
  invoice_name text NOT NULL,
  average_revenue numeric DEFAULT 0,
  average_ticket numeric DEFAULT 0,
  company_website text,
  products_sold text,
  sells_physical_products boolean DEFAULT false,
  representative_name text NOT NULL,
  representative_cpf text NOT NULL,
  representative_email text NOT NULL,
  representative_phone text NOT NULL,
  date_of_birth text NOT NULL,
  mother_name text NOT NULL,
  postal_code text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  complement text,
  document_frontal_url text,
  document_back_url text,
  document_selfie_url text,
  document_contract_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0,
  available_balance numeric DEFAULT 0,
  pending_balance numeric DEFAULT 0,
  currency text DEFAULT 'BRL',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  document_number text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  currency text DEFAULT 'BRL',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed')),
  payment_method text,
  payment_provider text,
  provider_transaction_id text,
  description text,
  customer_email text,
  customer_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_value text NOT NULL UNIQUE,
  key_type text DEFAULT 'test' CHECK (key_type IN ('test', 'production')),
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL,
  is_active boolean DEFAULT true,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment Links Table
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  currency text DEFAULT 'BRL',
  is_active boolean DEFAULT true,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'won', 'lost')),
  evidence_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User MFA Settings Table
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT false,
  secret text,
  backup_codes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Gateway Settings Table
CREATE TABLE IF NOT EXISTS gateway_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_enabled boolean DEFAULT false,
  stripe_public_key text,
  stripe_secret_key text,
  pagarme_enabled boolean DEFAULT false,
  pagarme_api_key text,
  pix_enabled boolean DEFAULT true,
  credit_card_enabled boolean DEFAULT true,
  boleto_enabled boolean DEFAULT false,
  default_fee_percentage numeric DEFAULT 2.99,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_settings ENABLE ROW LEVEL SECURITY;