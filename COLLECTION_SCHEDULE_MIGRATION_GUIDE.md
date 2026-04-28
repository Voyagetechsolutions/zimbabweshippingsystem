# Collection Schedule Migration Guide

## 🎯 Overview

This guide helps you migrate from the old list-based collection schedule to the new calendar-based system with regional separation and collection periods.

## ✅ Pre-Migration Checklist

- [ ] Backup your database
- [ ] Verify all existing routes have dates
- [ ] Check that shipments are linked to schedules
- [ ] Ensure admin permissions are working

## 📋 Migration Steps

### Step 1: Verify Database Schema

Run this SQL to check if the new columns exist:

```sql
-- Check if country column exists in collection_schedules
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'collection_schedules' 
AND column_name = 'country';

-- Check if collection_periods table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'collection_periods'
);

-- Check if collection_period_id exists in shipments
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'shipments' 
AND column_name = 'collection_period_id';
```

### Step 2: Update Existing Routes with Country

If your routes don't have country assigned, run this:

```sql
-- Set England as default for existing routes
UPDATE collection_schedules
SET country = 'England'
WHERE country IS NULL;

-- Update specific routes to Ireland (adjust route names as needed)
UPDATE collection_schedules
SET country = 'Ireland'
WHERE route IN (
  'LONDONDERRY',
  'CAVAN',
  'ATHLONE',
  'DUBLIN CITY',
  'CORK',
  'LIMERICK',
  'BELFAST'
);
```

### Step 3: Create Initial Collection Periods

The system will auto-create periods, but you can manually create them:

```sql
-- Create current and upcoming periods
INSERT INTO collection_periods (name, month, year, status)
VALUES 
  ('May 2026', 'May', 2026, 'active'),
  ('June 2026', 'June', 2026, 'active'),
  ('July 2026', 'July', 2026, 'active')
ON CONFLICT (name) DO NOTHING;
```

### Step 4: Link Existing Shipments to Periods

This should happen automatically via trigger, but verify:

```sql
-- Check how many shipments have periods assigned
SELECT 
  COUNT(*) as total_shipments,
  COUNT(collection_period_id) as with_period,
  COUNT(*) - COUNT(collection_period_id) as without_period
FROM shipments;

-- If some are missing, manually assign them
DO $$
DECLARE
  shipment_record RECORD;
  period_name TEXT;
  period_month TEXT;
  period_year INTEGER;
  period_id UUID;
BEGIN
  FOR shipment_record IN 
    SELECT id, created_at 
    FROM shipments 
    WHERE collection_period_id IS NULL 
  LOOP
    period_month := TO_CHAR(shipment_record.created_at, 'Month');
    period_month := TRIM(period_month);
    period_year := EXTRACT(YEAR FROM shipment_record.created_at);
    period_name := period_month || ' ' || period_year;
    
    -- Get or create period
    SELECT id INTO period_id
    FROM collection_periods
    WHERE name = period_name;
    
    IF period_id IS NULL THEN
      INSERT INTO collection_periods (name, month, year)
      VALUES (period_name, period_month, period_year)
      RETURNING id INTO period_id;
    END IF;
    
    -- Update shipment
    UPDATE shipments
    SET collection_period_id = period_id
    WHERE id = shipment_record.id;
  END LOOP;
END $$;
```

### Step 5: Verify Data Integrity

```sql
-- Check routes by country
SELECT country, COUNT(*) as route_count
FROM collection_schedules
GROUP BY country;

-- Check shipments by period
SELECT 
  cp.name as period,
  COUNT(s.id) as shipment_count
FROM collection_periods cp
LEFT JOIN shipments s ON s.collection_period_id = cp.id
GROUP BY cp.name, cp.year, cp.month
ORDER BY cp.year DESC, cp.month DESC;

-- Check shipments without schedules
SELECT COUNT(*) as unassigned_shipments
FROM shipments
WHERE collection_schedule_id IS NULL;
```

## 🔄 Data Mapping

### Old System → New System

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| route | route | Same |
| areas | areas | Same |
| pickup_date | pickup_date | Same |
| schedule_name | schedule_name | Auto-generated if null |
| - | country | New field (England/Ireland) |
| - | collection_period_id | New link to periods |

