-- =====================================================
-- FIX COLLECTION_SCHEDULES RLS POLICIES
-- Run this in Supabase SQL Editor
-- =====================================================

-- The issue: UPDATE policy checks for role = 'Admin' but your profile uses is_admin = true

-- 1. First, check your current profile
SELECT id, email, full_name, role, is_admin 
FROM profiles 
WHERE id = auth.uid();

-- 2. Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Admins can update schedules" ON collection_schedules;

-- 3. Create a new UPDATE policy that checks BOTH role and is_admin
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

-- 4. Also fix INSERT and DELETE policies
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

-- 5. Verify the new policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'collection_schedules';

-- 6. Test update (should work now)
UPDATE collection_schedules
SET pickup_date = 'December 15th, 2025', updated_at = NOW()
WHERE route = 'LONDON'
RETURNING *;
