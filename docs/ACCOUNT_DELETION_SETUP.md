# Account Deletion Feature - Setup Guide

## Overview
This document explains the account deletion feature created for Google Play Data Safety compliance.

## What Was Created

### 1. **Delete Account Page** (`/delete-account`)
- **URL**: `https://zimbabweshipping.com/delete-account`
- **Location**: `src/pages/DeleteAccount.tsx`
- Beautiful, comprehensive page that explains:
  - What data gets deleted
  - What data is retained (for legal/tax purposes)
  - Retention periods (7 years for financial records per UK law)
  - How to request deletion (3 methods: sign in, email, WhatsApp)
  - Alternative options before deleting

### 2. **Database Table** 
- **Table**: `account_deletion_requests`
- **Migration**: `supabase/migrations/20260719_account_deletion_requests.sql`
- Tracks all deletion requests with status workflow:
  - `pending` → `processing` → `completed` or `cancelled`
- Includes RLS (Row Level Security) policies

### 3. **Edge Function**
- **Function**: `process-account-deletion`
- **Location**: `supabase/functions/process-account-deletion/index.ts`
- Admin-only function that:
  - Deletes personal data (addresses, profile, credentials)
  - Anonymizes shipment and feedback data
  - Keeps financial records (legal requirement)
  - Updates request status

### 4. **Footer Link**
- Added "Delete Account" link in website footer
- Visible on all pages

---

## Deployment Steps

### Step 1: Deploy Database Migration

Run this SQL in your Supabase SQL Editor or via CLI:

```bash
# Using Supabase CLI
supabase db push

# Or manually copy/paste the contents of:
# supabase/migrations/20260719_account_deletion_requests.sql
```

### Step 2: Deploy Edge Function

```bash
# Navigate to project root
cd c:\Users\Mthokozisi.DESKTOP-DPOBCC1\Documents\zimbabwe-shipping-nexus

# Deploy the edge function
supabase functions deploy process-account-deletion
```

### Step 3: Deploy Website Changes

```bash
# Build and deploy your website
npm run build

# Deploy to your hosting (Vercel/Netlify/etc)
# The changes include:
# - src/pages/DeleteAccount.tsx (new)
# - src/App.tsx (updated with route)
# - src/pages/Footer.tsx (updated with link)
```

### Step 4: Test the Feature

1. **Visit the page**: https://zimbabweshipping.com/delete-account
2. **Test signed-in flow**: 
   - Sign in as a test user
   - Click "Request Account Deletion"
   - Verify request appears in `account_deletion_requests` table
3. **Test email flow**:
   - Send email to support@zimbabweshipping.com
   - Manually process in admin dashboard

---

## Google Play Console Configuration

### Data Safety Section Answers:

**Delete account URL:**
```
https://zimbabweshipping.com/delete-account
```

This URL:
- ✅ Mentions "Zimbabwe Shipping" prominently
- ✅ Shows clear steps to request deletion
- ✅ Lists what data is deleted vs retained
- ✅ Specifies retention periods (7 years for financial records)

---

## How Users Delete Their Account

### Method 1: From Website (Signed In)
1. Sign in to account
2. Visit https://zimbabweshipping.com/delete-account
3. Click "Request Account Deletion"
4. Confirm in dialog
5. Receive confirmation email within 48 hours

### Method 2: From Website (Not Signed In)
1. Visit https://zimbabweshipping.com/delete-account
2. Click "Sign In" button
3. After signing in, follow Method 1

### Method 3: Email
1. Email support@zimbabweshipping.com
2. Subject: "Account Deletion Request"
3. Must use registered email address
4. Team processes manually

### Method 4: WhatsApp
1. Message: +44 7584 100552
2. Request account deletion
3. Team processes manually

---

## Admin Processing (Manual)

### Option A: Using Edge Function (Recommended)

```typescript
// Call from admin dashboard or directly via API
const response = await supabase.functions.invoke('process-account-deletion', {
  body: { requestId: 'uuid-of-request' }
})
```

### Option B: Manual Processing

1. Go to Supabase dashboard
2. Find request in `account_deletion_requests` table
3. Update status to `processing`
4. Run the following SQL:

```sql
-- Replace USER_ID_HERE with actual user ID
BEGIN;

-- Delete addresses
DELETE FROM customer_addresses WHERE user_id = 'USER_ID_HERE';

-- Anonymize feedback
UPDATE customer_feedback 
SET user_id = NULL, comments = '[User account deleted]'
WHERE user_id = 'USER_ID_HERE';

-- Anonymize shipments (keep for legal records)
UPDATE shipments 
SET metadata = NULL, notes = '[Customer account deleted - personal data removed]'
WHERE user_id = 'USER_ID_HERE';

-- Delete notifications
DELETE FROM notifications WHERE user_id = 'USER_ID_HERE';

-- Delete profile
DELETE FROM profiles WHERE id = 'USER_ID_HERE';

-- Delete auth user (requires service_role key)
-- Use Supabase dashboard: Authentication > Users > Delete

-- Update request status
UPDATE account_deletion_requests 
SET status = 'completed', 
    processed_at = NOW(),
    notes = 'Account deleted. Financial records retained per UK law.'
WHERE user_id = 'USER_ID_HERE';

COMMIT;
```

---

## What Gets Deleted vs Retained

### ✅ Deleted Immediately:
- Account credentials (email/password)
- Personal information (name, phone)
- Delivery addresses
- Notification preferences
- Chat history with Zimmy
- Profile data

### 📋 Retained (Legal Requirement):
- **Shipment records**: Anonymized (7 years)
- **Invoices/payments**: Full records (7 years per UK tax law)
- **Customer feedback**: Anonymized (2 years)
- **Support tickets**: Anonymized (2 years)

---

## Compliance Notes

### GDPR Compliance
- ✅ Right to erasure (Article 17)
- ✅ Data minimization
- ✅ Lawful basis for retention (legal obligation)
- ✅ Clear communication to users

### UK Tax Law
- ✅ Financial records retained for 7 years
- ✅ VAT records retained as required
- ✅ Audit trail maintained

### Google Play Requirements
- ✅ Prominent deletion option
- ✅ Clear data retention policy
- ✅ Accessible from store listing

---

## Monitoring Deletion Requests

### Query Pending Requests:
```sql
SELECT 
  id,
  email,
  status,
  requested_at,
  requested_at::date as days_ago
FROM account_deletion_requests
WHERE status = 'pending'
ORDER BY requested_at DESC;
```

### Weekly Report:
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - requested_at))/3600) as avg_hours_to_process
FROM account_deletion_requests
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## Support Team Actions

When a deletion request comes via email or WhatsApp:

1. **Verify identity**: Confirm email matches account
2. **Create record**: Insert into `account_deletion_requests` table
3. **Process**: Use edge function or manual SQL
4. **Confirm**: Email user when complete
5. **Log**: Add notes to request record

---

## Questions?

Contact: support@zimbabweshipping.com

---

## Summary for Google Play Console

**Use this URL in Data Safety section:**
```
https://zimbabweshipping.com/delete-account
```

**What to tell Google:**
- Users can request deletion via website (signed in), email, or WhatsApp
- Personal data deleted within 48 hours
- Financial records retained for 7 years (UK legal requirement)
- Shipment history anonymized after deletion
