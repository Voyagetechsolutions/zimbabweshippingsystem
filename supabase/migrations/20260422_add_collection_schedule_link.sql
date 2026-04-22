-- Add collection_schedule_id to shipments table to link shipments to collection schedules
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS collection_schedule_id UUID REFERENCES collection_schedules(id) ON DELETE SET NULL;

-- Add schedule_name to collection_schedules for easy identification
ALTER TABLE collection_schedules
ADD COLUMN IF NOT EXISTS schedule_name TEXT;

-- Create index for faster filtering by collection schedule
CREATE INDEX IF NOT EXISTS idx_shipments_collection_schedule
ON shipments(collection_schedule_id);

-- Update existing collection schedules to have a schedule_name based on route and date
UPDATE collection_schedules
SET schedule_name = route || ' - ' || pickup_date
WHERE schedule_name IS NULL;

-- Add comment to explain the purpose
COMMENT ON COLUMN shipments.collection_schedule_id IS 'Links shipment to a specific collection schedule for bulk status updates';
COMMENT ON COLUMN collection_schedules.schedule_name IS 'Human-readable name for the collection schedule (e.g., "Dublin Route - March 2026")';
