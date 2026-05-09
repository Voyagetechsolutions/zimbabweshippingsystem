-- Add soft delete columns to shipments and service_reviews tables
-- These columns allow hiding records from the dashboard while preserving data

-- Add deleted_at column to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shipments_deleted_at ON shipments(deleted_at);

-- Add hidden_at column to service_reviews table
ALTER TABLE service_reviews 
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_reviews_hidden_at ON service_reviews(hidden_at);

-- Add comment to explain the purpose
COMMENT ON COLUMN shipments.deleted_at IS 'Timestamp when shipment was soft-deleted (hidden from dashboard but preserved in database)';
COMMENT ON COLUMN service_reviews.hidden_at IS 'Timestamp when review was hidden from dashboard (preserved in database for record-keeping)';
