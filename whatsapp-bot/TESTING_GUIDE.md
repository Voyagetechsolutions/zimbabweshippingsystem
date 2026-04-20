# Testing Guide - Updated WhatsApp Bot

## 🧪 How to Test All New Features

### Prerequisites
- Bot is running (`npm start`)
- QR code scanned and connected
- Test phone available

---

## Test 1: Welcome Message (New User)

**What to test:** Bot responds to any message with professional welcome

**Steps:**
1. From a **new phone number**, send ANY message:
   - "Hello"
   - "Hi"
   - "I want to ship"
   - "Pricing"
   - Even just "?"

**Expected Result:**
```
🇮🇪 Welcome to Zimbabwe Shipping
Ireland Branch

Thank you for contacting us! We're excited to serve you.

📢 Important Notice:
Collections in Ireland will commence in August 2026

Our Services:
✈️ Ship drums, trunks & boxes to Zimbabwe
🚚 FREE collection across Ireland
📦 Full tracking & insurance
💰 Competitive pricing with volume discounts

How can we help you today?

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us

Reply with a number (1-6) or describe what you need.
```

✅ **Pass:** Welcome message appears immediately
❌ **Fail:** No response or asks for "hi"

---

## Test 2: Complete Booking (First Time)

**What to test:** Full booking flow saves user information

**Steps:**
1. Type: `1`
2. Enter your name: `John Smith`
3. Enter phone: `+353871234567`
4. Enter email: `john@test.com`
5. Enter address: `123 Main Street, Apt 4`
6. Enter city: `Dublin`
7. Enter Eircode: `D02 XY45` (or type `skip`)
8. Enter receiver name: `Mary Moyo`
9. Enter receiver phone: `+263771234567`
10. Enter receiver address: `45 High Street`
11. Enter receiver city: `Harare`
12. Choose shipment type: `1` (drums)
13. Enter quantity: `3`
14. Metal seal: `yes`
15. Door-to-door: `yes`
16. Payment method: `1` (cash)
17. Confirm: `CONFIRM`

**Expected Result:**
```
🎉 Booking Confirmed!

✅ Your tracking number: ZS-ABC12345

📧 Confirmation email sent to john@test.com

📞 We'll contact you within 24 hours to confirm your collection date.

📢 Remember: Collections commence in August 2026

Type track to track your shipment or menu for main menu.
```

✅ **Pass:** Booking confirmed with tracking number
❌ **Fail:** Error or no confirmation

**Verify in Database:**
1. Go to Supabase dashboard
2. Open `shipments` table
3. Find the new record with tracking number
4. Check all fields are populated

---

## Test 3: Returning Customer (Saved Details)

**What to test:** Bot remembers user and offers saved details

**Steps:**
1. From the **same phone number** as Test 2
2. Send any message (e.g., "Hi")
3. Type: `1` (Book a Shipment)

**Expected Result:**
```
📦 Start Your Booking

Welcome back John! 👋

I have your details saved. Would you like to:

1️⃣ Use saved details (faster)
2️⃣ Enter new details

Type 1 or 2
```

4. Type: `1` (Use saved details)

**Expected Result:**
```
✅ Your Saved Information:

👤 Name: John Smith
📧 Email: john@test.com
🏠 Address: 123 Main Street, Apt 4
🏙️ City: Dublin
📮 Eircode: D02 XY45

Is this information still correct?

Type yes to continue or no to update
```

5. Type: `yes`

**Expected Result:**
Bot skips directly to receiver details:
```
✅ Perfect! Now let's get the receiver details in Zimbabwe.

👤 What's the receiver's full name?
```

✅ **Pass:** Bot remembers user and pre-fills information
❌ **Fail:** Asks for all details again

---

## Test 4: Group Message Ignore

**What to test:** Bot does NOT respond to group messages

**Steps:**
1. Create a WhatsApp group
2. Add the bot's number to the group
3. Send a message in the group: "Hello bot"

**Expected Result:**
- Bot does NOT respond
- No message from bot in group
- Check terminal logs: Should see "Ignoring group message from: [group-id]@g.us"

✅ **Pass:** Bot ignores group message
❌ **Fail:** Bot responds in group

---

## Test 5: Menu Navigation

**What to test:** All menu options work

**Steps:**
1. Type: `menu`
2. Try each option:
   - Type `2` → Should show pricing
   - Type `menu` → Back to main menu
   - Type `4` → Should show collection areas
   - Type `menu` → Back to main menu
   - Type `5` → Should show FAQ categories
   - Type `menu` → Back to main menu
   - Type `6` → Should show contact info

✅ **Pass:** All menu options work
❌ **Fail:** Any option doesn't work

---

## Test 6: Tracking

**What to test:** Tracking works with saved tracking number

**Steps:**
1. Type: `3` (Track Shipment)
2. Enter the tracking number from Test 2: `ZS-ABC12345`

