-- Contact Inquiries Table
-- Stores contact form submissions from marketing website

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL CHECK (subject IN ('quote', 'technical', 'design', 'materials', 'student', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) >= 10),
  is_student BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX idx_contact_inquiries_submitted_at ON contact_inquiries(submitted_at DESC);
CREATE INDEX idx_contact_inquiries_email ON contact_inquiries(email);

-- Add RLS policies
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Admin users can view all inquiries
CREATE POLICY "Admin can view all contact inquiries"
  ON contact_inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin users can update inquiries
CREATE POLICY "Admin can update contact inquiries"
  ON contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Anyone can insert (for public contact form)
CREATE POLICY "Anyone can submit contact inquiry"
  ON contact_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE contact_inquiries IS 'Contact form submissions from marketing website';
