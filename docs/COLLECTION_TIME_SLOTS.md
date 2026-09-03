# Collection time slots

Customers pick a two-hour window between 07:00 and 23:00 for the day their goods
are collected. Dispatch sequences the route around those answers, and when it
has to move somebody it owes them a WhatsApp or a call — tracked, not assumed.

## The flow

1. **Two days out**, a daily job finds every uncollected booking whose collection
   date is `current_date + 2` and sends the customer "Confirm your collection
   time". Once per booking, ever — `collection_slots.reminder_sent_at` guards it.
2. **The customer picks** one of eight windows (07:00–09:00 … 21:00–23:00) or
   "any time — I'm flexible", from the home card, the shipment, or the
   notification. They can change it right up to collection day.
3. **Dispatch builds the route** in the staff app. Every open collection shows
   what the customer asked for, and selecting one pre-fills that window, so
   planning around the customer is the default rather than an extra step.
4. **If dispatch overrides a window**, the row says so while they are still
   editing it, a reason box appears, the customer is notified in the app, and the
   run picks up an obligation.
5. **The run screen** shows "N customers still to be told" and gives each moved
   stop WhatsApp and Call buttons. The link opens, and only an explicit "yes,
   they know" records the contact — a dialled number that rang out must not look
   like a conversation.

## Where the pieces live

| Piece | File |
| --- | --- |
| Schema, RPCs, reminder job, cron | `supabase/migrations/20260903120000_collection_time_slots.sql` |
| DDL delivery + verification | `supabase/functions/app-schema-setup/index.ts` |
| Keeps the function's SQL in sync | `tools/embed-schema-setup-sql.cjs` |
| Customer slot logic | `customer-app/src/lib/collectionSlots.ts` |
| Customer picker | `customer-app/src/screens/ConfirmCollectionScreen.tsx` |
| "YOUR COLLECTION" card | `customer-app/src/screens/HomeScreen.tsx` |
| Dispatch slot logic | `staff-app/src/lib/collectionSlots.ts` |
| Route planning | `staff-app/src/screens/admin/DispatchRouteBuilderScreen.tsx` |
| Contact obligation | `staff-app/src/screens/admin/RunDetailScreen.tsx` |

## Parsing the collection date

None of this could be timed before, because `collection_schedules.pickup_date`
is free text and holds `September 14th, 2026`, `2026-08-04` and `04/08/2026`
side by side. The migration adds `pickup_on date` next to it, filled through a
trigger and backfilled on install — all 17 published routes parsed.

It **reuses the existing `public.parse_schedule_date(p_text)`** from
`20260810_driver_route_collections.sql`, which the driver collection-matching
functions already depend on. This migration first defined its own copy under a
different parameter name and Postgres rightly refused with *"cannot change name
of input parameter"*; one parser is the right answer anyway.

**Known divergence, currently unexercised.** That function resolves `04/08/2026`
through `::date` and so reads it as **8 April**, where the apps'
`parseCollectionDate` reads day/month and gets **4 August**. No published
schedule uses that format, and changing the shared function would move the
driver matching with it, so this is documented rather than silently altered. If
a `dd/mm/yyyy` schedule is ever entered, fix it at the source or address both
parsers together.

The `verify` action reports `unparsed_pickup_dates` — any published date the
parser could not read. That list should be empty; if it is not, either fix the
schedule text in the admin dashboard or add the format to the parser, because
those routes will never send a reminder.

## Applying it

`supabase db push` must never be run on this project — the remote migration
history does not match `supabase/migrations/` and a push would replay
early migrations containing `drop table ... cascade`.

Deploy the function (the CLI is logged in; `supabase` is not on PATH):

```bash
npx supabase functions deploy app-schema-setup --project-ref oncsaunsqtekwwbzvvyh
```

Then, signed in to the admin dashboard as an admin, run this from the browser
console against the app's own Supabase client — it attaches auth and refreshes
an expiring token itself, so no token is ever copied and no password is touched:

```js
const { supabase } = await import('/src/integrations/supabase/client.ts');
await supabase.functions.invoke('app-schema-setup', { body: { action: 'verify' } });
await supabase.functions.invoke('app-schema-setup', { body: { action: 'setup' } });
await supabase.functions.invoke('app-schema-setup', { body: { action: 'verify' } });
```

