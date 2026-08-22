# Driver, Admin and Finance implementation log

Updated: 10 August 2026

## Shared collection operations

- Added `route_collection_claims` as the authoritative owner/state record for a shared-route collection.
- Added atomic `claim_route_collection` and `release_route_collection` RPCs.
- Claims are restricted to clocked-in drivers and shipments on today's published route.
- Claiming creates/reuses the driver's active run and a real `driver_run_stop`, preserving the existing QR, invoice, proof-photo, seal and handover controls.
- Stop transitions and completion automatically update the shared claim.
- Route responses now include claim owner, state and stop ID and retain completed route bookings for accurate progress.
- Added realtime publication for claims and messages.

## Driver app

- Collection rows now show Available, Your collection, or the colleague currently handling it.
- Added Claim/Continue actions and duplicate-driver protection.
- Added Start journey, Mark arrived, Complete, Release and Report issue flow.
- Added clock-out protection for active claims and unsynced offline actions.
- Shift duration updates while the screen remains open.
- Completion-form drafts autosave locally and resume after navigation/app interruption.
- Replaced the old shipment-event-only Messages screen with dispatch messaging, realtime updates and an outbound composer.
- Performance now uses the same server-side claim records as Admin.
- Replaced legacy VoyageTech/South African support links with Zimbabwe Shipping company configuration.
- Account status now reflects active/on-leave/inactive profile state.

## Admin

- Mobile Driver Runs listens to shared claims and shows active collections and collection issues.
- Mobile dispatch can broadcast an announcement to all drivers.
- Website Delivery Management now includes Live Collections backed by the same claim records.
- Website driver performance includes completed collections and collection success rate.
- Website Issues displays real failed collection claims instead of a hardcoded empty state.

## Finance

- Finance Overview now shows driver-confirmed collection invoices separately from collected cash.
- Driver invoices remain linked to shipment, driver and stop; completion does not mark an invoice paid unless a payment is actually recorded.
- Pricing from customer bookings remains locked in the driver workflow.

## Database delivery

- Migration: `supabase/migrations/20260810190000_driver_collection_operations.sql`.
- The remote migration ledger is out of sync, so the migration was also embedded in the authenticated, admin-only `staff-ops` schema installer.
- The updated edge function was deployed and the idempotent schema setup completed successfully against the connected project.

## Verification

- Staff TypeScript: passed.
- Website production build: passed.
- Staff web export: passed.
- Vitest: 43 tests passed.
- Live preview: shared-route states, driver messaging, performance report, and website Live Collections verified.

## Final issue fixes

- Fixed the staff app startup spinner by moving profile queries outside Supabase's auth-state callback and guaranteeing that session loading completes.
- Added accessible titles and descriptions to mobile admin/sidebar sheets; the website preview no longer reports the Radix dialog-title error.
- Replaced Delivery Management placeholder actions with working expandable shipment details and driver-activity filtering.
- Removed inactive assignment/resolved-issue buttons that implied unsupported actions.
- Removed the legacy login email from staff and driver profile headers; both now identify the account as Zimbabwe Shipping.
- Centralized bundled driver images so the touched driver screens have no lint errors.
- Rechecked the live driver, finance and website-admin previews after the fixes.

## Pilot security and finance controls

- Added `20260810210000_pilot_security_hardening.sql` and applied it to the connected Supabase project through the authenticated admin installer.
- Removed legacy anonymous whole-table shipment, payment and receipt reads; public tracking remains available only through the limited tracking RPC.
- Restricted drivers to assigned shipments and removed driver access to finance records and route-claim finance data.
- Prevented self-service profile updates from changing roles, admin access, staff status, leave status or driver type.
- Separated payment receipt from reconciliation. Finance records receipt first, then reconciles only after independently matching a paid transaction.
- Required payment-proof decisions to use the atomic review RPC and limited expense approval to full administrators.
- Added database audit triggers for payment, proof, expense and privilege changes, including changes made outside the app UI.
- Added `npm run check:pilot` and `docs/PILOT_RELEASE_CHECKLIST.md` as the repeatable code and operational release gate.

## Staff branding and collections map

- Added a simplified Zimbabwe Shipping staff-app icon and matching branded splash artwork under `staff-app/assets/` and wired both into Expo/iOS/Android/web configuration.
- Replaced the web map placeholder with an interactive Leaflet/OpenStreetMap map using the same collection pins as the native app. Pins remain anchored to their coordinates while zooming and panning; selecting a pin shows the real collection address and an explicit **Open navigation** action.
- Added the driver’s current-position pin to the collections map and a privacy-limited live-location update.
- Added recent driver-position pins to the admin Driver Runs map, alongside collection/delivery stops and route lines.
- Added `driver_live_locations` as a one-row-per-driver table: updates replace the previous point, drivers can read only their own point, and operations admins can view current positions.
- Added Android standalone map-key support through the uncommitted `GOOGLE_MAPS_API_KEY` EAS environment variable.
- Added the same live collections map to the website admin dashboard, including real stop addresses, recent driver positions and Google Maps navigation from each pin.
- Added a website Staff Messages console backed by `staff_messages`, so dispatch announcements and driver replies use the same inbox as the staff app.
- Replaced the disconnected website driver-performance placeholder with `driver_performance_summary`, the same 30-day collection metrics shown in the driver app and Delivery Management.
- Added a website-wide temporary-password gate. Staff cannot reach any route until they replace the one-time password, matching the native app.
- Upgraded the staff app to Expo SDK 57 / React Native 0.86 for Apple’s Xcode 26 upload requirement and added an exact 1024×1024 opaque iOS icon export.

## Device-only verification still required

- Camera QR scan and proof-photo capture on a physical device.
- Native Maps/GPS permissions and turn-by-turn handoff.
- Loss-of-signal recovery during image upload.
- Push-notification registration (the in-app realtime messaging path is complete; OS push registration remains a release task).
