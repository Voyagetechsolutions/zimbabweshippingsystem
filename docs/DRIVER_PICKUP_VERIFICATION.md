# Driver pickup verification — 12 September 2026

## Verified

- Staff and customer app TypeScript checks pass.
- `npm run build:web --prefix staff-app` succeeds; output is `staff-app/dist`.
- `supabase/tests/verify-driver-pickups.mjs` passes 16 isolated PostgreSQL checks, including driver RLS versus admin preview, clock-in, date precedence, in-person confirmation, optional QR/code/invoice, ownership, atomic status updates and retry idempotency.
- The local preview at port 8083 displayed nine UK collections in the next seven days at a 390 × 844 viewport. This was an admin session viewing the driver dashboard, not a physical-phone driver login.
- No real customer shipment was marked collected during testing. No attendance clock-in was confirmed.

## Supabase deployment

Applied **only** `supabase/migrations/20260912180000_start_planned_driver_pickups.sql` to linked Supabase project `oncsaunsqtekwwbzvvyh` on 12 September 2026, following the user's deployment request. This migration starts the driver's own planned run when they tap the at-location pickup action, and rechecks shipment ownership and eligibility before changing it.

Post-deployment database inspection confirmed the planned-run fix and ownership check are present in `public.begin_driver_pickup(uuid)`. Authenticated execution is enabled; anonymous execution is disabled. No real pickup or attendance record was changed to test the deployment.

Do not use a broad database reset or replay historical migrations to apply this single function change. The main driver feed already returned live data in the preview.

After release, verify on the driver's actual installed build: clock in → today/this week → open a real due collection → arrive → verify details → mark collected. Only perform the final action when goods have actually been received. Confirm the customer, admin and finance views show Collected while the payment balance stays unchanged unless a payment was separately recorded.

The map is a route overview with external maps navigation, not an embedded Uber-style turn-by-turn navigation engine.