The first `verify` proves admin access and shows the before state; the second
should report the table present, `4/4` RPCs, every schedule with a parsed date,
and the reminder cron scheduled.

Re-running `setup` is safe: every statement is `if not exists`, `or replace`, or
guarded, and the cron job is unscheduled before being rescheduled. Postgres runs
the whole script as one implicit transaction, so a failure part-way rolls
everything back and leaves the database untouched — which is exactly what
happened on the first attempt here.

**Applied to production on 3 September 2026.** `verify` afterwards reported the
table present, 4/4 RPCs, the cron scheduled, 17/17 schedules with a parsed date,
no unparsed dates, and 54 pickup addresses seeded from existing profiles.

`app-schema-setup` is the generic vehicle: it carries every migration listed in
the embed tool, in order, and each one is written to be safely re-runnable. Add
new migrations to that list rather than creating another function per feature.

After editing a migration, regenerate the embedded copy and redeploy:

```bash
node tools/embed-schema-setup-sql.cjs
```

## Known limitation: reach

The reminder is an **in-app notification only**. The customer app has no push
notifications (`expo-notifications` is not installed), so a customer who does not
open the app will not see it, and the slot stays `awaiting_customer` — which
dispatch sees plainly on the row rather than mistaking it for a preference.

Two ways to close that gap when wanted:

- Send the reminder over WhatsApp as well. The bot is already reachable from
  edge functions (`WHATSAPP_BOT_URL` / `WHATSAPP_BOT_API_KEY`, see
  `supabase/functions/collection-notification`), and `pg_cron` + `pg_net`
  already call an edge function on a schedule for photo retention.
- Add push notifications to the customer app, which needs a native rebuild.

Until then, treat the in-app reminder as a convenience and the driver's
call-ahead as the real contact.

## Reference

**States** (derived from timestamps, never stored, so they cannot drift):

| State | Meaning |
| --- | --- |
| `awaiting_customer` | Never replied. |
| `customer_confirmed` | Picked a window; dispatch has not planned yet. |
| `scheduled` | Dispatch planned and honoured the request. |
| `customer_moved` | Customer changed after dispatch planned — re-check. |
| `dispatch_moved_untold` | Moved, and nobody has spoken to them yet. |
| `dispatch_moved_told` | Moved, and the contact is recorded. |

Being told counts only if it happened *after* the change it covers — ringing
someone on Tuesday does not discharge a move made on Wednesday.

**RPCs**

- `confirm_collection_slot(shipment_id, start, end, flexible)` — customer, own booking only.
- `dispatch_set_collection_slot(shipment_id, start, end, reason)` — `is_operations_admin()`; notifies the customer when it differs from their request.
- `mark_collection_customer_informed(shipment_id, via, note)` — `is_operations_admin()`.
- `queue_collection_slot_reminders()` — `service_role` only; run daily at 08:00 UTC by the `collection-slot-reminders` cron job.

---

# Saved pickup addresses & buying drums

Carried by the same `app-schema-setup` function, in
`supabase/migrations/20260903140000_pickup_addresses_and_drum_purchase.sql`.

## Pickup addresses

`customer_addresses` gained an `address_type` of `delivery` or `pickup`. One
table, because the columns already fitted both and a second one would have meant
duplicating the RLS, the default handling and every screen that reads them. For
a pickup address the "recipient" is whoever hands the goods over.

Every existing row is backfilled to `delivery`. Customers who onboarded with a
pickup address get it seeded as their first saved pickup address, marked
default. **The `profiles.pickup_address / pickup_city / postal_code` columns are
deliberately left alone** — the website's booking form still reads them, so this
is purely additive. The seed only ever inserts, and only for customers with no
pickup address yet, so re-running it is a no-op.

In the app: **Account → My Addresses** has a Deliver to / Collect from toggle,
and the booking's Collection step lists saved pickup addresses above the
free-text field. Choosing one fills address, town, postcode and country at once,
and claims the town so the postcode lookup cannot overwrite it.

