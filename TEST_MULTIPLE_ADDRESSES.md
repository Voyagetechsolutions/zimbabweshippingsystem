# Testing Guide: Multiple Delivery Addresses

## Quick Test Steps

### Part 1: Booking Form (Already Working)

1. **Navigate to Booking Form**
   - Go to the main booking page
   - Fill in Steps 1 (Sender Details)

2. **Add Multiple Addresses in Step 2**
   - Fill in primary receiver details:
     - Name: "John Doe"
     - Phone: "0771234567"
     - Address: "123 Main Street"
     - City: "Harare"
   
   - Click **"Add another delivery address"**
   - Fill in Address #2:
     - Name: "Jane Smith"
     - Phone: "0772345678"
     - Address: "456 Park Avenue"
     - City: "Bulawayo"
   
   - Click **"Add another delivery address"** again
   - Fill in Address #3:
     - Name: "Bob Johnson"
     - Phone: "0773456789"
     - Address: "789 Garden Road"
     - City: "Mutare"

3. **Verify Door-to-Door Pricing**
   - Check the "Door-to-Door Delivery" checkbox
   - **Expected**: Should show "3 addresses × £40 = £120"
   - Uncheck and recheck to see price update

4. **Check Step 4 Summary**
   - Proceed through Step 3 (Shipment Items)
   - In Step 4, verify you see:
     ```
     Receiver: John Doe
     0771234567
     123 Main Street, Harare, Zimbabwe
     
     Address #2: 456 Park Avenue, Bulawayo
     Address #3: 789 Garden Road, Mutare
     
     Door-to-door delivery (3 addresses) — £120
     ```

5. **Submit Booking**
   - Complete the booking
   - Note the tracking number

---

### Part 2: Delivery Note (New Feature)

1. **Open Admin Dashboard**
   - Login as admin
   - Navigate to Shipments tab
   - Find the shipment you just created

2. **View Delivery Note**
   - Click "Actions" → "Generate Delivery Note"
   - **Expected to see**:
     - Main recipient section: "John Doe" with full details
     - Below that, a new section: **"ADDITIONAL DELIVERY ADDRESSES:"**
     - Two blue cards showing:
       - **Address #2**: Jane Smith, +263 772345678, 456 Park Avenue, Bulawayo
       - **Address #3**: Bob Johnson, +263 773456789, 789 Garden Road, Mutare
     - Delivery method: "Deliver to **3 addresses** listed above"

3. **Edit Delivery Note**
   - Click the **"Edit"** button
   - Scroll to **"Additional Delivery Addresses"** section
   - **Test Editing**:
     - Change Address #2 name to "Jane Smith-Updated"
     - Change Address #3 phone to "0774567890"
   
   - **Test Adding**:
     - Click **"Add another delivery address"**
     - Fill in Address #4:
       - Name: "Sarah Lee"
       - Phone: "0775678901"
       - Address: "321 River Street"
       - City: "Gweru"
   
   - **Test Removing**:
     - Click the trash icon on Address #3 to remove it

4. **Save and Verify**
   - Click **"Save"** button
   - **Expected**: "Saved" toast notification
   - **Verify preview shows**:
     - Address #2: Jane Smith-Updated (with original phone)
     - Address #4: Sarah Lee
     - Address #3: ❌ Should be gone
     - Delivery method: "Deliver to **3 addresses**" (1 primary + 2 additional)

5. **Download PDF**
   - Click **"Download PDF"**
   - Open the PDF
   - **Verify**:
     - All addresses appear in print-friendly format
     - Additional addresses section is clearly labeled
     - Phone numbers have +263 prefix
     - Layout is clean and readable

6. **Test Print**
   - Click **"Print"**
   - **Verify** print preview shows all addresses correctly

---

## Edge Cases to Test

### No Additional Addresses
- Create booking with only primary address (no extras)
- **Expected**: Delivery note should NOT show "Additional Delivery Addresses" section
- Delivery method: "Deliver to 1 address" or just "Deliver directly to recipient"

