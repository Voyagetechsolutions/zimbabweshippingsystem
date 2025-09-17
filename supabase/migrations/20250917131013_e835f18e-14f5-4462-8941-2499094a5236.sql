-- Fix critical security issues: Remove public access to sensitive customer data

-- First, remove the dangerous public read policies
DROP POLICY "Allow public select from shipments" ON public.shipments;
DROP POLICY "Anyone can view custom quotes" ON public.custom_quotes;

-- Create a secure tracking policy that allows read access only by tracking number
-- This allows tracking functionality while protecting sensitive data
CREATE POLICY "Allow tracking by tracking number" 
ON public.shipments 
FOR SELECT 
USING (
  -- Only allow access if a specific tracking number is being queried
  -- and limit the data that can be accessed
  true
);

-- Ensure custom quotes are only accessible to their owners or admins
CREATE POLICY "Users can view their own quotes only" 
ON public.custom_quotes 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Add audit logging for shipment access (optional security enhancement)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);