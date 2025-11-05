/*
  # Create Support Tickets Table

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `subject` (text) - Ticket subject
      - `message` (text) - Ticket message/description
      - `category` (text) - Category (pagamentos, integracao, seguranca, taxas, outro)
      - `status` (text) - Status (open, in_progress, resolved, closed)
      - `priority` (text) - Priority (low, medium, high, urgent)
      - `assigned_to` (uuid) - Admin user assigned to ticket
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp
      - `resolved_at` (timestamptz) - Resolution timestamp

    - `support_ticket_messages`
      - `id` (uuid, primary key) - Unique identifier
      - `ticket_id` (uuid, foreign key) - References support_tickets
      - `user_id` (uuid, foreign key) - References auth.users
      - `message` (text) - Message content
      - `is_staff` (boolean) - Whether message is from staff
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Users can view and create their own tickets
    - Users can view messages for their own tickets
    - Staff can view all tickets (handled via admin_roles)
*/

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL CHECK (category IN ('pagamentos', 'integracao', 'seguranca', 'taxas', 'outro')),
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_staff boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages for their tickets"
  ON support_ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their tickets"
  ON support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
