-- =====================================================
-- TEST & VERIFY COLLECTION DATES SYSTEM
-- Run these queries in Supabase SQL Editor to test
-- =====================================================

-- 1. CHECK IF COLLECTION_SCHEDULES TABLE EXISTS
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'collection_schedules'
);
-- Expected: true

-- 2. VIEW ALL COLLECTION SCHEDULES
SELECT 
    id,
    route,
    pickup_date,
    areas,
    created_at,
    updated_at
FROM collection_schedules
ORDER BY route;

-- 3. TEST UPDATE A COLLECTION DATE (Example: LONDON ROUTE)
-- Change 'December 15th, 2025' to your desired date
UPDATE collection_schedules
SET 
    pickup_date = 'December 15th, 2025',
    updated_at = NOW()
WHERE route = 'LONDON'
RETURNING *;

-- 4. VERIFY THE UPDATE WORKED
SELECT route, pickup_date, updated_at
FROM collection_schedules
WHERE route = 'LONDON';

-- 5. INSERT MISSING ROUTES (If some routes don't exist)
-- This will create routes if they're missing
INSERT INTO collection_schedules (route, pickup_date, areas)
VALUES 
    ('LONDON', 'December 10th, 2025', ARRAY['Central London', 'Heathrow', 'East London']),
    ('BIRMINGHAM', 'December 12th, 2025', ARRAY['Wolverhampton', 'Coventry', 'Warwick']),
    ('MANCHESTER', 'December 14th, 2025', ARRAY['Liverpool', 'Bolton', 'Warrington']),
    ('LEEDS', 'December 11th, 2025', ARRAY['Wakefield', 'Halifax', 'Sheffield']),
    ('CARDIFF', 'December 13th, 2025', ARRAY['Cardiff', 'Bristol', 'Gloucester']),
    ('SCOTLAND', 'December 16th, 2025', ARRAY['Glasgow', 'Edinburgh', 'Newcastle']),
    ('NOTTINGHAM', 'December 9th, 2025', ARRAY['Leicester', 'Derby', 'Peterborough']),
    ('BRIGHTON', 'December 8th, 2025', ARRAY['High Wycombe', 'Slough', 'Eastbourne']),
    ('SOUTHEND', 'December 17th, 2025', ARRAY['Norwich', 'Ipswich', 'Colchester']),
    ('NORTHAMPTON', 'December 7th, 2025', ARRAY['Kettering', 'Bedford', 'Milton Keynes']),
    ('BOURNEMOUTH', 'December 6th, 2025', ARRAY['Southampton', 'Portsmouth', 'Reading'])
ON CONFLICT (route) DO NOTHING;

-- 6. TEST QUERY THAT BOOKING FLOW USES
-- This simulates what happens when user enters postal code
SELECT pickup_date 
FROM collection_schedules
WHERE route = 'LONDON'
LIMIT 1;

-- 7. CHECK FOR ROUTES WITHOUT DATES
SELECT route, pickup_date
FROM collection_schedules
WHERE pickup_date IS NULL OR pickup_date = '';

-- 8. UPDATE ALL ROUTES TO HAVE DATES (If needed)
UPDATE collection_schedules
SET pickup_date = 'December 15th, 2025'
WHERE pickup_date IS NULL OR pickup_date = '';

-- =====================================================
-- DEBUGGING HELPERS
-- =====================================================

-- 9. COUNT TOTAL ROUTES
SELECT COUNT(*) as total_routes
FROM collection_schedules;

-- 10. VIEW LAST 5 UPDATES
SELECT route, pickup_date, updated_at
FROM collection_schedules
ORDER BY updated_at DESC
LIMIT 5;

-- 11. TEST SPECIFIC POSTAL CODE ROUTE MATCHING
-- Example: If user enters "SW1" postal code
-- The app looks for "LONDON" route (without " ROUTE" suffix)
SELECT 
    'SW1' as postal_code_entered,
    'LONDON ROUTE' as detected_route_from_utils,
    'LONDON' as database_route_name,
    pickup_date
FROM collection_schedules
WHERE route = 'LONDON';

-- =====================================================
-- VERIFICATION CHECKLIST
-- =====================================================
-- ✓ Table exists
-- ✓ Routes have dates in format "December 15th, 2025"
-- ✓ Route names are WITHOUT " ROUTE" suffix in database
-- ✓ Updated_at timestamps are recent
-- ✓ All routes have pickup_date values (not NULL)
-- =====================================================

-- 12. FINAL VERIFICATION - Show sample booking flow query
SELECT 
    route,
    pickup_date,
    CASE 
        WHEN pickup_date IS NULL THEN '❌ Missing'
        WHEN pickup_date = '' THEN '❌ Empty'
        ELSE '✓ Has Date'
    END as status
FROM collection_schedules
ORDER BY route;
