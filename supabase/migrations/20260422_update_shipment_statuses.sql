-- Update existing shipment statuses to new simplified format
-- This migration converts old status names to new simplified ones

-- Booking Confirmed → Confirmed
UPDATE shipments
SET status = 'Confirmed'
WHERE status = 'Booking Confirmed';

-- Ready for Pickup → Collected
UPDATE shipments
SET status = 'Collected'
WHERE status = 'Ready for Pickup';

-- InTransit to Zimbabwe → In Transit
UPDATE shipments
SET status = 'In Transit'
WHERE status IN ('InTransit to Zimbabwe', 'InTransit', 'OnTransit');

-- Goods Arrived in Zimbabwe → Zim Warehouse
UPDATE shipments
SET status = 'Zim Warehouse'
WHERE status IN ('Goods Arrived in Zimbabwe', 'Processing in ZW Warehouse');

-- Add comment
COMMENT ON COLUMN shipments.status IS 'Shipment status: Pending, Confirmed, Collected, In Transit, Zim Warehouse, Out for Delivery, Delivered, Cancelled';

-- Verify the update
SELECT 
  status,
  COUNT(*) as count
FROM shipments
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'Pending' THEN 1
    WHEN 'Confirmed' THEN 2
    WHEN 'Collected' THEN 3
    WHEN 'In Transit' THEN 4
    WHEN 'Zim Warehouse' THEN 5
    WHEN 'Out for Delivery' THEN 6
    WHEN 'Delivered' THEN 7
    WHEN 'Cancelled' THEN 8
    ELSE 9
  END;
