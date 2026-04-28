# Collection Schedule Calendar Redesign

## Overview
The collection schedule management has been redesigned with a calendar-based interface that separates regions (England and Ireland) and introduces collection periods for better shipment grouping and bulk status updates.

## Key Features

### 1. **Region Separation**
- **England Tab**: Dedicated calendar view for England routes
- **Ireland Tab**: Dedicated calendar view for Ireland routes
- Easy switching between regions using tabs
- Routes are automatically filtered by selected region

### 2. **Calendar Interface**
- **Visual Calendar**: Month view showing all collection dates
- **Interactive Days**: Click on any day to:
  - View existing routes scheduled for that day
  - Add a new route if no routes exist
- **Route Cards**: Each scheduled route appears as a card on the calendar showing:
  - Route name
  - Number of shipments
- **Navigation**: Previous/Next month buttons for easy browsing

### 3. **Collection Period Management**
- **Purpose**: Group shipments by collection period (e.g., "May 2026", "June 2026")
- **Create Periods**: Manually create collection periods at the top of the page
- **Select Period**: Choose an active period to filter shipments
- **Auto-Assignment**: Shipments are automatically assigned to periods based on booking date
- **Bulk Operations**: All bulk status updates are scoped to the selected period

### 4. **Route Management**
- **Add Route Dialog**: Click on a calendar day to add a new route
  - Route Name (e.g., "LONDON ROUTE")
  - Areas (comma-separated list)
  - Automatically uses selected region (England/Ireland)
  - Pickup date is set to the selected calendar day
- **Schedule Name**: Auto-generated as "ROUTE NAME - Date"

### 5. **Shipment Management**
- **View Shipments**: Click on a route card to view all shipments
- **Filtered by Period**: If a collection period is selected, only shows shipments in that period
- **Bulk Selection**: 
  - Select individual shipments with checkboxes
  - "Select All" / "Deselect All" buttons
  - Shows count of selected shipments
- **Bulk Status Update**:
  - Select multiple shipments
  - Choose a new status from dropdown
  - Update all selected shipments at once
- **Shipment Details**: View tracking number, sender, receiver, status, and creation date

## Database Schema

### Collection Periods Table
```sql
collection_periods (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- e.g., "May 2026"
  month TEXT NOT NULL,         -- e.g., "May"
  year INTEGER NOT NULL,       -- e.g., 2026
  status TEXT DEFAULT 'active', -- active, closed
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Collection Schedules Table
```sql
collection_schedules (
  id UUID PRIMARY KEY,
  route TEXT NOT NULL,
  areas TEXT[] NOT NULL,
  pickup_date TEXT NOT NULL,
  schedule_name TEXT,
  country TEXT DEFAULT 'England', -- England, Ireland
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Shipments Table (Updated)
```sql
shipments (
  ...existing columns...
  collection_schedule_id UUID REFERENCES collection_schedules(id),
  collection_period_id UUID REFERENCES collection_periods(id)
)
```

## User Workflow

### Admin Workflow for Setting Up Collections

1. **Create Collection Period**
   - Navigate to Collection Schedule tab
   - Enter period name (e.g., "May 2026")
   - Click "Create Period"
   - Period is now active and selected

2. **Add Routes for England**
   - Select "England" tab
   - Navigate to desired month
   - Click on a date
   - Enter route name (e.g., "LONDON ROUTE")
   - Enter areas (e.g., "Central London, Heathrow, East London")
   - Click "Add Route"
   - Route appears on calendar

3. **Add Routes for Ireland**
   - Select "Ireland" tab
   - Follow same process as England
   - Routes are automatically tagged as Ireland

4. **Manage Shipments**
   - Click on a route card in the calendar
   - View all shipments for that route
   - If a period is selected, only shipments in that period are shown
   - Select shipments using checkboxes
   - Choose new status from dropdown
   - Click "Update X Shipment(s)"

### Customer Booking Flow
- When customers book, they select their location
- System automatically assigns them to the appropriate route based on area
- Shipment is linked to the route's collection schedule
- Shipment is auto-assigned to current collection period based on booking date

## Benefits

### For Admins
- **Visual Overview**: See all collection dates at a glance
- **Regional Organization**: Separate England and Ireland for clarity
- **Bulk Updates**: Update multiple shipments at once within a period
- **Easy Scheduling**: Click-to-add interface for new routes
- **Period Tracking**: Track shipments by collection period for reporting

### For Operations
- **Grouped Shipments**: All shipments for a route and period in one view
- **Status Management**: Bulk update status as collection progresses
- **Route Planning**: Visual calendar helps plan driver routes
- **Regional Focus**: Work on one region at a time

### For Customers
- **Accurate Dates**: See exact collection date for their area
- **Regional Clarity**: Know if they're on England or Ireland route
- **Transparency**: Collection schedule is clearly organized

## Technical Implementation

### Components
- **CollectionScheduleCalendarTab.tsx**: Main component with calendar view
- **AdminDashboardContent.tsx**: Updated to use new calendar component

### Key Functions
- `fetchSchedules()`: Load all collection schedules
- `fetchPeriods()`: Load all collection periods
- `fetchShipments()`: Load all shipments
- `handleCreatePeriod()`: Create new collection period
- `handleAddRoute()`: Add new route to calendar
- `handleViewScheduleShipments()`: View shipments for a route
- `handleBulkStatusUpdate()`: Update status for multiple shipments
- `getSchedulesForDate()`: Get routes scheduled for a specific date
- `getShipmentCountForSchedule()`: Count shipments for a route (filtered by period)

### State Management
- `selectedCountry`: Current region (England/Ireland)
- `currentMonth`: Calendar month being displayed
- `schedules`: All collection schedules
- `periods`: All collection periods
- `selectedPeriod`: Currently active period for filtering
- `shipments`: All shipments
- `selectedShipmentIds`: Set of selected shipment IDs for bulk operations

## Future Enhancements

### Potential Improvements
1. **Drag & Drop**: Drag routes to different dates
2. **Route Templates**: Save common routes as templates
3. **Capacity Management**: Set max shipments per route
4. **Driver Assignment**: Assign drivers to routes
5. **Route Optimization**: Suggest optimal route order based on areas
6. **Export**: Export route schedules to PDF/Excel
7. **Notifications**: Auto-notify customers when route is scheduled
8. **Period Status**: Mark periods as "closed" to prevent new bookings
9. **Multi-Select Dates**: Add same route to multiple dates at once
10. **Area Management**: Manage areas separately and assign to routes

## Migration Notes

### From Old System
- Old list-based view is preserved in `CollectionScheduleManagementEnhanced.tsx`
- New calendar view is in `CollectionScheduleCalendarTab.tsx`
- Admin dashboard now uses calendar view by default
- All existing data is compatible with new system
- Collection periods are auto-created for existing shipments

### Database Changes
- Added `collection_periods` table
- Added `collection_period_id` to shipments table
- Added `country` column to collection_schedules table
- All changes are backward compatible

## Support

### Common Issues
1. **Routes not showing**: Check that country matches selected tab
2. **Shipments not appearing**: Verify collection_schedule_id is set
3. **Period filtering not working**: Ensure collection_period_id is set on shipments
4. **Bulk update fails**: Check admin permissions in RLS policies

### Troubleshooting
- Check browser console for errors
- Verify Supabase connection
- Ensure RLS policies allow admin access
- Check that all migrations have been run

## Conclusion

The new calendar-based collection schedule system provides a more intuitive and visual way to manage collections across England and Ireland. The addition of collection periods enables better organization and bulk operations, making it easier for admins to manage large numbers of shipments efficiently.
