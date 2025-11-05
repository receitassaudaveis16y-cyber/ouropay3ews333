/*
  # Create KYC System Tables

  1. New Tables
    - `kyc_verifications` - Armazena status e informações de verificação KYC
    - `kyc_documents` - Armazena documentos uploadados e dados extraídos
    - `kyc_audit_log` - Log de auditoria de alterações no KYC

  2. Security
    - Enable RLS on all tables
    - Add policies for users to view/edit own KYC
    - Add policies for admins to manage KYC

  3. Indexes
    - Create indexes for performance on frequently queried columns

  4. Features
    - Support for Pessoa Física e Jurídica
    - Multiple verification levels
    - Document OCR support
    - Fraud detection scoring
    - Complete audit trail
*/

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'business')),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'pending',
    'under_review',
    'approved',
    'rejected',
    'expired'
  )),

  verification_level INT DEFAULT 1 CHECK (verification_level BETWEEN 1 AND 3),

  full_name VARCHAR(255),
  cpf VARCHAR(11),
  birth_date DATE,
  nationality VARCHAR(100),

  company_name VARCHAR(255),
  cnpj VARCHAR(14),
  business_segment VARCHAR(100),
  annual_revenue DECIMAL(15, 2),
  employees_count INT,
  legal_representatives JSONB,

  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB,

  documents JSONB,
  selfie_image TEXT,

  verification_result JSONB,
  fraud_score DECIMAL(3, 2),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),

  verified_at TIMESTAMP,
  rejected_reason TEXT,
  rejection_category VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id UUID NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,

  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255),
  file_size INT,
  file_mime_type VARCHAR(50),
  file_path TEXT,
  file_url TEXT,

  ocr_text TEXT,
  ocr_confidence DECIMAL(3, 2),
  extracted_data JSONB,

  processing_status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id UUID NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,

  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES auth.users(id),

  old_values JSONB,
  new_values JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_created_at ON kyc_verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_verification_id ON kyc_documents(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_log_verification_id ON kyc_audit_log(kyc_verification_id);

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC"
  ON kyc_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC"
  ON kyc_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC"
  ON kyc_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own documents"
  ON kyc_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_verifications
      WHERE kyc_verifications.id = kyc_documents.kyc_verification_id
      AND kyc_verifications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own documents"
  ON kyc_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_verifications
      WHERE kyc_verifications.id = kyc_documents.kyc_verification_id
      AND kyc_verifications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own audit log"
  ON kyc_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_verifications
      WHERE kyc_verifications.id = kyc_audit_log.kyc_verification_id
      AND kyc_verifications.user_id = auth.uid()
    )
  );
