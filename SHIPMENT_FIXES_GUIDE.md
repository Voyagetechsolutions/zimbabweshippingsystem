# FIXES FOR SHIPMENT STATUS & COLLECTION DATE ISSUES

## Issues Identified

### Issue 1: Owner Cannot Update Shipment Status
**Problem**: The owner is unable to update shipment statuses in the admin panel.
**Root Cause**: Row Level Security (RLS) policies require proper admin permissions.

### Issue 2: Non-Logged-In Users Cannot See Collection Dates
**Problem**: When users book shipments without logging in, they see "To be confirmed" instead of actual collection dates.
**Root Cause**: The `collection_schedules` table RLS policies only allow authenticated users to read data.

---

## SOLUTION 1: Fix Collection Date Visibility for All Users

### Step 1: Run the SQL Script
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/fix_collection_dates_public_access.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click **Run** to execute

### What This Does:
- Allows **public read access** to collection schedules (anyone can view)
- Keeps **admin-only access** for creating, updating, and deleting schedules
- Non-authenticated users can now see collection dates when booking

### Verification:
After running the script, test by:
1. Opening an incognito/private browser window
2. Going to https://zimbabweshipping.com/book-shipment
3. Entering a postal code (e.g., "SW" for London)
4. You should now see the actual collection date instead of "To be confirmed"

---

## SOLUTION 2: Fix Admin Permissions for Shipment Status Updates

### Step 1: Run the SQL Script
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/fix_admin_shipment_updates.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click **Run** to execute

### Step 2: Verify Your Admin Status
The script will show your current profile. You should see:
```
role: 'Admin'
is_admin: true
```

### Step 3: Grant Admin Access (If Needed)
If you don't have admin access, uncomment and modify this line in the script:
```sql
UPDATE profiles 
SET is_admin = true, role = 'Admin'
WHERE email = 'your-actual-email@example.com';
```
Replace `'your-actual-email@example.com'` with your actual email address, then run it.

### Step 4: Test Shipment Status Update
1. Log in to your admin dashboard
2. Go to **Shipment Management**
3. Click **View** on any shipment
4. Click **Update Status**
5. Select a new status and click **Confirm Update**
6. It should now work without errors!

---

## Quick Test Checklist

### For Collection Dates (Issue 2):
- [ ] Run `fix_collection_dates_public_access.sql`
- [ ] Open incognito browser
- [ ] Go to booking page
- [ ] Enter postal code
- [ ] Verify collection date shows (not "To be confirmed")

### For Shipment Status Updates (Issue 1):
- [ ] Run `fix_admin_shipment_updates.sql`
- [ ] Verify admin status in results
- [ ] Grant admin access if needed
- [ ] Log in to admin panel
- [ ] Try updating a shipment status
- [ ] Verify update succeeds

---

## Troubleshooting

### If Collection Dates Still Show "To be confirmed":
1. Check if the collection schedules have actual dates set:
   ```sql
   SELECT route, pickup_date FROM collection_schedules;
   ```
2. If dates are "Not set" or empty, update them:
   ```sql
   UPDATE collection_schedules 
   SET pickup_date = 'February 7th, 2026' 
   WHERE route = 'LONDON ROUTE';
   ```

### If Shipment Status Update Still Fails:
1. Verify you're logged in with the correct admin account
2. Check browser console for errors (F12 → Console tab)
3. Verify the RLS policies were created:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'shipments';
   ```
4. Make sure your profile has `is_admin = true`:
   ```sql
   SELECT email, is_admin, role FROM profiles WHERE id = auth.uid();
   ```

---

## Summary of Changes

### Database Changes:
1. **collection_schedules table**: Added public read access
2. **shipments table**: Fixed admin update permissions

### No Code Changes Required:
- The frontend code is already correct
- All fixes are database-level (RLS policies)

---

## Need Help?

If you encounter any issues:
1. Check the Supabase logs (Dashboard → Logs)
2. Verify all SQL scripts ran without errors
3. Make sure you're using the correct admin email
4. Clear browser cache and try again

---

## Files Created:
- `supabase/fix_collection_dates_public_access.sql` - Fixes collection date visibility
- `supabase/fix_admin_shipment_updates.sql` - Fixes admin shipment status updates
- `SHIPMENT_FIXES_GUIDE.md` - This guide
