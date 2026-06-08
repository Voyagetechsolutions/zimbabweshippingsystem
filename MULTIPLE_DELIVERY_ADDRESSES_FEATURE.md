# Multiple Delivery Addresses Feature

## Overview
Implemented support for multiple delivery addresses with per-address door-to-door pricing, flowing from the booking form through to editable delivery notes.

## Changes Made

### 1. Booking Form (SimplifiedBookingForm.tsx) - Already Implemented
- **Data Model**: Added `deliveryAddresses` array to track additional drop-off locations
- **Per-Address Pricing**: Door-to-door service charges per address (primary + additional)
- **UI**: "Add another delivery address" button in Step 2 (Receiver Details)
- **Calculation**: `addressCount = 1 + deliveryAddresses.length` × `DOOR_TO_DOOR_PRICE`
- **Summary Display**: Step 4 shows all addresses with per-address pricing breakdown

### 2. Delivery Note Generator (DeliveryNoteGenerator.tsx) - ✅ Completed

#### Data Model Updates
- **Interface**: Added `deliveryAddresses` to `DeliveryNoteOverrides` interface
- **Helper Function**: New `getDeliveryAddresses()` extracts addresses from shipment metadata
- **Edit Draft**: Added `deliveryAddresses` field to `EditDraft` interface

#### Template Display
- **Additional Addresses Section**: New visual section after main recipient showing all extra addresses
- **Styling**: Blue-themed cards in responsive grid layout
- **Contact Info**: Each address shows name, phone (with +263 prefix), street address, and city
- **Numbering**: Labeled as "Address #2", "Address #3", etc.

#### Delivery Method Message
- **Dynamic Text**: Updates to show total address count
- **Example**: "Deliver to 3 addresses listed above. Contact recipient(s) to arrange delivery."

#### Edit Form
- **Editable Cards**: Each additional address can be edited independently
- **Fields**: Name, Phone, Street Address, City
- **Add/Remove**: "Add another delivery address" button with trash icon for removal
- **Visual Design**: Dashed border cards matching the booking form style

#### Data Flow
1. Booking form saves `additionalAddresses` in `metadata.recipient.additionalAddresses`
2. Delivery note reads from `getDeliveryAddresses(shipment)`
3. Admin can edit addresses in the delivery note editor
4. Changes save to `metadata.deliveryNoteOverrides.deliveryAddresses`
5. Template displays override addresses or falls back to original booking data

## User Flow

### Sender Side (Booking)
1. Sender fills in primary receiver details (Step 2)
2. Clicks "Add another delivery address" for each additional location
3. Fills in name, phone, address, city for each extra address
4. Door-to-door price updates automatically per address
5. Step 4 summary shows all addresses with per-address breakdown

### Admin Side (Delivery Note)
1. Admin opens delivery note for a shipment
2. Additional addresses display in dedicated section after main recipient
3. Clicks "Edit" to modify delivery note
4. Can add/remove/edit additional addresses in the form
5. Each address shows in a separate editable card
6. Clicks "Save" to persist changes
7. PDF/print includes all addresses with proper formatting

## Technical Details

### Data Structure
```typescript
deliveryAddresses: Array<{
  name: string;      // Recipient name for this address
  phone: string;     // Contact phone (auto-prefixed with +263)
  address: string;   // Street address
  city: string;      // City in Zimbabwe
}>
```

### Pricing Calculation
```typescript
const addressCount = 1 + deliveryAddresses.length;
const doorToDoorTotal = addressCount × DOOR_TO_DOOR_PRICE;
```

### Metadata Storage
```json
{
  "recipient": {
    "additionalAddresses": [
      { "name": "...", "phone": "...", "address": "...", "city": "..." }
    ]
  },
  "deliveryNoteOverrides": {
    "deliveryAddresses": [/* edits from admin */]
  }
}
```

## Benefits

1. **Flexible Delivery**: Senders can ship to multiple locations in one booking
2. **Transparent Pricing**: Per-address pricing is clear at booking time
3. **Admin Control**: Full ability to correct or add addresses on delivery note
4. **Courier Clarity**: All delivery locations visible on one document
5. **Accurate Billing**: Price reflects actual delivery complexity

## Testing Checklist

- [ ] Create booking with 0 additional addresses → standard flow
- [ ] Create booking with 2 additional addresses → verify price calculation
- [ ] Check Step 4 summary shows all addresses
- [ ] Open delivery note → verify additional addresses section appears
- [ ] Edit delivery note → add new address → save → verify persistence
- [ ] Edit delivery note → remove address → save → verify update
- [ ] Edit delivery note → modify existing address → save → verify changes
- [ ] Download PDF → verify all addresses print correctly
- [ ] Print delivery note → verify layout with multiple addresses
- [ ] Check delivery method text updates with address count

## Future Enhancements

1. **Address Validation**: Integrate Zimbabwe postal/city database
2. **Map View**: Display all delivery addresses on a map
3. **Route Optimization**: Suggest optimal delivery order
4. **Per-Address Notes**: Allow specific instructions per location
5. **Delivery Status**: Track completion status per address
