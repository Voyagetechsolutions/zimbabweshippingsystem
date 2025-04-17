
-- Create a table for custom quote requests
CREATE TABLE IF NOT EXISTS custom_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NULL,
  shipment_id UUID REFERENCES shipments(id) NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  phone_number TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  quoted_amount NUMERIC NULL,
  admin_notes TEXT NULL,
  sender_details JSONB NULL DEFAULT '{}',
  recipient_details JSONB NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE custom_quotes ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to see all quotes
CREATE POLICY "Admins can do anything with custom quotes"
ON custom_quotes
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Create policy for users to view their own quotes
CREATE POLICY "Users can view their own quotes"
ON custom_quotes
FOR SELECT
USING (user_id = auth.uid());

-- Create policy for users to insert their own quotes
CREATE POLICY "Users can create their own quotes"
ON custom_quotes
FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
