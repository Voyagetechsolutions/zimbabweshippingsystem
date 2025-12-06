-- =====================================================
-- ZIMBABWE SHIPPING LOGISTICS SYSTEM
-- Database Migration - Delivery Monitoring System
-- =====================================================

-- 1. CREATE DRIVERS TABLE
-- Stores information about delivery drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  deliveries_completed integer DEFAULT 0,
  avg_delivery_time numeric DEFAULT 0,
  rating numeric DEFAULT 5.0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drivers_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.drivers IS 'Delivery drivers and their performance metrics';

-- 2. CREATE DELIVERY_EVENTS TABLE
-- Tracks all status changes and location updates for deliveries
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL,
  status text NOT NULL,
  location text,
  notes text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_events_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_events_delivery_id_fkey FOREIGN KEY (delivery_id) 
    REFERENCES public.shipments(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.delivery_events IS 'Timeline of delivery status changes and location updates';

-- 3. CREATE DELIVERY_ISSUES TABLE
-- Stores customer complaints and delivery issues
CREATE TABLE IF NOT EXISTS public.delivery_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_id uuid,
  tracking_number text NOT NULL,
  issue_type text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'active'::text,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT delivery_issues_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_issues_delivery_id_fkey FOREIGN KEY (delivery_id) 
    REFERENCES public.shipments(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.delivery_issues IS 'Customer complaints and delivery problems';

-- 4. ADD DRIVER_ID COLUMN TO SHIPMENTS TABLE
-- Links shipments to assigned drivers
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id);

COMMENT ON COLUMN public.shipments.driver_id IS 'Assigned driver for this delivery';

-- 5. CREATE INDEXES FOR PERFORMANCE
-- Speeds up queries on commonly searched fields
CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id 
  ON public.delivery_events(delivery_id);

CREATE INDEX IF NOT EXISTS idx_delivery_events_timestamp 
  ON public.delivery_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_issues_status 
  ON public.delivery_issues(status);

CREATE INDEX IF NOT EXISTS idx_delivery_issues_tracking 
  ON public.delivery_issues(tracking_number);

CREATE INDEX IF NOT EXISTS idx_shipments_driver_id 
  ON public.shipments(driver_id);

CREATE INDEX IF NOT EXISTS idx_drivers_active 
  ON public.drivers(active);

-- 6. ENABLE ROW LEVEL SECURITY
-- Ensures only authorized users can access data
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_issues ENABLE ROW LEVEL SECURITY;

-- 7. CREATE RLS POLICIES
-- Admin users have full access to all tables
CREATE POLICY "Admin full access on drivers" ON public.drivers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admin full access on delivery_events" ON public.delivery_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admin full access on delivery_issues" ON public.delivery_issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 8. CREATE TRIGGER FUNCTION: AUTO-UPDATE DRIVER STATS
-- Automatically increments driver delivery count when shipment is delivered
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND NEW.driver_id IS NOT NULL THEN
    UPDATE drivers
    SET 
      deliveries_completed = deliveries_completed + 1,
      updated_at = NOW()
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_stats
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (NEW.status = 'delivered')
EXECUTE FUNCTION update_driver_stats();

-- 9. CREATE TRIGGER FUNCTION: AUTO-LOG DELIVERY EVENTS
-- Automatically creates delivery event records when shipment status changes
CREATE OR REPLACE FUNCTION log_delivery_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO delivery_events(delivery_id, status, location, timestamp)
    VALUES(NEW.id, NEW.status, NEW.destination, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_delivery_events
AFTER UPDATE OF status ON shipments
FOR EACH ROW
EXECUTE FUNCTION log_delivery_status_change();

-- 10. CREATE PERFORMANCE VIEW
-- Aggregates driver performance metrics
CREATE OR REPLACE VIEW driver_performance_view AS
SELECT 
  d.id,
  d.name,
  d.phone,
  d.active,
  d.deliveries_completed,
  COUNT(s.id) as total_assigned,
  SUM(CASE WHEN s.status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries,
  SUM(CASE WHEN s.status IN ('pending', 'Ready for Pickup') THEN 1 ELSE 0 END) as pending_deliveries,
  AVG(
    CASE 
      WHEN s.status = 'delivered' AND s.updated_at > s.created_at
      THEN EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 3600 
    END
  ) as avg_delivery_time_hours,
  d.rating,
  d.created_at,
  d.updated_at
FROM drivers d
LEFT JOIN shipments s ON s.driver_id = d.id
GROUP BY d.id, d.name, d.phone, d.active, d.deliveries_completed, d.rating, d.created_at, d.updated_at;

COMMENT ON VIEW driver_performance_view IS 'Aggregated driver performance metrics';

-- 11. GRANT PERMISSIONS
-- Ensure RLS policies work correctly
GRANT ALL ON public.drivers TO authenticated;
GRANT ALL ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_issues TO authenticated;
GRANT SELECT ON driver_performance_view TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- You can now use:
-- - Delivery Monitoring Tab
-- - Driver Performance Tab
-- - Issues & Complaints Tab
-- =====================================================