### Empty Additional Address Fields
- Add an additional address but leave all fields blank
- **Expected**: Should be filtered out (not counted or displayed)

### Door-to-Door Disabled
- Create booking with multiple addresses but DON'T check door-to-door
- **Expected**: 
  - Booking shows addresses but no door-to-door charge
  - Delivery note shows "Depot Collection" regardless of address count

### Editing from Scratch
- Open a delivery note for a shipment with 0 additional addresses
- Click "Edit"
- Click "Add another delivery address"
- Fill in details and save
- **Expected**: Admin can add addresses even if customer didn't

---

## Visual Checkpoints

### Booking Form Step 2
```
┌─────────────────────────────────────┐
│ Primary Receiver Details            │
│ Name: [John Doe]                    │
│ Phone: [0771234567]                 │
│ Address: [123 Main Street]          │
│ City: [Harare]                      │
└─────────────────────────────────────┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ Additional Address #2        [🗑️]  │
│ Name: [Jane Smith]                 │
│ Phone: [0772345678]                │
│ Address: [456 Park Avenue]         │
│ City: [Bulawayo]                   │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

[+ Add another delivery address]

┌─────────────────────────────────────┐
│ ✓ Door-to-Door Delivery             │
│ 3 addresses × £40 = £120            │
└─────────────────────────────────────┘
```

### Delivery Note View
```
╔═══════════════════════════════════════╗
║        DELIVERY NOTE                  ║
║  Ref #: JOH-4567      Date: ...      ║
╚═══════════════════════════════════════╝

RECIPIENT:
John Doe
+263 771234567
123 Main Street
Harare
Zimbabwe

ADDITIONAL DELIVERY ADDRESSES:
┌──────────────────┐ ┌──────────────────┐
│ Address #2       │ │ Address #3       │
│ Jane Smith       │ │ Bob Johnson      │
│ +263 772345678   │ │ +263 773456789   │
│ 456 Park Avenue  │ │ 789 Garden Road  │
│ Bulawayo         │ │ Mutare           │
└──────────────────┘ └──────────────────┘

╔═══════════════════════════════════════╗
║ Delivery Method: Door-to-Door         ║
║ Deliver to 3 addresses listed above   ║
╚═══════════════════════════════════════╝
```

### Delivery Note Edit Form
```
Additional Delivery Addresses
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ Address #2                     [🗑️] │
│ Name: [Jane Smith]                  │
│ Phone: [0772345678]                 │
│ Address: [456 Park Avenue]          │
│ City: [Bulawayo]                    │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ Address #3                     [🗑️] │
│ Name: [Bob Johnson]                 │
│ Phone: [0773456789]                 │
│ Address: [789 Garden Road]          │
│ City: [Mutare]                      │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

[+ Add another delivery address]

[Cancel] [Save]
```

---

## Success Criteria

✅ **Booking Form**
- Can add up to 5 additional addresses
- Price updates correctly per address
- Step 4 summary lists all addresses
- Can remove addresses before submission

✅ **Delivery Note Display**
- Additional addresses section only appears when > 0 extras
- Each address shows in a clean card layout
- Phone numbers have +263 prefix automatically
- Delivery method message shows correct address count

✅ **Delivery Note Editing**
- Can edit existing additional addresses
- Can add new addresses
- Can remove addresses
- Changes save and persist
- Preview updates in real-time

✅ **PDF/Print**
- All addresses appear in exported PDF
- Print preview shows complete document
- Layout is professional and readable

---

## Troubleshooting

### Issue: Additional addresses don't show on delivery note
**Check**: Did the booking include additional addresses? Check shipment metadata:
```json
"recipient": {
  "additionalAddresses": [...]
}
```

### Issue: Can't add addresses in edit mode
**Check**: Is the draft state initialized? Look for console errors.

### Issue: Phone numbers missing +263
**Check**: The `withDialCode()` function should add it automatically for Zimbabwe addresses.

### Issue: Door-to-door price wrong
**Check**: Formula should be `(1 + additionalAddresses.length) × DOOR_TO_DOOR_PRICE`
