-- =====================================================
-- FIX COLLECTION SCHEDULES - ALLOW PUBLIC READ ACCESS
-- This allows non-authenticated users to see collection dates when booking
-- =====================================================

-- 1. Enable RLS on collection_schedules if not already enabled
ALTER TABLE collection_schedules ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can view collection schedules" ON collection_schedules;
DROP POLICY IF EXISTS "Public can view schedules" ON collection_schedules;
DROP POLICY IF EXISTS "Enable read access for all users" ON collection_schedules;

-- 3. Create a new SELECT policy that allows EVERYONE (including anonymous users) to read
CREATE POLICY "Public can view collection schedules" ON collection_schedules
FOR SELECT
TO public
USING (true);

-- 4. Keep admin-only policies for modifications
-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Admins can update schedules" ON collection_schedules;
CREATE POLICY "Admins can update schedules" ON collection_schedules
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

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "Admins can create new schedules" ON collection_schedules;
CREATE POLICY "Admins can create new schedules" ON collection_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'Admin' OR profiles.is_admin = true)
  )
);

-- Drop and recreate DELETE policy
DROP POLICY IF EXISTS "Admins can delete schedules" ON collection_schedules;
CREATE POLICY "Admins can delete schedules" ON collection_schedules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'Admin' OR profiles.is_admin = true)
  )
);

-- 5. Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'collection_schedules'
ORDER BY cmd, policyname;

-- 6. Test that public can read (this should work even without authentication)
SELECT route, pickup_date, updated_at 
FROM collection_schedules 
ORDER BY route;
