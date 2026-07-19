# Google Play Console - Data Safety Answers

## Quick Reference for Completing Data Safety Section

---

## Section 1: Data Collection and Security

### Does your app collect or share any of the required user data types?
**Answer:** ✅ **YES**

---

### Is all of the user data collected by your app encrypted in transit?
**Answer:** ✅ **YES**

**Reason:** All data uses HTTPS/TLS encryption via Supabase

---

### Which methods of account creation does your app support?
**Answer:** ☑️ **Username and password**

**Details:**
- Email address (username)
- Password (minimum 6 characters)
- Email confirmation verification

---

### Add a link for users to request account deletion
**Delete Account URL:**
```
https://zimbabweshipping.com/delete-account
```

**This URL provides:**
- Clear steps to request deletion
- List of what data gets deleted
- List of what data is retained (with reasons)
- Retention periods (7 years for financial records per UK law)
- Multiple contact methods (website, email, WhatsApp)

---

### Do you provide partial data deletion without account deletion?
**Answer:** ❌ **NO**

**Note:** Users can only request full account deletion

---

### Play Families policy commitment
**Answer:** ❌ **NO**

**Reason:** This is not a children's app

---

### Additional badges
**Independent security review:** ❌ No  
**UPI payments verified:** ❌ No (not applicable)

---

## Section 2: Data Types Collected

Check these data types:

### ✅ Personal Info
- [x] Name
- [x] Email address
- [x] User IDs (customer codes)
- [x] Phone number
- [x] Address (collection and delivery)

### ✅ Financial Info
- [x] Payment method (selection only - no card details stored)
- [x] Purchase history (invoices)

### ✅ App Activity
- [x] App interactions (bookings, tracking)
- [x] In-app search history (quotes)

### ✅ App Info and Performance
- [x] Crash logs
- [x] Diagnostics

---

## Section 3: Data Usage and Handling

### For each data type, specify:

**Name:**
- ✅ Collected
- Purpose: Account creation, shipping labels
- Shared: No
- Optional: No (required for service)
- Encrypted in transit: Yes
- Can be deleted: Yes (via account deletion)

**Email address:**
- ✅ Collected
- Purpose: Account creation, order confirmation, notifications
- Shared: No
- Optional: No (required for service)
- Encrypted in transit: Yes
- Can be deleted: Yes (via account deletion)

**Phone number:**
- ✅ Collected
- Purpose: Delivery coordination, order updates
- Shared: No
- Optional: No (required for service)
- Encrypted in transit: Yes
- Can be deleted: Yes (via account deletion)

**Address:**
- ✅ Collected
- Purpose: Collection and delivery of shipments
- Shared: No
- Optional: No (required for service)
- Encrypted in transit: Yes
- Can be deleted: Yes (via account deletion)

**Payment method:**
- ✅ Collected
- Purpose: Processing payments (selection only, no card details)
- Shared: No
- Optional: No
- Encrypted in transit: Yes
- Can be deleted: Financial records retained 7 years (UK tax law)

**Purchase history:**
- ✅ Collected
- Purpose: Order management, customer service
- Shared: No
- Optional: No
- Encrypted in transit: Yes
- Can be deleted: Financial records retained 7 years (UK tax law)

**App interactions:**
- ✅ Collected
- Purpose: App functionality, customer support
- Shared: No
- Optional: No
- Encrypted in transit: Yes
- Can be deleted: Yes (via account deletion)

**Crash logs:**
- ✅ Collected
- Purpose: App stability and performance
- Shared: No
- Optional: Yes (automatic)
- Encrypted in transit: Yes
- Can be deleted: Yes (automatically after 90 days)

---

## Important Notes

### Data Retention After Deletion:

1. **Immediately Deleted:**
   - Account credentials
   - Personal information
   - Addresses
   - Preferences
   - Chat history

2. **Retained (Legal Requirements):**
   - Shipment records: Anonymized, 7 years
   - Invoices/payments: Full records, 7 years (UK tax law)
   - Customer feedback: Anonymized, 2 years
   - Support tickets: Anonymized, 2 years

### Legal Basis for Retention:
- UK tax law requires 7-year retention of financial records
- HMRC (Her Majesty's Revenue and Customs) compliance
- Legitimate business interest in fraud prevention

---

## Content Rating Answers

### Downloaded app content:
**Answer:** ❌ **NO**
- No violent, sexual, or explicit content

### User content sharing:
**Answer:** ❌ **NO**
- No user-to-user communication
- Only AI chatbot interaction

### Online content:
**Answer:** ✅ **YES**
- Shipment data fetched from server
- Collection schedules
- AI-generated responses

### Age-restricted products:
**Answer:** ❌ **NO**
- Shipping/logistics service only

---

## Testing the Delete Account Feature

### Before Submitting to Google Play:

1. **Test the URL works:** https://zimbabweshipping.com/delete-account
2. **Verify signed-in flow:** User can request deletion
3. **Verify email flow:** support@zimbabweshipping.com receives requests
4. **Check page content:** All information is accurate

### Deploy Checklist:

- [ ] Database migration deployed (`account_deletion_requests` table)
- [ ] Edge function deployed (`process-account-deletion`)
- [ ] Website deployed with new page
- [ ] Footer link visible
- [ ] Test deletion request (create test account)
- [ ] Verify admin can process requests
- [ ] Email support@zimbabweshipping.com is monitored

---

## Quick Copy-Paste for Google Play

**Delete Account URL:**
```
https://zimbabweshipping.com/delete-account
```

**Data Retention Summary:**
```
Personal data (name, email, phone, addresses) is deleted immediately upon request. Financial records (invoices, payment history) are retained for 7 years as required by UK tax law. Shipment history is anonymized but retained for business records. Users can request deletion via our website, email (support@zimbabweshipping.com), or WhatsApp (+44 7584 100552).
```

---

## Support Contacts

**Email:** support@zimbabweshipping.com  
**WhatsApp:** +44 7584 100552  
**Website:** https://zimbabweshipping.com/delete-account

---

## Next Steps

1. ✅ Deploy database migration
2. ✅ Deploy edge function
3. ✅ Deploy website changes
4. ✅ Test the delete account flow
5. ⏳ Enter this URL in Google Play Console: `https://zimbabweshipping.com/delete-account`
6. ⏳ Complete Data Safety questionnaire
7. ⏳ Submit app for review

---

**Created:** July 19, 2026  
**For:** Zimbabwe Shipping Customer App  
**Google Play Package:** com.zimbabweshipping.customer
