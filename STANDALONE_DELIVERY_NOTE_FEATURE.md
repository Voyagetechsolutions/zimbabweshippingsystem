# Standalone Delivery Note Creator

## Overview
Added ability to create delivery notes for external/manual deliveries that aren't tied to any shipment booking in the system.

## What Was Added

### 1. New Component: StandaloneDeliveryNoteCreator
**File**: `src/components/admin/StandaloneDeliveryNoteCreator.tsx`

A full-featured delivery note creation form with the same format as shipment-based notes but for external use.

#### Features:
- ✅ **Complete Form**: All fields from regular delivery notes
  - Reference number (auto-generated with "EXT-" prefix)
  - Date and optional delivery date
  - Shipper details (name, phones, address)
  - Recipient details (name, phones, address)
  - Multiple additional delivery addresses
  - Tracking number
  - Door-to-door delivery option
  - Metal seal option with codes
  - Items summary
  - Multiple items with descriptions

- ✅ **Add/Remove Items**: Dynamic item list with add/remove buttons
- ✅ **Multiple Delivery Addresses**: Same functionality as booking form
- ✅ **Live Preview**: Real-time preview of the delivery note as you type
- ✅ **Zimbabwe Phone Formatting**: Auto-adds +263 prefix
- ✅ **PDF Export**: Download as PDF with same professional format
- ✅ **Print**: Direct print functionality
- ✅ **Clear Form**: Reset button to start over

### 2. Updated: DeliveryNotesTab
**File**: `src/components/admin/tabs/DeliveryNotesTab.tsx`

#### Changes:
- Added **"Create New"** button in the header (blue button, left side)
- Opens the standalone delivery note creator modal
- Button uses `Plus` icon

## User Flow

### Creating a Standalone Delivery Note

1. **Navigate**: Admin Dashboard → Delivery Notes tab
2. **Click**: "Create New" button (blue button in header)
3. **Fill Form**:
   - Ref # is auto-generated (e.g., "EXT-A3F7K2")
   - Fill in shipper and recipient details
   - Add items with descriptions
   - Optionally add multiple delivery addresses
   - Toggle door-to-door and/or metal seal options
4. **Preview**: See live preview below the form
5. **Actions**:
   - **Download PDF**: Save as PDF for distribution
   - **Print**: Direct print to printer
   - **Clear Form**: Reset all fields
   - **Close**: Exit without saving

## Use Cases

### When to Use Standalone Delivery Notes

1. **External Deliveries**: Items received from other sources (not booked through system)
2. **Manual Arrangements**: Walk-in customers or phone bookings
3. **Third-Party Shipments**: Items sent via other shipping companies
4. **Internal Transfers**: Moving goods between depots/warehouses
5. **Special Cases**: VIP deliveries, emergency shipments, etc.

## Key Differences from Regular Delivery Notes

| Feature | Regular (Shipment-Based) | Standalone (External) |
|---------|-------------------------|----------------------|
| Data Source | From shipment booking | Manually entered |
| Ref # Format | `ABC-1234` (sender initials + phone digits) | `EXT-XXXXXX` (random) |
| Tracking # | From shipment system | User-defined or auto-generated |
| Persistence | Saved to shipment metadata | Not saved (PDF only) |
| Edit Later | Yes (via shipment) | No (create new) |
| Linked to Booking | Yes | No |

## Data Structure

### Form Data Interface
```typescript
interface FormData {
  refNumber: string;              // EXT-XXXXXX
  date: string;                   // yyyy-MM-dd
  deliveryDate: string;           // optional yyyy-MM-dd
  senderName: string;
  senderPhone: string;
  senderPhone2: string;
  senderAddress: string;          // multi-line
  recipientName: string;
  recipientPhone: string;
  recipientPhone2: string;
  recipientAddress: string;       // multi-line
  deliveryAddresses: Array<{      // additional addresses
    name: string;
    phone: string;
    address: string;
    city: string;
  }>;
  doorToDoor: boolean;
  sealed: boolean;
  sealCodes: string;
  itemsSummary: string;
  items: Array<{
    name: string;
    description: string;
  }>;
  tracking: string;
}
```

## Visual Layout

### Delivery Notes Tab Header
```
┌────────────────────────────────────────────────────────┐
│ Delivery Notes                                         │
│ Auto-generated office copies for every booking         │
│                                                         │
│ [+ Create New] [🔄 Refresh] [⬇ Download (2)]          │
└────────────────────────────────────────────────────────┘
```

