-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_created_at ON public.account_deletion_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own deletion requests
CREATE POLICY "Users can create their own deletion requests"
  ON public.account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update deletion requests
CREATE POLICY "Admins can update deletion requests"
  ON public.account_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_account_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_deletion_requests_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

-- Add comment
COMMENT ON TABLE public.account_deletion_requests IS 'Tracks user account deletion requests for GDPR compliance and Google Play Data Safety requirements';
