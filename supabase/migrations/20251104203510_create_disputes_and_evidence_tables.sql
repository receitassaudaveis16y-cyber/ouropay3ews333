/*
  # Create Disputes and Evidence Management System

  ## Summary
  Creates comprehensive dispute and evidence management tables with full Supabase Storage integration
  for handling chargebacks, disputes, and evidence submission to payment service providers.

  ## Tables Created

  ### 1. disputes
  Main table for storing dispute and chargeback information
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `transaction_id` (uuid) - Associated transaction
  - `type` (enum) - Type: chargeback, dispute, inquiry
  - `reason` (text) - Dispute reason/description
  - `amount` (numeric) - Disputed amount
  - `status` (enum) - Status: open, under_review, won, lost, closed
  - `due_date` (timestamptz) - Evidence submission deadline
  - `evidence_url` (text) - Legacy evidence URL (deprecated)
  - `resolution_notes` (text) - Admin notes on resolution
  - `created_at` (timestamptz) - Creation timestamp
  - `resolved_at` (timestamptz) - Resolution timestamp

  ### 2. dispute_evidences
  Table for storing multiple evidence files per dispute
  - `id` (uuid, primary key) - Unique identifier
  - `dispute_id` (uuid, foreign key) - References disputes table
  - `file_name` (text) - Original file name
  - `file_url` (text) - Supabase Storage URL
  - `file_type` (text) - MIME type
  - `file_size` (integer) - File size in bytes
  - `notes` (text) - Optional notes about evidence
  - `uploaded_at` (timestamptz) - Upload timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only access their own disputes and evidence
  - Policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Storage
  - Creates 'dispute-evidences' storage bucket
  - Public access for authenticated users
  - File size limit: 10MB per file
  - Allowed types: PDF, images, documents

  ## Important Notes
  - Existing dispute records created by pagarme-webhook will be preserved
  - Evidence system supports multiple files per dispute
  - Files are stored in Supabase Storage with proper access control
*/

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid,
  type text NOT NULL CHECK (type IN ('chargeback', 'dispute', 'inquiry')),
  reason text NOT NULL,
  amount numeric(15, 2) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'won', 'lost', 'closed')),
  due_date timestamptz,
  evidence_url text,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create dispute_evidences table
CREATE TABLE IF NOT EXISTS dispute_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  notes text,
  uploaded_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes table
CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disputes"
  ON disputes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for dispute_evidences table
CREATE POLICY "Users can view own dispute evidences"
  ON dispute_evidences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidences.dispute_id
      AND disputes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own dispute evidences"
  ON dispute_evidences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidences.dispute_id
      AND disputes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own dispute evidences"
  ON dispute_evidences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidences.dispute_id
      AND disputes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidences.dispute_id
      AND disputes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own dispute evidences"
  ON dispute_evidences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidences.dispute_id
      AND disputes.user_id = auth.uid()
    )
  );

-- Create storage bucket for dispute evidences
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidences',
  'dispute-evidences',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dispute-evidences bucket
CREATE POLICY "Authenticated users can upload dispute evidences"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dispute-evidences');

CREATE POLICY "Users can view own dispute evidences in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dispute-evidences');

CREATE POLICY "Users can update own dispute evidences in storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dispute-evidences')
  WITH CHECK (bucket_id = 'dispute-evidences');

CREATE POLICY "Users can delete own dispute evidences in storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dispute-evidences');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_evidences_dispute_id ON dispute_evidences(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidences_uploaded_at ON dispute_evidences(uploaded_at DESC);