### Standalone Creator Modal
```
┌──────────────────────────────────────────────────────┐
│ Create Standalone Delivery Note                      │
│ For external deliveries not tied to a shipment       │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ┌── Form Section ──────────────────────────────────┐ │
│ │ Ref #: [EXT-A3F7K2]  Date: [2026-06-08]         │ │
│ │                                                   │ │
│ │ Shipper:              Recipient:                 │ │
│ │ Name: [________]      Name: [________]           │ │
│ │ Phone: [________]     Phone: [________]          │ │
│ │ Address: [_______]    Address: [_______]         │ │
│ │                                                   │ │
│ │ Additional Delivery Addresses:                   │ │
│ │ [+ Add another delivery address]                 │ │
│ │                                                   │ │
│ │ ☐ Door-to-Door Delivery                          │ │
│ │ ☐ Metal Coded Seal                               │ │
│ │                                                   │ │
│ │ Items:                                            │ │
│ │ Item #1: [Name] [Description]                    │ │
│ │ [+ Add another item]                             │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌── Live Preview ──────────────────────────────────┐ │
│ │    DELIVERY NOTE                                 │ │
│ │    Ref #: EXT-A3F7K2  Date: 2026-06-08          │ │
│ │    [formatted delivery note preview]             │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ [Close] [Clear Form] [Print] [Download PDF]          │
└──────────────────────────────────────────────────────┘
```

## Technical Details

### Component Props
```typescript
interface StandaloneDeliveryNoteCreatorProps {
  isOpen: boolean;      // Dialog open state
  onClose: () => void;  // Close handler
}
```

### Key Functions

#### withDialCode(phone: string)
Formats phone numbers with Zimbabwe country code:
```typescript
// Input: "0771234567"
// Output: "+263 771234567"
```

#### Auto-generated Reference Number
```typescript
`EXT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
// Examples: EXT-A3F7K2, EXT-B9K2L5, EXT-C4M8N1
```

#### Auto-generated Tracking Number
```typescript
`EXT-${Date.now()}`
// Examples: EXT-1717850000000
```

## Testing Checklist

- [ ] Click "Create New" button opens modal
- [ ] Form auto-generates ref number and tracking
- [ ] Can fill in all shipper/recipient fields
- [ ] Can add multiple items
- [ ] Can remove items (keeping at least 1)
- [ ] Can add multiple delivery addresses
- [ ] Can remove delivery addresses
- [ ] Door-to-door checkbox toggles correctly
- [ ] Metal seal checkbox shows/hides code input
- [ ] Phone numbers auto-format with +263
- [ ] Preview updates in real-time as you type
- [ ] "Clear Form" resets all fields
- [ ] "Download PDF" exports correctly
- [ ] "Print" opens print dialog
- [ ] PDF format matches regular delivery notes
- [ ] All addresses appear in PDF
- [ ] Close button exits modal

## Benefits

### For Admins
1. **Flexibility**: Handle external deliveries without creating dummy shipments
2. **Professional Format**: Same quality as booking-based notes
3. **Quick Creation**: Fast workflow for walk-ins and phone orders
4. **No Database Clutter**: Doesn't create orphan shipment records

### For Operations
1. **Standardized Documentation**: All delivery notes look the same
2. **Complete Information**: Same level of detail as regular shipments
3. **Courier Ready**: Formatted for immediate use by drivers
4. **Audit Trail**: PDF can be saved to external filing system

## Future Enhancements

### Possible Improvements:
1. **Save as Draft**: Store standalone notes in database
2. **Templates**: Pre-fill common sender/recipient combos
3. **Import from CSV**: Bulk create delivery notes
4. **Custom Ref Format**: Let admins choose ref number pattern
5. **Auto-email**: Send PDF to recipient automatically
6. **Convert to Shipment**: Create booking from standalone note
7. **History**: View previously created standalone notes
8. **Barcode**: Add QR code for tracking

## Files Modified/Created

### Created:
1. **StandaloneDeliveryNoteCreator.tsx** (~650 lines)
   - Complete form component
   - Live preview
   - PDF/print functionality

### Modified:
1. **DeliveryNotesTab.tsx** (+5 lines)
   - Added "Create New" button
   - Import statement
   - State for modal visibility
   - Render modal component

## Summary

✅ **Feature Status**: **COMPLETE**

Added a "Create New" button on the Delivery Notes tab that opens a comprehensive form for creating standalone delivery notes. These notes are perfect for external deliveries, walk-in customers, and manual arrangements. The form includes all the same fields as regular delivery notes, supports multiple delivery addresses, and exports professional PDFs.

**Development Time**: ~1 hour  
**Lines of Code**: ~650  
**Files Created**: 1  
**Files Modified**: 1  

Ready to use! 🎉
