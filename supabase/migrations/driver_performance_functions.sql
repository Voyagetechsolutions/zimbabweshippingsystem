
-- Create the get_driver_performance RPC function
CREATE OR REPLACE FUNCTION public.get_driver_performance(driver_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  driver_region TEXT;
  performance_data JSONB;
  deliveries_count INT;
  completed_count INT;
  on_time_count INT;
  avg_rating DECIMAL;
BEGIN
  -- Get driver region from profile communication preferences
  SELECT 
    COALESCE(
      (communication_preferences->>'region')::TEXT, 
      'UK'
    ) INTO driver_region
  FROM profiles
  WHERE id = driver_id_param;
  
  -- Count all deliveries assigned to this driver
  SELECT 
    COUNT(*)::INT INTO deliveries_count
  FROM 
    shipments
  WHERE 
    metadata->'delivery'->>'driver_id' = driver_id_param::TEXT;

  -- Count completed deliveries
  SELECT 
    COUNT(*)::INT INTO completed_count
  FROM 
    shipments
  WHERE 
    metadata->'delivery'->>'driver_id' = driver_id_param::TEXT
    AND status = 'Delivered';

  -- Count on-time deliveries (not marked as late)
  SELECT 
    COUNT(*)::INT INTO on_time_count
  FROM 
    shipments
  WHERE 
    metadata->'delivery'->>'driver_id' = driver_id_param::TEXT
    AND status = 'Delivered'
    AND (
      metadata->'delivery'->>'isLate' IS NULL 
      OR metadata->'delivery'->>'isLate' = 'false'
    );

  -- Get average rating if any (default 5.0)
  SELECT 
    COALESCE(
      AVG(rating)::DECIMAL, 
      5.0
    ) INTO avg_rating
  FROM reviews
  WHERE 
    shipment_id IN (
      SELECT id FROM shipments 
      WHERE metadata->'delivery'->>'driver_id' = driver_id_param::TEXT
    );
    
  -- Build the response JSON
  performance_data := jsonb_build_object(
    'driver_id', driver_id_param,
    'total_deliveries', deliveries_count,
    'completed_deliveries', completed_count,
    'on_time_deliveries', on_time_count,
    'rating', avg_rating,
    'region', driver_region
  );

  RETURN performance_data;
END;
$$;

-- Create the update_driver_performance_metrics RPC function
CREATE OR REPLACE FUNCTION public.update_driver_performance_metrics(driver_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  performance_data JSONB;
BEGIN
  -- Get the latest performance data
  performance_data := public.get_driver_performance(driver_id_param);
  
  -- Return the calculated performance data
  RETURN performance_data;
END;
$$;
