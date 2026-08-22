# Zimbabwe Shipping controlled pilot checklist

This checklist is the release gate for the staff app and connected website dashboard. A code build passing is necessary, but it is not permission to skip the device, finance or operational checks below.

## Code and database gate

- [ ] Apply every Supabase migration through `20260810210000_pilot_security_hardening.sql` and confirm the remote migration ledger matches the repository.
- [ ] Run `npm run check:pilot`, `npm run build`, and `npm run test -- --run` from the repository root.
- [x] Run `npx tsc --noEmit`, `npx expo-doctor`, and `npm run build:web` from `staff-app` (passed 2026-08-11 on Expo SDK 57).
- [ ] Create the App Store Connect record and replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` in `staff-app/eas.json`.
- [ ] Run `npx eas-cli build --platform ios --profile production`, install the TestFlight build on a physical iPhone, then complete every physical-device check below.
- [ ] Confirm one customer, driver, finance user, logistics user and admin account each receive only their intended screens and database records.
- [ ] Confirm audit records are written for payment receipt, reconciliation, proof review, expense changes and staff-role changes.
- [ ] Export a database backup and record its restore location before enabling the pilot.

## Physical-device gate

- [ ] Set `GOOGLE_MAPS_API_KEY` as an EAS environment secret for Android standalone builds; restrict it to the Android Maps SDK and `com.zimbabweshipping.staff`.
- [ ] Confirm the new staff icon and branded splash display correctly on both iOS and Android release builds.
- [ ] Open the collections map as a driver and confirm the current-position pin and collection pins render.
- [ ] Open Driver Runs as an admin and confirm recent driver positions are visible without exposing location to finance/customer accounts.

Test on at least one current Android phone and one current iPhone:

- [ ] Fresh installation, login, logout and session restoration.
- [ ] Camera permission, QR scan, proof photos and seal photos.
- [ ] GPS permission, route map and navigation handoff.
- [ ] Temporary-password login is forced directly into password replacement in both the staff app and the website, with no dashboard route accessible first.
- [ ] Phone call, WhatsApp and email links.
- [ ] Airplane-mode interruption during a stop, followed by reconnection and successful retry.
- [ ] App termination during a handover form, followed by draft restoration.
- [ ] Small screen, large accessibility text and dark-mode readability.

## End-to-end operational scenario

- [ ] Customer creates one clearly labelled test booking.
- [ ] Admin publishes the route without manually assigning a shared-route stop.
- [ ] Driver clocks in, claims the collection, records proof, verifies the customer code and completes the stop.
- [ ] Admin sees every status change and any reported issue.
- [ ] Finance sees the driver invoice but no cash until payment is recorded.
- [ ] Finance records receipt, then separately reconciles it against the matching reference.
- [ ] Customer tracking and notifications show the expected status without exposing private staff data.

## Finance sign-off

- [ ] A company finance owner confirms opening balances and supported currencies.
- [ ] Pending payments are not included in collected cash.
- [ ] Received payments remain unreconciled until independently matched.
- [ ] Large expenses require admin approval and finance users cannot self-approve them.
- [ ] A daily export is compared with the existing accounting process throughout the pilot.

## Pilot operation

- Limit access to 3–5 named staff and non-critical shipments for the first five working days.
- Keep the existing booking, collection and accounting process in parallel.
- Review failed stops, unreconciled payments, pending proofs and audit logs every day.
- Record the app version, device, account role, time and tracking number for every defect.
- Assign one admin as incident owner and one finance owner as payment approver.

## Rollback

Stop the pilot immediately if staff see another role's private data, cash totals differ from the accounting record, proof uploads are lost, or a completed stop cannot be reconstructed from its audit trail.

1. Disable affected staff accounts using `staff_active = false` or remove the role assignment.
2. Return operations to the existing parallel process; do not delete pilot records.
3. Export affected shipments, payments, proofs and audit rows with timestamps.
4. Restore from the pre-pilot backup only after preserving incident evidence and confirming the recovery point.
5. Fix and repeat the complete end-to-end scenario before restarting the pilot.