## 🎨 UI Changes

### Old Interface
```
┌─────────────────────────────────────────┐
│ Collection Schedules                    │
├─────────────────────────────────────────┤
│ LONDON ROUTE - May 15th                 │
│ MANCHESTER ROUTE - May 23rd             │
│ DUBLIN CITY - May 29th                  │
│ BELFAST - September 3rd                 │
└─────────────────────────────────────────┘
```

### New Interface
```
┌─────────────────────────────────────────┐
│ Collection Period: [May 2026 ▼]        │
├─────────────────────────────────────────┤
│ [England] [Ireland]                     │
├─────────────────────────────────────────┤
│        Calendar View                    │
│  ┌───┬───┬───┬───┬───┬───┬───┐        │
│  │Sun│Mon│Tue│Wed│Thu│Fri│Sat│        │
│  ├───┼───┼───┼───┼───┼───┼───┤        │
│  │   │   │   │15 │   │   │   │        │
│  │   │   │   │LONDON│   │   │        │
└─────────────────────────────────────────┘
```

## 📝 Admin Training

### New Workflow

#### Creating a Collection Period
1. Navigate to **Admin Dashboard** → **Collection Schedule**
2. At the top, find "Collection Period" section
3. Type period name (e.g., "May 2026")
4. Click **"Create Period"**
5. Period is now active and selected

#### Adding Routes for England
1. Click **"England"** tab
2. Use **◄ ►** buttons to navigate to desired month
3. Click on the **date** you want to schedule
4. In the dialog:
   - Enter **Route Name** (e.g., "LONDON ROUTE")
   - Enter **Areas** (e.g., "Central London, Heathrow, East London")
5. Click **"Add Route"**
6. Route appears on calendar

#### Adding Routes for Ireland
1. Click **"Ireland"** tab
2. Follow same process as England
3. Routes are automatically tagged as Ireland

#### Managing Shipments
1. Click on a **route card** in the calendar
2. Dialog opens showing all shipments
3. Use **checkboxes** to select shipments
4. Choose **new status** from dropdown
5. Click **"Update X Shipment(s)"**

### Tips for Admins

✅ **DO:**
- Create periods at the start of each month
- Use consistent naming (e.g., "CITY ROUTE")
- Add all routes for the month at once
- Use bulk updates for efficiency
- Filter by period when updating statuses

❌ **DON'T:**
- Mix England and Ireland routes
- Forget to select a period before bulk updates
- Delete periods with active shipments
- Use inconsistent date formats

## 🐛 Troubleshooting

### Issue: Routes not showing on calendar

**Solution:**
```sql
-- Check if route has a valid pickup_date
SELECT route, pickup_date, country
FROM collection_schedules
WHERE route = 'YOUR_ROUTE_NAME';

-- Update if needed
UPDATE collection_schedules
SET pickup_date = 'May 15th, 2026',
    country = 'England'
WHERE route = 'YOUR_ROUTE_NAME';
```

### Issue: Shipments not appearing in route view

**Solution:**
```sql
-- Check if shipments are linked to schedule
SELECT 
  s.tracking_number,
  s.collection_schedule_id,
  cs.route
FROM shipments s
LEFT JOIN collection_schedules cs ON cs.id = s.collection_schedule_id
WHERE s.tracking_number = 'YOUR_TRACKING_NUMBER';

-- Link shipment to schedule if needed
UPDATE shipments
SET collection_schedule_id = (
  SELECT id FROM collection_schedules 
  WHERE route = 'ROUTE_NAME' 
  LIMIT 1
)
WHERE tracking_number = 'YOUR_TRACKING_NUMBER';
```

### Issue: Bulk update not working

**Checklist:**
1. Are shipments selected (checkboxes checked)?
2. Is a status selected from dropdown?
3. Do you have admin permissions?
4. Check browser console for errors

**SQL Check:**
```sql
-- Verify admin permissions
SELECT is_admin 
FROM profiles 
WHERE id = auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'shipments';
```

### Issue: Period not filtering shipments

