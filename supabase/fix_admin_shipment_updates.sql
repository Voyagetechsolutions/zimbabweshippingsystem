-- =====================================================
-- FIX ADMIN PERMISSIONS FOR SHIPMENT STATUS UPDATES
-- This ensures the owner can update shipment statuses
-- =====================================================

-- 1. First, check the current user's profile and permissions
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  is_admin,
  created_at
FROM profiles 
WHERE id = auth.uid();

-- 2. If you need to grant admin access to a specific user, uncomment and run:
-- UPDATE profiles 
-- SET is_admin = true, role = 'Admin'
-- WHERE email = 'your-email@example.com';

-- 3. Check current RLS policies on shipments table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'shipments'
ORDER BY cmd, policyname;

-- 4. Ensure shipments table has proper RLS policies for admin updates
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Drop existing admin update policy if it exists
DROP POLICY IF EXISTS "Admins can update all shipments" ON shipments;
DROP POLICY IF EXISTS "Admin full access to shipments" ON shipments;

-- Create comprehensive admin update policy
CREATE POLICY "Admins can update all shipments" ON shipments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'Admin' OR profiles.is_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'Admin' OR profiles.is_admin = true)
  )
);

-- Ensure admins can view all shipments
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipments;
CREATE POLICY "Admins can view all shipments" ON shipments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'Admin' OR profiles.is_admin = true)
  )
  OR
  user_id = auth.uid()
  OR
  user_id IS NULL
);

-- 5. Test the update (replace 'SHIPMENT_ID' with an actual shipment ID)
-- UPDATE shipments
-- SET status = 'Booking Confirmed', updated_at = NOW()
-- WHERE id = 'SHIPMENT_ID'
-- RETURNING id, tracking_number, status, updated_at;

-- 6. Verify all policies are in place
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'shipments'
ORDER BY cmd, policyname;

-- 7. Check if there are any shipments that need status updates
SELECT 
  id,
  tracking_number,
  status,
  origin,
  destination,
  created_at,
  updated_at
FROM shipments
ORDER BY created_at DESC
LIMIT 10;