## Buying drums

`metadata.purchasedDrums` — `{ type, quantity, priceEach, totalPrice }`, the same
shape the website writes, so warehouse and finance read one format.

Priced server-side from `app_configuration.booking_fees`
(`metalDrumPurchase` 40, `plasticDrumPurchase` 50), the same number in either
currency, like the collection and door-delivery fees. A client that asks for
cheap drums is charged the configured price regardless.

`create_customer_booking` now wraps the previous version, which was renamed to
`create_customer_booking_v2` under a `to_regprocedure` guard so re-running the
migration renames nothing twice. The chain is:

```
create_customer_booking          -- adds purchased drums
  └── create_customer_booking_v2 -- door delivery, quote items, config fees
        └── create_customer_booking_legacy -- catalogue pricing, the shipment row
```

Bought drums are **not** shipment contents: they are excluded from the generated
goods description, from the review screen's "Items:" line, and from the
"something to ship" check that gates the Shipment step — so a booking of nothing
but empty drums cannot proceed.

## Prices, for reference

These all live in the database and were already correct before this work; the
app simply had no screen for the last two.

| | UK | Ireland |
| --- | --- | --- |
| Drum shipping (200–220 L), metal or plastic | £280 | €360 |
| Trunk / storage box | £180–280, confirmed item by item | €220 |
| Metal coded seal | £5 | €6 |
| Buy a metal drum | £40 | €40 |
| Buy a plastic barrel | £50 | €50 |

Note the website's own drum-purchase total hardcodes 40/50 rather than reading
the configured fee (`SimplifiedBookingForm.tsx`), so changing the price in the
admin dashboard would move the app's total and the website's `priceEach` but not
the website's `totalPrice`. Worth fixing there when someone is next in that file.

---

# Invoice parity with the office

The app had grown a third copy of the invoice arithmetic, and it disagreed with
the admin's on two counts. `customer-app/src/lib/invoiceTotals.ts` now mirrors
`src/utils/invoiceTotals.ts` and the admin's `BillingInvoiceTemplate` exactly;
any future change belongs in the office's copy first.

**What diverged**

1. **Discount and tax.** The app subtracted `invoice.discount` and added
   `invoice.taxRate`. The office's template deliberately renders
   `{ ...invoice, discount: 0, taxRate: 0 }`, so the total it issues is the plain
   sum of the line items. Bookings *do* write a referral discount onto the
   record, so any referred customer was shown a smaller total than the invoice
   they were actually sent.
2. **Paid status.** The app read `Boolean(invoice.paid)` alone and ignored
   `payments[]`, so an invoice settled through recorded payments still read
   "Payment due" in the app while the office showed it paid.

Measured against the office's own module:

| Case | Office | App before | App now |
| --- | --- | --- | --- |
| Referral discount, part paid | £585 | £565 | £585 |
| Settled by payments, no `paid` flag | paid | Payment due | paid |
| Legacy `paid` flag, no payment rows | paid | paid | paid |
| `taxRate: 20` on the record | £100 | £120 | £100 |

The PDF's totals block was rewritten to the office's four rows — Subtotal,
Total, Amount Paid, Balance Due — with no Discount or Tax rows. The invoice card
and the billing list now show part-payments and the outstanding balance too.

# The collection date is derived, not chosen

**The customer never picks a collection date.** The postcode decides the route,
and the route carries the date — so as soon as a serviceable postcode is typed
the answer is already known. Ireland routes by town instead of postcode, but the
principle is the same.

The booking used to present a list of dates to choose from, which was simply the
wrong model. Now:

- Step 1 shows the date the moment the location resolves: "Your collection date:
  Monday, 14 September 2026 / NORTHAMPTON ROUTE".
- The draft's `scheduleId` / `route` / `collectionDate` are written from that
  automatically, so the customer never has to confirm anything for the booking
  to carry a date.
- The old "Date" step is now "Payment" and shows the resolved date read-only.
- The soonest published date on a covering route wins when more than one matches.

Two guards worth knowing about:

