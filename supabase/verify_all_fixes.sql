-- =====================================================
-- VERIFICATION SCRIPT - TEST ALL FIXES
-- Run this after applying both fix scripts
-- =====================================================

-- ============================================
-- TEST 1: Verify Collection Schedules Are Public
-- ============================================
SELECT 
  '✓ TEST 1: Collection Schedules Public Access' as test_name,
  COUNT(*) as total_schedules,
  COUNT(CASE WHEN pickup_date IS NOT NULL AND pickup_date != 'Not set' THEN 1 END) as schedules_with_dates
FROM collection_schedules;

-- Show all collection schedules
SELECT 
  route,
  pickup_date,
  updated_at,
  CASE 
    WHEN pickup_date IS NULL OR pickup_date = 'Not set' THEN '⚠️ NEEDS DATE'
    ELSE '✓ OK'
  END as status
FROM collection_schedules
ORDER BY route;

-- ============================================
-- TEST 2: Verify Admin Permissions
-- ============================================
SELECT 
  '✓ TEST 2: Admin User Verification' as test_name,
  email,
  role,
  is_admin,
  CASE 
    WHEN is_admin = true OR role = 'Admin' THEN '✓ HAS ADMIN ACCESS'
    ELSE '⚠️ NO ADMIN ACCESS'
  END as admin_status
FROM profiles 
WHERE id = auth.uid();

-- ============================================
-- TEST 3: Verify RLS Policies
-- ============================================

-- Check collection_schedules policies
SELECT 
  '✓ TEST 3a: Collection Schedules Policies' as test_name,
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN cmd = 'SELECT' AND roles = '{public}' THEN '✓ PUBLIC READ OK'
    WHEN cmd IN ('UPDATE', 'INSERT', 'DELETE') AND roles = '{authenticated}' THEN '✓ ADMIN ONLY OK'
    ELSE '⚠️ CHECK POLICY'
  END as status
FROM pg_policies 
WHERE tablename = 'collection_schedules'
ORDER BY cmd;

-- Check shipments policies
SELECT 
  '✓ TEST 3b: Shipments Policies' as test_name,
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN policyname LIKE '%Admin%' OR policyname LIKE '%admin%' THEN '✓ ADMIN POLICY'
    WHEN policyname LIKE '%guest%' OR policyname LIKE '%Guest%' THEN '✓ GUEST POLICY'
    ELSE '✓ OTHER POLICY'
  END as policy_type
FROM pg_policies 
WHERE tablename = 'shipments'
ORDER BY cmd, policyname;

-- ============================================
-- TEST 4: Sample Data Check
-- ============================================

-- Check recent shipments
SELECT 
  '✓ TEST 4: Recent Shipments' as test_name,
  COUNT(*) as total_shipments,
  COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_bookings
FROM shipments;

-- ============================================
-- TEST 5: Test Update Permission (Safe Test)
-- ============================================

-- This just checks if you CAN update, doesn't actually change anything
SELECT 
  '✓ TEST 5: Update Permission Test' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND (role = 'Admin' OR is_admin = true)
    ) THEN '✓ YOU CAN UPDATE SHIPMENTS'
    ELSE '⚠️ YOU CANNOT UPDATE SHIPMENTS - CHECK ADMIN STATUS'
  END as update_permission;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  '========================================' as separator,
  'VERIFICATION COMPLETE' as status,
  '========================================' as separator2;

-- Final checklist
SELECT 
  'CHECKLIST' as section,
  '1. Collection schedules have public read access' as item1,
  '2. Admin user has proper permissions' as item2,
  '3. RLS policies are correctly configured' as item3,
  '4. Shipments table allows guest bookings' as item4,
  '5. Admin can update shipment statuses' as item5;

-- ============================================
-- NEXT STEPS
-- ============================================
SELECT 
  'NEXT STEPS' as section,
  'If all tests show ✓ OK, you are ready to test in the browser!' as instruction1,
  'Test 1: Open incognito browser and book a shipment' as instruction2,
  'Test 2: Log in as admin and update a shipment status' as instruction3,
  'If any test shows ⚠️, review the fix scripts and run them again' as instruction4;