**Expected Result:**
```
📦 Shipment Tracking

🔢 Tracking: ZS-ABC12345
📍 Status: Pending Collection

ROUTE:
🇮🇪 From: Dublin, Ireland
🇿🇼 To: Harare, Zimbabwe

SENDER:
👤 John Smith
📱 +353871234567

RECEIVER:
👤 Mary Moyo
📱 +263771234567
🏙️ Harare

TIMELINE:
✅ Pending Collection
🔄 Collected (Next)
⏳ In Transit to Port
[...]
```

✅ **Pass:** Shows complete tracking information
❌ **Fail:** Error or "not found"

---

## Test 7: Cancel Booking

**What to test:** User can cancel at any time

**Steps:**
1. Type: `1` (Start booking)
2. Enter name: `Test User`
3. Type: `cancel`

**Expected Result:**
```
Booking cancelled.

[Main Menu appears]
```

✅ **Pass:** Booking cancelled, returns to menu
❌ **Fail:** Doesn't cancel or error

---

## Test 8: Invalid Input Handling

**What to test:** Bot handles invalid inputs gracefully

**Steps:**
1. Type: `1` (Start booking)
2. Enter name: `Test User`
3. Enter invalid phone: `abc123`

**Expected Result:**
```
❌ Please enter a valid phone number.
```

4. Enter valid phone: `+353871234567`
5. Enter invalid email: `notanemail`

**Expected Result:**
```
❌ Please enter a valid email address.
```

6. Enter valid email: `test@test.com`
7. Continue to city
8. Enter invalid city: `NotACity`

**Expected Result:**
```
❌ Sorry, I don't recognize "NotACity". Please enter a valid Irish city/town.

Common cities: Dublin, Cork, Belfast, Galway, Limerick, Waterford
```

✅ **Pass:** All invalid inputs caught with helpful messages
❌ **Fail:** Bot accepts invalid input or crashes

---

## Test 9: Pricing Display

**What to test:** Pricing shows correctly with August notice

**Steps:**
1. Type: `2` (View Pricing)

**Expected Result:**
```
💰 Ireland Pricing (EUR)

DRUM SHIPPING (200-220L):
🥁 5+ drums: €340 per drum
🥁 2-4 drums: €350 per drum
🥁 1 drum: €360 per drum

TRUNK/STORAGE BOX SHIPPING:
📦 5+ items: €200 per item
📦 2-4 items: €210 per item
📦 1 item: €220 per item

ADDITIONAL SERVICES:
🔒 Metal Coded Seal: €7
🚪 Door-to-Door Delivery (Zimbabwe): €25

WHAT'S INCLUDED:
✅ FREE collection anywhere in Ireland
✅ Full tracking
✅ 6 weeks shipping time (drums)
✅ 10-14 days (parcels)
✅ Professional handling
[...]
```

✅ **Pass:** Pricing displays correctly
❌ **Fail:** Wrong prices or formatting issues

---

## Test 10: Database Verification

**What to test:** All data is saved correctly

**Steps:**
1. Complete a booking (Test 2)
2. Go to Supabase dashboard
3. Navigate to `shipments` table
4. Find the record

**Verify these fields:**
- ✅ `tracking_number` exists (ZS-XXXXXXXX)
- ✅ `status` = "Pending Collection"
- ✅ `origin` = "[City], Ireland"
- ✅ `destination` = "[City], Zimbabwe"
- ✅ `metadata.sender` has all sender details
- ✅ `metadata.recipient` has all receiver details
- ✅ `metadata.shipment` has drums/boxes count
- ✅ `metadata.payment.method` is set
- ✅ `metadata.whatsappNumber` matches phone
- ✅ `metadata.bookingType` = "whatsapp"
- ✅ `created_at` timestamp is correct

✅ **Pass:** All data saved correctly
❌ **Fail:** Missing or incorrect data

---

## 🎯 Quick Test Checklist

- [ ] Welcome message appears for any first message
- [ ] August 2026 notice is visible
- [ ] Complete booking works
- [ ] Tracking number generated
- [ ] Data saved to database
- [ ] Returning user recognized
- [ ] Saved details offered
- [ ] Pre-filled info correct
- [ ] Group messages ignored
- [ ] All menu options work
- [ ] Tracking works
- [ ] Cancel works
- [ ] Invalid inputs handled
- [ ] Pricing displays correctly

---

## 🐛 Common Issues

### Issue: Bot doesn't respond
**Solution:** Check if bot is running (`npm start`)

### Issue: Database error
**Solution:** Verify `.env` has correct Supabase credentials

### Issue: QR code not appearing
**Solution:** Restart bot, ensure internet connection

### Issue: Bot responds in groups
**Solution:** Check code update was applied correctly

### Issue: Doesn't remember user
**Solution:** Session may have expired (24 hours), test again

---

## ✅ Success Criteria

All tests should pass for the bot to be production-ready:
- ✅ Responds to any message
- ✅ Professional welcome message
- ✅ August notice displayed
- ✅ Complete bookings work
- ✅ Database integration works
- ✅ User memory works
- ✅ Ignores groups
- ✅ Handles errors gracefully

**If all tests pass, your bot is ready to serve customers!** 🎉🇮🇪🇿🇼
