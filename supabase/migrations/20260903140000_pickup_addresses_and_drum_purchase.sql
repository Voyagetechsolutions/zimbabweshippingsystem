-- ---------------------------------------------------------------------------
-- Saved pickup addresses, and buying drums from us
--
-- Two things customers could not do from the app:
--
--   1. Save the address we collect FROM. Saved addresses existed only for
--      Zimbabwe delivery; the collection address lived as three loose columns
--      on `profiles`, so a customer with two pickup addresses (home and their
--      mother's) had to retype one of them on every booking.
--   2. Buy a drum from us. The website has offered this for a while; the app
--      never did, so app customers had to ask on WhatsApp.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- A. Pickup addresses share the delivery-address table
-- ---------------------------------------------------------------------------

-- One table, two kinds. The columns already fit both: for a pickup address the
-- "recipient" is whoever hands the goods over, which is normally the customer.
-- A separate table would have meant duplicating the RLS, the default handling
-- and every screen that reads them.
alter table public.customer_addresses
  add column if not exists address_type text not null default 'delivery';

do $$ begin
  alter table public.customer_addresses add constraint customer_address_type_check
    check (address_type in ('delivery', 'pickup'));
exception when duplicate_object then null; end $$;

-- Everything that existed before this migration is a Zimbabwe delivery address.
update public.customer_addresses set address_type = 'delivery' where address_type is null;

create index if not exists customer_addresses_user_type_idx
  on public.customer_addresses(user_id, address_type);

/**
 * Give every customer who onboarded with a pickup address a saved pickup
 * address to match, so the feature is useful on first open rather than empty.
 *
 * Deliberately additive: the `profiles` columns are left exactly as they are,
 * because the website's booking form still reads them. This only ever inserts,
 * only for customers with no pickup address saved yet, so re-running it is a
 * no-op rather than a pile of duplicates.
 */
insert into public.customer_addresses (
  user_id, address_type, recipient_name, recipient_phone,
  address_line1, city, postal_code, country, is_default)
select
  p.id,
  'pickup',
  coalesce(nullif(btrim(p.full_name), ''), 'Me'),
  coalesce(p.phone_number, ''),
  btrim(p.pickup_address),
  coalesce(nullif(btrim(p.pickup_city), ''), ''),
  p.postal_code,
  case when lower(coalesce(p.country, '')) like '%ireland%' then 'Ireland' else 'United Kingdom' end,
  true
from public.profiles p
where coalesce(btrim(p.pickup_address), '') <> ''
  and not exists (
    select 1 from public.customer_addresses a
     where a.user_id = p.id and a.address_type = 'pickup');

-- ---------------------------------------------------------------------------
-- B. Buying drums from us
-- ---------------------------------------------------------------------------

-- The purchase prices are the same number in either currency, matching how the
-- collection and door-delivery fees already work (GBP 25 / EUR 25).
update public.app_configuration
   set value = value
     || jsonb_build_object('metalDrumPurchase', coalesce((value->>'metalDrumPurchase')::numeric, 40))
     || jsonb_build_object('plasticDrumPurchase', coalesce((value->>'plasticDrumPurchase')::numeric, 50))
 where key = 'booking_fees';

-- Step aside so the current booking function can be wrapped rather than
-- rewritten. Guarded on the target name, exactly as the earlier booking
-- migrations did it, so re-running this file renames nothing a second time.
do $$ begin
  if to_regprocedure('public.create_customer_booking_v2(jsonb)') is null then
    execute 'alter function public.create_customer_booking(jsonb) rename to create_customer_booking_v2';
  end if;
end $$;

/**
 * Price purchased drums server-side, like everything else on a booking.
 *
 * This wraps the wrapper: `create_customer_booking` already delegates the bulk
 * of the work to `create_customer_booking_legacy` and then corrects the invoice
 * for door delivery and quote items. Purchased drums are appended the same way,
 * at the fee held in `app_configuration` rather than anything the client sent —
 * a client that asks for cheap drums gets charged the configured price.
 */
create or replace function public.create_customer_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb; v_shipment_id uuid; v_ship public.shipments%rowtype;
  v_invoice jsonb; v_meta jsonb; v_lines jsonb; v_total numeric;
  v_drum_type text; v_drum_qty integer; v_drum_price numeric; v_drum_label text;
begin
  -- Everything the previous version did stays exactly as it was.
  v_result := public.create_customer_booking_v2(p);

  v_drum_type := nullif(p->'purchaseDrums'->>'type', '');
  v_drum_qty := greatest(0, coalesce((p->'purchaseDrums'->>'quantity')::integer, 0));
  if v_drum_type is null or v_drum_qty = 0 then return v_result; end if;
  if v_drum_type not in ('metal', 'plastic') then raise exception 'Unknown drum type'; end if;

  v_drum_price := public.config_number('booking_fees',
    case when v_drum_type = 'metal' then 'metalDrumPurchase' else 'plasticDrumPurchase' end, 0);
  if v_drum_price <= 0 then return v_result; end if;

  v_drum_label := case when v_drum_type = 'metal' then 'Metal drum purchased from us' else 'Plastic barrel purchased from us' end;

  v_shipment_id := (v_result->>'id')::uuid;
  select * into v_ship from public.shipments where id = v_shipment_id for update;
  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);
  v_lines := coalesce(v_invoice->'items', '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
         'description', v_drum_label, 'quantity', v_drum_qty, 'unitPrice', v_drum_price));
  v_total := coalesce((v_result->>'estimatedTotal')::numeric, 0) + (v_drum_qty * v_drum_price);

  v_invoice := jsonb_set(v_invoice, '{items}', v_lines, true);
  v_meta := jsonb_set(coalesce(v_ship.metadata, '{}'::jsonb), '{invoice}', v_invoice, true);
  v_meta := jsonb_set(v_meta, '{pricing,estimatedTotal}', to_jsonb(v_total), true);
  -- Same shape the website writes, so warehouse and finance read one format.
  v_meta := jsonb_set(v_meta, '{purchasedDrums}', jsonb_build_object(
    'type', v_drum_type, 'quantity', v_drum_qty,
    'priceEach', v_drum_price, 'totalPrice', v_drum_qty * v_drum_price), true);

  update public.shipments set metadata = v_meta where id = v_shipment_id;
  return v_result || jsonb_build_object('estimatedTotal', v_total, 'invoice', v_invoice);
end $$;

grant execute on function public.create_customer_booking(jsonb) to authenticated;
