-- What the driver is collecting, for the 73 shipments in 130 that never filled
-- the `goods_description` column.
--
-- `driver_collection_feed` and `driver_collection_detail` read that column
-- directly, so a driver opening a website booking is told "Description not
-- recorded" — on the very screen where the job is to check the goods against
-- what the customer declared. The detail is there, just under different keys
-- depending on which door the booking came through.

/**
 * A one-line summary of the goods, from wherever the booking recorded them.
 *
 * Tried in order of how specific each source is. The generic prefill line
 * "Shipping and collection service" is skipped on purpose: it is what
 * `ensure_booking_paperwork` writes for every priced booking and tells a
 * driver standing on a doorstep precisely nothing.
 */
create or replace function public.shipment_goods_summary(p_goods text, p_metadata jsonb)
returns text
language sql
stable
set search_path = public
as $$
  with details as (select coalesce(p_metadata->'shipmentDetails', '{}'::jsonb) as d),
  counted as (
    select nullif(trim(concat_ws(', ',
      case when coalesce((d->>'drumQuantity')::numeric, 0) > 0
        then (d->>'drumQuantity') || ' x drum' ||
             coalesce(' (' || nullif(trim(d->>'drumsDescription'), '') || ')', '')
      end,
      case when coalesce((d->>'trunkQuantity')::numeric, 0) > 0
        then (d->>'trunkQuantity') || ' x trunk' ||
             coalesce(' (' || nullif(trim(d->>'trunksDescription'), '') || ')', '')
      end,
      case when coalesce((d->>'boxQuantity')::numeric, 0) > 0
        then (d->>'boxQuantity') || ' x box' ||
             coalesce(' (' || nullif(trim(d->>'boxesDescription'), '') || ')', '')
      end)), '') as composed
    from details
  )
  select coalesce(
    nullif(trim(coalesce(p_goods, '')), ''),
    nullif(trim(coalesce(p_metadata->'shipmentDetails'->>'description', '')), ''),
    nullif(trim(coalesce(p_metadata->'shipment'->>'description', '')), ''),
    (select composed from counted),
    nullif(trim(coalesce(p_metadata->'shipmentDetails'->>'category', '')), ''),
    (select string_agg(line->>'description', ', ')
       from jsonb_array_elements(
         case when jsonb_typeof(p_metadata->'invoice'->'items') = 'array'
              then p_metadata->'invoice'->'items' else '[]'::jsonb end) line
      where nullif(trim(coalesce(line->>'description', '')), '') is not null
        and lower(trim(line->>'description')) <> 'shipping and collection service')
  )
$$;

revoke all on function public.shipment_goods_summary(text, jsonb) from public, anon;
grant execute on function public.shipment_goods_summary(text, jsonb) to authenticated;