- Nothing resolves until the customer has actually given a location
  (postcode >= 3 characters, or a town of 3+). An empty postcode matches *every*
  route in `scheduleMatchesPostcode` — correct for browsing the schedule, and
  quite wrong here, where it promised a Northampton date to somebody who had
  typed nothing at all.
- The effect that writes the date onto the draft waits for `schedules` to load,
  so restoring a saved draft does not blank its date for a beat.

# Stale collection dates

Routes whose published `pickup_date` has already passed used to be filtered out
of the home card and the booking's date step entirely, so a customer in an area
awaiting a new date saw **no route and no date at all** — which reads as "we do
not come to you" rather than "your next date has not been published yet".

At the time of writing six of the seven Ireland routes were in that state
(ATHLONE, LONDONDERRY, CAVAN, DUBLIN CITY, CORK, LIMERICK); only BELFAST had a
current date. **That is a data problem, not a code one** — the fix is for the
office to publish new dates in the admin dashboard. What the code now does is
stop hiding it:

- The booking names the route and says its date is pending — "DUBLIN CITY covers
  you, but its next date has not been published yet. Book anyway and we will
  confirm your date." — rather than showing nothing at all.
- The home card keeps the route visible with "Next date being confirmed" and a
  "New date due" pill instead of disappearing.

A stale date is never written onto a booking: it would put the collection in the
past. The booking simply carries no date and the office confirms one.

Also fixed here: starting a new booking from Home left the wizard on whichever
step it was last on (typically step 5) with an empty draft, because the screen
stays mounted in the stack. `freshToken` now resets the step as well as the draft.

# Tolerating a database that is behind the app

The customer app ships as a native build with **no over-the-air updates**, so a
release can reach customers before its migration reaches the database. The app
must therefore degrade rather than break in that window, and the address code
proved why: adding `address_type` to every query made *delivery* addresses —
which had always worked — start failing with `42703` too.

`customer-app/src/lib/addresses.ts` now probes once and remembers. When the
column is missing, the two kinds collapse back into the one kind that always
existed: delivery addresses list and save exactly as before, and saving a pickup
address fails with a sentence a customer can read rather than a Postgres code.
`confirmSlot` does the same for `PGRST202`.

Worth keeping in mind for any future column the app depends on.

# The time slot is optional

Choosing a window was always technically optional but the wording read as a
demand. It now says so: the section is headed "When will you be in? (optional)",
the button reads "Skip for now" while nothing is chosen, the prompts elsewhere
say "Add a preferred collection time (optional)", and the 48-hour notification
leads with "Your collection is in two days" rather than an instruction.

A customer who never answers is not chased again and is not blocked: dispatch
sees "No time chosen yet" and plans the round however suits, exactly as before
the feature existed. This matters beyond politeness — a screen that looks
compulsory gets answered carelessly, and a careless window is worse for the
driver than no window at all.

---

# Collection runs: grouping work by route and period

`supabase/migrations/20260903160000_collection_runs.sql`

## Why a new table was needed

Dispatch could not ask for "the Northampton run on the 14th" because nothing
represented it. `collection_schedules` holds **one row per route**, and its date
is edited in place:

```sql
update public.collection_schedules set pickup_date = new_date where route = route_name;
```

So `collection_schedule_id` identifies a *route*, not an occurrence of one. Move
the date and every shipment ever linked to that route appears to belong to the
new date. There was no collection period in the data model at all.

What that looked like in the live data beforehand:

- 278 shipments read as awaiting collection; **11** carried a schedule link.
- 83 distinct route/date pairs, dominated by `(no route) | (no date)` (71) and
  `To be assigned | To be confirmed` (35).
- Route names recorded inconsistently — `BRIGHTON` vs `BRIGHTON ROUTE`,
  `LEEDS` vs `LEEDS ROUTE`, `SOUTHEND` vs `SOUTHEND ROUTE`.

## The model

A `collection_run` is **one route on one date**, and `shipments.collection_run_id`
points at it. Runs are created on demand; a run with no published date yet is
allowed and still gathers bookings.

Bookings join a run **on insert, by trigger** — not inside
`create_customer_booking` — because there is more than one thing that creates a
shipment (the app, the website, manual office bookings) and they must not drift
apart again. The trigger never raises: a booking that cannot be filed is still a
booking, and shows up as unassigned.

