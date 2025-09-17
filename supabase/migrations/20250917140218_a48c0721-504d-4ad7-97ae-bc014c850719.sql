-- Remove the public access policy that exposes all shipment data
DROP POLICY IF EXISTS "Allow tracking by tracking number" ON public.shipments;

-- Remove public insert policy as well for better security
DROP POLICY IF EXISTS "Allow public insert to shipments" ON public.shipments;

-- Create a secure tracking function that only returns non-sensitive tracking information
CREATE OR REPLACE FUNCTION public.get_shipment_tracking_info(tracking_num text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  shipment_record record;
BEGIN
  -- Get shipment with only the necessary fields for tracking
  SELECT 
    status,
    origin,
    destination,
    updated_at,
    tracking_number,
    created_at,
    metadata->'estimated_delivery' as estimated_delivery,
    metadata->'carrier' as carrier
  INTO shipment_record
  FROM public.shipments
  WHERE tracking_number = tracking_num;
  
  -- If no shipment found, return null
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Build result with only safe, non-sensitive information
  result := jsonb_build_object(
    'status', shipment_record.status,
    'origin', shipment_record.origin,
    'destination', shipment_record.destination,
    'tracking_number', shipment_record.tracking_number,
    'last_updated', shipment_record.updated_at,
    'created_at', shipment_record.created_at,
    'estimated_delivery', COALESCE(shipment_record.estimated_delivery, '"Not available"'::jsonb),
    'carrier', COALESCE(shipment_record.carrier, '"Zimbabwe Shipping"'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- Create policy to allow public access to the tracking function only
-- This is handled through the SECURITY DEFINER function above

-- Log tracking access for security monitoring
CREATE OR REPLACE FUNCTION public.log_tracking_access(tracking_num text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    NULL, -- Public access, no user_id
    'TRACKING_ACCESS',
    'SHIPMENT',
    NULL,
    jsonb_build_object(
      'tracking_number', tracking_num,
      'timestamp', now(),
      'ip_address', 'unknown' -- Could be enhanced with actual IP if available
    )
  );
END;
$$;