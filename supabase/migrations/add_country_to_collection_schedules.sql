-- Add country column to collection_schedules table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Add the country column
ALTER TABLE collection_schedules
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'England';

-- Update existing routes to have 'England' as default country
UPDATE collection_schedules
SET country = 'England'
WHERE country IS NULL;

-- Create index for faster filtering by country
CREATE INDEX IF NOT EXISTS idx_collection_schedules_country
ON collection_schedules(country);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'collection_schedules'
AND column_name = 'country';
