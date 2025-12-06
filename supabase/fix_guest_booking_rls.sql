-- Fix RLS policies for guest bookings
-- Run this in Supabase SQL Editor

-- ============================================
-- SHIPMENTS TABLE - Allow guest bookings
-- ============================================

-- Drop existing guest policy if it exists
DROP POLICY IF EXISTS "Allow guest shipment creation" ON shipments;

-- Create new policy that allows anyone (including anonymous/guest) to insert
CREATE POLICY "Allow guest shipment creation" ON shipments
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow if user_id is null (guest booking)
    user_id IS NULL
    OR
    -- Or if user is authenticated and creating their own shipment
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Also need to allow guests to select their shipment after creation (for the .select() call)
DROP POLICY IF EXISTS "Allow guest shipment view" ON shipments;

CREATE POLICY "Allow guest shipment view" ON shipments
  FOR SELECT
  TO public
  USING (
    -- Allow viewing if user_id is null (guest booking) - they just created it
    user_id IS NULL
    OR
    -- Or if user is authenticated and viewing their own shipment
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- ============================================
-- PAYMENTS TABLE - Allow guest payments
-- ============================================

-- Check if payments table has RLS enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow guest payment creation" ON payments;
DROP POLICY IF EXISTS "Allow guest payment view" ON payments;

-- Allow guest payment creation
CREATE POLICY "Allow guest payment creation" ON payments
  FOR INSERT
  TO public
  WITH CHECK (
    user_id IS NULL
    OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Allow guest payment view
CREATE POLICY "Allow guest payment view" ON payments
  FOR SELECT
  TO public
  USING (
    user_id IS NULL
    OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- ============================================
-- RECEIPTS TABLE - Allow guest receipts
-- ============================================

-- Check if receipts table has RLS enabled
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow guest receipt creation" ON receipts;
DROP POLICY IF EXISTS "Allow guest receipt view" ON receipts;

-- Allow guest receipt creation
CREATE POLICY "Allow guest receipt creation" ON receipts
  FOR INSERT
  TO public
  WITH CHECK (
    user_id IS NULL
    OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Allow guest receipt view
CREATE POLICY "Allow guest receipt view" ON receipts
  FOR SELECT
  TO public
  USING (
    user_id IS NULL
    OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- List all policies on shipments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('shipments', 'payments', 'receipts')
ORDER BY tablename, policyname;
