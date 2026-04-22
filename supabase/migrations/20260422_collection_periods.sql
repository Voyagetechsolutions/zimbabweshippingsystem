-- Collection Periods System
-- This migration creates a collection period system for bulk status updates

-- Create collection_periods table
CREATE TABLE IF NOT EXISTS collection_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "May 2026", "June 2026"
  month TEXT NOT NULL, -- e.g., "May", "June"
  year INTEGER NOT NULL, -- e.g., 2026
  status TEXT DEFAULT 'active', -- active, closed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add collection_period_id to shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS collection_period_id UUID REFERENCES collection_periods(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_shipments_collection_period ON shipments(collection_period_id);
CREATE INDEX IF NOT EXISTS idx_collection_periods_status ON collection_periods(status);

-- Enable RLS
ALTER TABLE collection_periods ENABLE ROW LEVEL SECURITY;

-- Policies for collection_periods
CREATE POLICY "Anyone can view collection periods"
  ON collection_periods
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage collection periods"
  ON collection_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to auto-assign collection period based on booking date
CREATE OR REPLACE FUNCTION assign_collection_period()
RETURNS TRIGGER AS $$
DECLARE
  period_name TEXT;
  period_month TEXT;
  period_year INTEGER;
  period_id UUID;
BEGIN
  -- Extract month and year from created_at
  period_month := TO_CHAR(NEW.created_at, 'Month');
  period_month := TRIM(period_month);
  period_year := EXTRACT(YEAR FROM NEW.created_at);
  period_name := period_month || ' ' || period_year;
  
  -- Check if period exists, if not create it
  SELECT id INTO period_id
  FROM collection_periods
  WHERE name = period_name;
  
  IF period_id IS NULL THEN
    INSERT INTO collection_periods (name, month, year)
    VALUES (period_name, period_month, period_year)
    RETURNING id INTO period_id;
  END IF;
  
  -- Assign the period to the shipment
  NEW.collection_period_id := period_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign collection period on insert
DROP TRIGGER IF EXISTS trigger_assign_collection_period ON shipments;
CREATE TRIGGER trigger_assign_collection_period
  BEFORE INSERT ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION assign_collection_period();

-- Update existing shipments to have collection periods
DO $$
DECLARE
  shipment_record RECORD;
  period_name TEXT;
  period_month TEXT;
  period_year INTEGER;
  period_id UUID;
BEGIN
  FOR shipment_record IN SELECT id, created_at FROM shipments WHERE collection_period_id IS NULL LOOP
    period_month := TO_CHAR(shipment_record.created_at, 'Month');
    period_month := TRIM(period_month);
    period_year := EXTRACT(YEAR FROM shipment_record.created_at);
    period_name := period_month || ' ' || period_year;
    
    -- Get or create period
    SELECT id INTO period_id
    FROM collection_periods
    WHERE name = period_name;
    
    IF period_id IS NULL THEN
      INSERT INTO collection_periods (name, month, year)
      VALUES (period_name, period_month, period_year)
      RETURNING id INTO period_id;
    END IF;
    
    -- Update shipment
    UPDATE shipments
    SET collection_period_id = period_id
    WHERE id = shipment_record.id;
  END LOOP;
END $$;

-- Add comments
COMMENT ON TABLE collection_periods IS 'Collection periods for grouping shipments (e.g., May 2026, June 2026)';
COMMENT ON COLUMN shipments.collection_period_id IS 'Links shipment to a collection period for bulk status updates';
