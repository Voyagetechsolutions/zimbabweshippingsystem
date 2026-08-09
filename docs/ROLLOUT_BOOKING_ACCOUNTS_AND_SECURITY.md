# Rollout: booking→account linking, self-collection, driver map, RLS lockdown

Nothing in this change set has been deployed. The steps below are in the order
they must happen — step 4 in particular will break the live booking form if it
runs before step 2.

## What was wrong

1. **Website bookings were never attached to accounts.** `SimplifiedBookingForm`
   inserted every shipment with a hardcoded `user_id: null`. Verified against the
   live database on 2026-08-08: **all 190 shipments had `user_id = null`**, so
   `CustomerDashboard`'s `.eq('user_id', user.id)` query always returned nothing.
   Customers were right that signing in did not save their bookings.

2. **Public read access to all customer data.** The anon (publishable) key — which
   ships in the browser bundle — could `select` every row of `shipments`,
   `payments` and `receipts`, including sender/recipient names, emails, phone
   numbers and street addresses held in `metadata` and `sender_details`.

3. **`getRouteForPostalCode` rejected two live postcode areas.** It tested the
   restricted list with `startsWith`, so the single-letter restricted area `G`
   (Glasgow) also matched `GL` (Gloucester → Cardiff route) and `GU` (Guildford →
   Bournemouth route). Customers in Gloucester and Guildford were told the company
   does not collect from them. Covered by `src/utils/addressLookup.test.ts`.

4. **`admin_update_staff` never synced `is_admin` with `role`.** Promoting somebody
   to admin set `role = 'admin'` but left `is_admin = false`; demoting left
   `is_admin = true`. Policies test both, so promotions granted nothing and
   demotions removed nothing.

5. **The driver map had no data.** `driver_run_stops.latitude/longitude` existed
   since the phase-one migration but nothing ever wrote to them, so `RunMap`
   rendered its fallback card instead of a route.

6. **Unauthenticated DDL endpoints.** `staff-ops` validated the action name and
   then ran the whole schema script, checking the caller only for `invite_staff`.
   Anyone with the publishable key — which ships in the browser bundle — could
   `POST {"action":"setup"}` and re-run all that DDL, or `{"action":"verify"}` and
   read revenue and shipment aggregates. `moderate-review` had the same hole: it
   already contained a `requireAdmin` helper, but its `setup` branch returned
   before that helper was ever consulted. Both now require an admin, and
   `staff-ops`'s duplicated inline check was folded into one `requireAdmin` gate
   covering every action.

## Step 1 — deploy the edge functions

```bash
npx supabase functions deploy staff-ops --project-ref oncsaunsqtekwwbzvvyh
```

```bash
npx supabase functions deploy geocode-stops --project-ref oncsaunsqtekwwbzvvyh
```

## Step 2 — apply the safe schema changes

`staff-ops`'s `SETUP_SQL_V2` now carries
`supabase/migrations/20260808_booking_accounts_self_collection.sql`
(regenerate with `node tools/embed-staff-ops-sql.cjs` after editing it — never
hand-paste, `$$` gets corrupted). All of it is idempotent and safe to apply
before or after the frontend deploy. It adds:

- `claim_guest_bookings()` — attaches historical and future guest bookings to an
  account by **confirmed** sender email. The email is read from `auth.users`, never
  accepted as an argument, and must be confirmed, so registering with somebody
  else's address cannot harvest their shipments.
- `delivery_depots` + the Bulawayo row — **the seeded address is a placeholder**
  (`Address to be confirmed`). Edit it before telling customers to collect.
- `geocode_cache` — free geocoders are rate limited and expect reuse.
- `set_booking_delivery_method()` — records door vs self-collection (and which
  depot) on a booking the customer app just made. `create_customer_booking` is
  long and load-bearing and already prices self-collection correctly (no selected
  delivery addresses means no fee), so it is annotated afterwards rather than
  edited.
