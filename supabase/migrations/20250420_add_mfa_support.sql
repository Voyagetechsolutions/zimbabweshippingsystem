
-- Add MFA-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];

COMMENT ON COLUMN public.profiles.mfa_enabled IS 'Whether multi-factor authentication is enabled for this user';
COMMENT ON COLUMN public.profiles.mfa_secret IS 'Encrypted TOTP secret for MFA';
COMMENT ON COLUMN public.profiles.mfa_backup_codes IS 'Array of hashed backup codes for MFA recovery';

-- Create a function to handle MFA verification
CREATE OR REPLACE FUNCTION public.verify_mfa_login(user_id UUID, token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mfa_data RECORD;
BEGIN
  -- Get the user's MFA data
  SELECT mfa_enabled, mfa_secret INTO mfa_data
  FROM public.profiles
  WHERE id = user_id;
  
  -- If MFA is not enabled, return true (no verification needed)
  IF NOT mfa_data.mfa_enabled OR mfa_data.mfa_secret IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- In a real implementation, calculate TOTP here
  -- For demo, we'll just log the attempt and return true
  
  -- Log the verification attempt
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    user_id,
    'MFA_DATABASE_VERIFICATION',
    'USER',
    user_id,
    jsonb_build_object('token_provided', token IS NOT NULL)
  );
  
  -- In a real implementation, return the actual verification result
  -- For now, return true to allow the flow to continue
  RETURN TRUE;
END;
$$;

-- Add index for faster MFA lookups
CREATE INDEX IF NOT EXISTS idx_profiles_mfa_enabled
ON public.profiles (mfa_enabled)
WHERE mfa_enabled = true;

-- Ensure the right roles have access to verify MFA
GRANT EXECUTE ON FUNCTION public.verify_mfa_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mfa_login TO service_role;
