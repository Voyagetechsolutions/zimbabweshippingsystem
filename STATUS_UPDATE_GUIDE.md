# Quick Status Update Guide

## New Simplified Statuses

### 7-Step Journey:

1. **Pending** - Initial booking received
2. **Confirmed** - Booking confirmed, awaiting collection
3. **Collected** - Items picked up from sender
4. **In Transit** - On the way to Zimbabwe
5. **Zim Warehouse** - Arrived in Zimbabwe, being processed
6. **Out for Delivery** - On the way to final destination
7. **Delivered** - Successfully delivered to receiver

Plus: **Cancelled** - For cancelled shipments

## Old vs New Status Mapping

| Old Status | New Status |
|-----------|-----------|
| Pending | Pending |
| Booking Confirmed | **Confirmed** |
| Ready for Pickup | **Collected** |
| InTransit to Zimbabwe | **In Transit** |
| Goods Arrived in Zimbabwe | **Zim Warehouse** |
| Processing in ZW Warehouse | **Zim Warehouse** |
| (New) | **Out for Delivery** |
| Delivered | Delivered |
| Cancelled | Cancelled |

## How to Use Bulk Updates

### Method 1: Select Individual Shipments

1. Go to **Admin → Shipment Management**
2. Check the boxes next to shipments you want to update
3. Click **"Bulk Update (X)"** button at the top
4. Select the new status
5. Click **"Update All"**

### Method 2: Filter by Collection Period

1. Go to **Admin → Shipment Management**
2. Use the **"Collection Schedule"** dropdown
3. Select a month (e.g., "May Collection")
4. Check **"Select All"** checkbox
5. Click **"Bulk Update"**
6. Choose new status
7. All shipments in that period updated at once!

## Example Workflows

### Weekly Collection Update
```
Monday: All May shipments → "Confirmed"
Friday: All May shipments → "Collected"
Next Monday: All May shipments → "In Transit"
```

### Route-Based Update
```
1. Filter by "May Collection"
2. Select all London route shipments
3. Bulk update to "Collected"
4. Repeat for other routes
```

### End-to-End Update
```
Week 1: Pending → Confirmed
Week 2: Confirmed → Collected
Week 3: Collected → In Transit
Week 4: In Transit → Zim Warehouse
Week 5: Zim Warehouse → Out for Delivery
Week 6: Out for Delivery → Delivered
```

## Status Colors

- **Pending**: Gray
- **Confirmed**: Emerald Green
- **Collected**: Amber
- **In Transit**: Blue (animated spinner)
- **Zim Warehouse**: Purple (animated spinner)
- **Out for Delivery**: Indigo (animated spinner)
- **Delivered**: Green (checkmark)
- **Cancelled**: Red (alert icon)

## Tips

✅ **Use bulk updates** for efficiency - update 50+ shipments in seconds
✅ **Filter by period** to update all shipments from the same month
✅ **Check progress** in the shipment details dialog
✅ **Status badges** show at a glance what stage each shipment is at
✅ **Customers see** the same status on their tracking page

## Customer View

When customers track their shipment, they see:
- Large progress bar showing completion percentage
- 7 numbered steps with checkmarks for completed stages
- Current step highlighted with a ring
- Color-coded status badge
- Estimated delivery date

## Admin View

In the admin panel, you see:
- Checkbox for each shipment
- Status badge with icon
- Quick "View" button for details
- Bulk update controls
- Stats cards showing counts by status

## Need Help?

- All existing shipments automatically migrated to new statuses
- Progress timeline works with both old and new status names
- Bulk updates save massive time vs one-by-one updates
- Collection periods group shipments by booking month automatically