- the `admin_update_staff` `is_admin` fix.

**The setup action now requires an admin.** It used to run for anyone holding the
publishable key — see "Unauthenticated DDL endpoints" below. So first exchange an
admin login for a token:

```bash
curl -s -X POST "$VITE_SUPABASE_URL/auth/v1/token?grant_type=password" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "content-type: application/json" -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}'
```

Copy `access_token` out of the response, then:

```bash
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/staff-ops" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer PASTE_ACCESS_TOKEN" -H "content-type: application/json" -d '{"action":"setup"}'
```

Expect `{"ok":true,"message":"Staff ops schema is ready."}`. A `401` or `403`
means the token is missing, expired, or the account is not an admin.

## Step 3 — deploy the website

This must be live **before** step 4. The new booking form calls
`create_public_booking`; if that function does not exist yet it falls back to the
original direct inserts, so this deploy is safe on its own.

## Step 4 — close public read access (do this last)

`supabase/migrations/20260808_restrict_public_shipment_reads.sql` is deliberately
**not** in `SETUP_SQL_V2`, because the currently-deployed booking form reads
these tables straight back after inserting. Applying it before step 3 breaks
booking for everyone.

Run it once, on its own, via the Supabase SQL editor. It:

- drops only those SELECT policies on the three tables whose `USING` clause is a
  bare `true` (found dynamically — the live policy names are not knowable from
  this repo), leaving genuine owner/admin policies alone;
- adds owner + `is_staff_member()` read policies;
- keeps anonymous tracking working through `get_shipment_tracking_info()`, which
  returns no personal data;
- adds `create_public_booking()` so guest booking still works without the browser
  needing read access.

Verify afterwards — both should return `[]` rather than rows:

```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/shipments?select=id&limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```

Then confirm booking and tracking still work from the live site, and that a
signed-in customer sees their shipments.

## Step 5 — housekeeping

- **Delete the verification booking** created while testing: tracking
  `ZSN87924741`, sender `verify.selfcollect@example.com`. It is a real row in the
  production database.
- **Set the real Bulawayo depot address**, phone and opening hours in
  admin → Operations → **Collection Points**. The seeded row says
  `Address to be confirmed`, and that screen shows a standing warning while any
  active collection point still has the placeholder — customers are being offered
  it at booking in the meantime.

## Known-good after this change

- `npx vitest run src/utils/addressLookup.test.ts` — 10 passing, including the
  `GL`/`GU` regression.
- `npx tsc -p tsconfig.app.json --noEmit` — 36 errors, all pre-existing and all
  caused by the stale generated `src/integrations/supabase/types.ts`; the baseline
  before this change was 37.
- `staff-app` and `customer-app` both typecheck clean.

## Step 6 — publish the customer app

Address search, postcode coverage gating and self-collection are now in
`customer-app` too, so a new build is needed for customers to see them. The app
degrades gracefully before step 2: with no `delivery_depots` table it shows
"We'll confirm your nearest collection point after booking", and
`set_booking_delivery_method` failing is caught and ignored.

## Not done

- The **customer app booking screen was not exercised end to end** — it needs a
  signed-in customer account, which this session did not have. The screen
  typechecks, the app bundles and boots with no console or bundler errors, and the
  new lookup and coverage functions were tested directly against the live
  postcodes.io and Photon APIs (`coverageForUkPostcode` agrees with the website on
  all nine cases including `GL`/`GU`). The UI itself still needs a human pass.
- `expo-location` is not installed in `staff-app`, so the driver map shows the
  stops but not a live "you are here" marker. Adding it needs a new native build.
- `staff-app/AGENTS.md` points at Expo **v57** docs but the app is pinned to Expo
  **~54.0.36**. Nothing here relies on v57 APIs, but that discrepancy should be
  resolved.
- The site CSP blocks Google Fonts (`font-src 'self'`) and the Vercel
  Speed Insights script — pre-existing, unrelated, left alone.