**Solution:**
```sql
-- Check if shipments have period assigned
SELECT 
  COUNT(*) as total,
  COUNT(collection_period_id) as with_period
FROM shipments;

-- Assign period to shipments
UPDATE shipments s
SET collection_period_id = (
  SELECT id FROM collection_periods
  WHERE name = 'May 2026'
)
WHERE DATE_TRUNC('month', s.created_at) = '2026-05-01'
AND collection_period_id IS NULL;
```

## 📊 Verification Queries

### Check Migration Success

```sql
-- 1. All routes have country
SELECT 
  COUNT(*) as total_routes,
  COUNT(country) as with_country,
  COUNT(*) - COUNT(country) as missing_country
FROM collection_schedules;

-- 2. All shipments have period
SELECT 
  COUNT(*) as total_shipments,
  COUNT(collection_period_id) as with_period,
  COUNT(*) - COUNT(collection_period_id) as missing_period
FROM shipments;

-- 3. Routes by country
SELECT 
  country,
  COUNT(*) as route_count,
  COUNT(DISTINCT pickup_date) as unique_dates
FROM collection_schedules
GROUP BY country;

-- 4. Shipments by period
SELECT 
  cp.name,
  COUNT(s.id) as shipment_count,
  COUNT(DISTINCT s.collection_schedule_id) as unique_routes
FROM collection_periods cp
LEFT JOIN shipments s ON s.collection_period_id = cp.id
GROUP BY cp.name
ORDER BY cp.year DESC, cp.month DESC;

-- 5. Orphaned shipments (no schedule or period)
SELECT 
  tracking_number,
  status,
  created_at,
  CASE 
    WHEN collection_schedule_id IS NULL THEN 'No Schedule'
    WHEN collection_period_id IS NULL THEN 'No Period'
    ELSE 'OK'
  END as issue
FROM shipments
WHERE collection_schedule_id IS NULL 
   OR collection_period_id IS NULL;
```

## 🎓 Training Checklist

### For Admins
- [ ] Understand collection periods concept
- [ ] Know how to create periods
- [ ] Can navigate calendar interface
- [ ] Can add routes to England
- [ ] Can add routes to Ireland
- [ ] Can view shipments for a route
- [ ] Can perform bulk status updates
- [ ] Know how to filter by period

### For Support Team
- [ ] Understand regional separation
- [ ] Can explain periods to customers
- [ ] Know how to check route schedules
- [ ] Can troubleshoot common issues

## 📞 Support

### Common Questions

**Q: Can I still see the old list view?**
A: Yes, the old component is preserved in `CollectionScheduleManagementEnhanced.tsx` if needed.

**Q: What happens to existing shipments?**
A: They are automatically assigned to periods based on their creation date.

**Q: Can I move a route from England to Ireland?**
A: Yes, update the `country` field in the database or recreate the route.

**Q: How do I close a period?**
A: Update the period status to 'closed' in the database.

**Q: Can I have multiple periods active?**
A: Yes, but only one can be selected at a time for filtering.

## ✅ Post-Migration Checklist

- [ ] All routes have country assigned
- [ ] All shipments have periods assigned
- [ ] Calendar displays correctly for both regions
- [ ] Bulk updates work as expected
- [ ] Period filtering works correctly
- [ ] Admin team trained on new interface
- [ ] Documentation updated
- [ ] Old system backed up

## 🎉 Success Criteria

Migration is successful when:
- ✅ Calendar shows all routes correctly
- ✅ England and Ireland tabs work
- ✅ Periods filter shipments correctly
- ✅ Bulk updates work smoothly
- ✅ No orphaned shipments
- ✅ Admin team comfortable with new UI

## 📚 Additional Resources

- **Full Documentation**: `COLLECTION_SCHEDULE_CALENDAR_REDESIGN.md`
- **Feature Summary**: `COLLECTION_SCHEDULE_FEATURES.md`
- **Component**: `src/components/admin/tabs/CollectionScheduleCalendarTab.tsx`
- **Database Schema**: `supabase/migrations/20260422_collection_periods.sql`

---

**Need Help?** Check the troubleshooting section or contact technical support.
