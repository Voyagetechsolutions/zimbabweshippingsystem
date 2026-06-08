# Quick Reference: Multiple Delivery Addresses

## 🎯 What's New?

Customers can now ship to **multiple addresses in Zimbabwe** in a single booking, with automatic **per-address door-to-door pricing**. Admins can view and edit all addresses on delivery notes.

---

## 🚀 How It Works

### For Customers (Booking)

1. **Fill in primary receiver** (Step 2)
2. **Click "Add another delivery address"** for each extra location
3. **See pricing update** automatically: `3 addresses × £40 = £120`
4. **Review all addresses** in Step 4 summary before paying

### For Admins (Delivery Notes)

1. **Open shipment** → Click "Generate Delivery Note"
2. **View additional addresses** in dedicated blue section
3. **Click "Edit"** to add/modify/remove addresses
4. **Save changes** → Updates delivery note
5. **Download PDF** with all addresses included

---

## 📍 Where to Find It

### Booking Form
- **File**: `src/components/SimplifiedBookingForm.tsx`
- **Location**: Step 2 (Receiver Details)
- **Look for**: "Add another delivery address" button

### Delivery Note
- **File**: `src/components/admin/DeliveryNoteGenerator.tsx`
- **Location**: Below main recipient section
- **Look for**: "ADDITIONAL DELIVERY ADDRESSES" heading

---

## 💾 Data Structure

```typescript
// In shipment metadata:
{
  "recipient": {
    "additionalAddresses": [
      {
        "name": "Jane Smith",
        "phone": "0772345678",
        "address": "456 Park Avenue",
        "city": "Bulawayo"
      }
    ]
  }
}

// After admin edits:
{
  "deliveryNoteOverrides": {
    "deliveryAddresses": [/* edited addresses */]
  }
}
```

---

## 💰 Pricing Logic

```javascript
// Formula
const totalAddresses = 1 + additionalAddresses.length;
const doorToDoorCost = totalAddresses × £40;

// Examples
1 address (primary only) → £40
2 addresses → £80
3 addresses → £120
5 addresses → £200
```

---

## 🎨 Visual Examples

### Booking Form (Step 2)
```
┌─────────────────────────────────┐
│ Primary Receiver                │
│ Name: [John Doe]                │
│ Phone: [0771234567]             │
│ Address: [123 Main St]          │
│ City: [Harare]                  │
└─────────────────────────────────┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ Address #2              [🗑️]   │
│ Name: [Jane Smith]             │
│ Phone: [0772345678]            │
│ Address: [456 Park Ave]        │
│ City: [Bulawayo]               │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

[+ Add another delivery address]

┌─────────────────────────────────┐
│ ✓ Door-to-Door Delivery         │
│   2 addresses × £40 = £80       │
└─────────────────────────────────┘
```

### Delivery Note Template
```
RECIPIENT:
John Doe
+263 771234567
123 Main Street, Harare, Zimbabwe

ADDITIONAL DELIVERY ADDRESSES:
┌─────────────────┐  ┌─────────────────┐
│ Address #2      │  │ Address #3      │
│ Jane Smith      │  │ Bob Johnson     │
│ +263 772345678  │  │ +263 773456789  │
│ 456 Park Avenue │  │ 789 Garden Road │
│ Bulawayo        │  │ Mutare          │
└─────────────────┘  └─────────────────┘

╔═══════════════════════════════════════╗
║ Delivery Method: Door-to-Door         ║
║ Deliver to 3 addresses listed above   ║
╚═══════════════════════════════════════╝
```

---

## ✅ Quick Testing

### Test Scenario 1: Basic Flow
1. Book shipment with 2 additional addresses
2. Check price: should be `3 × £40 = £120`
3. Open delivery note → see all 3 addresses
4. ✅ Pass if all addresses visible

### Test Scenario 2: Edit Addresses
1. Open existing delivery note
2. Click "Edit"
3. Add one address, remove one address
4. Save
5. ✅ Pass if changes persist

### Test Scenario 3: PDF Export
1. Generate delivery note with 3+ addresses
2. Download PDF
3. ✅ Pass if all addresses in PDF

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Addresses not showing | Not saved in metadata | Check `metadata.recipient.additionalAddresses` |
| Wrong price | Address count incorrect | Verify formula: `(1 + extras) × £40` |
| Can't add address in edit | Draft state issue | Check console for errors |
| Phone numbers missing +263 | Not formatted | `withDialCode()` should add automatically |

---

## 📝 Quick Code Snippets

### Get Additional Addresses
```typescript
const deliveryAddresses = 
  shipment.metadata?.recipient?.additionalAddresses || [];
```

### Calculate Door-to-Door Price
```typescript
const addressCount = 1 + deliveryAddresses.length;
const doorToDoorTotal = addressCount * DOOR_TO_DOOR_PRICE;
```

### Format Phone Number
```typescript
const formattedPhone = withDialCode(phone, 'Zimbabwe');
// "0771234567" → "+263 771234567"
```

---

## 📞 Support

### If something breaks:

1. **Check browser console** for JavaScript errors
2. **Check database** for `additionalAddresses` in metadata
3. **Verify TypeScript** compilation with `npm run build`
4. **Read full docs**: `FEATURE_COMPLETE_MULTIPLE_ADDRESSES.md`
5. **Testing guide**: `TEST_MULTIPLE_ADDRESSES.md`

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `SimplifiedBookingForm.tsx` | Customer booking interface |
| `DeliveryNoteGenerator.tsx` | Admin delivery note editor |
| `FEATURE_COMPLETE_MULTIPLE_ADDRESSES.md` | Full technical docs |
| `TEST_MULTIPLE_ADDRESSES.md` | Comprehensive test guide |
| `QUICK_REFERENCE_MULTIPLE_ADDRESSES.md` | This file |

---

## 🚀 Ready to Use!

✅ **Build status**: Passing  
✅ **TypeScript**: No errors  
✅ **Feature**: Complete  
✅ **Documentation**: Complete  

Start testing and deploy when ready! 🎉