`attach_shipment_to_run` resolves the route in order of confidence:

1. the schedule already linked to the booking;
2. the route name it recorded, through `canonical_route_name` — compared on
   letters and digits with a trailing `ROUTE` stripped, which is what rescues
   `NORTHAMPTON` vs `NORTHAMPTON ROUTE`;
3. the collection postcode, through `match_collection_schedule` — the SQL
   counterpart of the apps' `scheduleMatchesPostcode` (UK on outward code then
   town, Ireland on town alone).

It returns nothing rather than guessing. An unassigned booking dispatch can see
beats a confident wrong route.

**When the office moves a route's date, its open run moves with it** — otherwise
editing Northampton from the 14th to the 16th would leave existing bookings in a
14th run and file new ones into a 16th, splitting one collection in two.
Completed runs keep the date they actually happened on.

## Backfill scope

Deliberately narrow. `collection_status` is stale across this data — 124 of the
278 it called uncollected were already In Transit, Arrived or Delivered — so
`status` is the field that means anything, and only pre-collection statuses
booked in the last 60 days were swept in. That kept a year of abandoned bookings
out of next week's run.

Result on 3 September 2026: **13 runs created, 48 of 67 recent pending bookings
filed automatically.** The remaining 19 had no resolvable postcode and sit in
Unassigned; 82 older pending bookings are counted separately and kept out of the
working set.

## The dispatcher's screen

`collection_run_board()` returns one row per run with the numbers dispatch
decides on — shipment count, how many customers have chosen a time, how many are
owed a call after being moved — plus two synthetic rows with a null `run_id`:
`Unassigned` (recent, postcode matched nothing) and `Older than 60 days`
(counted so nothing is hidden, kept out of the way).

**Staff app → Dispatch → COLLECTION GROUPS** lists them. Opening one hands
`DispatchRouteBuilderScreen` a `runId`, which narrows it to that group and
pre-fills the route name; opening the builder without one still offers every
open collection, which is how an unassigned booking gets placed by hand.
Creating the route links the driver run back onto `collection_runs.driver_run_id`
so the board shows who is on it.

The builder now also filters on real `status` rather than `collection_status`,
for the same staleness reason.

## Assigning a driver to a group

`supabase/migrations/20260903180000_assign_group_driver.sql`

The group already *is* the route, so naming a driver should not mean re-picking
the same shipments in the builder. `assign_collection_run_driver(run, driver)`
does the whole thing server-side:

- creates or reuses that driver's run for the group's date (one run per driver
  per day is a database rule);
- adds every pending collection in the group as a stop, skipping any already
  there, so it is safe to run twice;
- **orders the stops by the window each customer asked for**, earliest first,
  with everyone who chose nothing after them — the point of collecting windows
  at all;
- copies a chosen window onto the stop's `time_window_start/end` and records it
  as the dispatch window. Because it equals the request, nobody is flagged as
  moved and nobody is owed a call;
- links `collection_runs.driver_run_id` and marks the group `active`.

Passing a null driver unassigns: the run is cancelled and the group goes back in
the pool. Reassigning to a different driver carries the existing stops across
rather than rebuilding them.

`collection_drivers(date)` backs the picker and reports `stops_that_day`, which
is what stops a dispatcher quietly double-booking someone. Delivery-only drivers
are excluded — they work the Zimbabwe half.

An undated group refuses with *"Publish a collection date for X before assigning
a driver"* rather than a constraint violation, because `driver_runs.run_date` is
not nullable and publishing the date is the actual fix.

### Two bugs worth remembering

**Never nest `Pressable` inside `Pressable`.** The card was pressable with
buttons inside it. React Native has no event bubbling to stop — `stopPropagation`
is a DOM-ism that does nothing there — so tapping "Assign driver" on a device
would have fired the card's own press too and pushed a second screen. The card
is now a plain `View` with explicit actions. On web it also showed up as nested
`<button>` hydration errors.

**Not every staff profile has `full_name`.** The board read a nameless driver as
"No driver" even with a run attached. The board now falls back to email and the
badge keys off `driver_run_id`, not the name.
