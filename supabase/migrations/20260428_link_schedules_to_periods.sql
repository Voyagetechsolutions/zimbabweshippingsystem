-- Link collection schedules to collection periods
-- This allows grouping routes by collection period

-- Add collection_period_id to collection_schedules table
ALTER TABLE collection_schedules
ADD COLUMN IF NOT EXISTS collection_period_id UUID REFERENCES collection_periods(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_collection_schedules_period ON collection_schedules(collection_period_id);

-- Add comment
COMMENT ON COLUMN collection_schedules.collection_period_id IS 'Links collection schedule to a collection period for grouping';
