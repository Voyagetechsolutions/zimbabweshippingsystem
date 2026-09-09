-- Track a shipment by the reference the customer actually has.
--
-- `get_shipment_tracking_info` matched `tracking_number = tracking_num`:
-- exact, case-sensitive, and against that column alone. That is not what a
-- customer types.
--
-- Of the 114 live shipments, 54 carry a `customer_reference` — LAU09268830 and
-- the like — and that is the string printed on their invoice and shown in both
-- apps. Zimmy could not resolve a single one of them. A further 29 have a
-- tracking number beginning "INVOICE-", which the chat function's extractor
-- never even picked out of a sentence. So for most of the book, asking "where
-- is my shipment" produced nothing, and the assistant answered as if the
-- shipment did not exist.
--
-- Matching is now case-insensitive and trimmed against either identifier,
-- because a customer reading a reference off a phone screen types it however it
-- reads to them.

create or replace function public.get_shipment_tracking_info(tracking_num text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  result jsonb;
  shipment_record record;
  v_needle text := upper(trim(coalesce(tracking_num, '')));
begin
  if v_needle = '' then
    return null;
  end if;

  select
    status,
    origin,
    destination,
    updated_at,
    tracking_number,
    customer_reference,
    created_at,
    metadata->'estimated_delivery' as estimated_delivery,
    metadata->'carrier' as carrier
  into shipment_record
  from public.shipments
  where deleted_at is null
    and (
      upper(trim(tracking_number)) = v_needle
      or upper(trim(coalesce(customer_reference, ''))) = v_needle
    )
  -- Newest first: a reference is unique in practice, but if a customer has
  -- somehow reused one, the shipment they are asking about is the recent one.
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  -- Still only the safe, non-sensitive fields. This function is reachable
  -- without authentication, so it must never widen beyond tracking status.
  result := jsonb_build_object(
    'status', shipment_record.status,
    'origin', shipment_record.origin,
    'destination', shipment_record.destination,
    'tracking_number', shipment_record.tracking_number,
    'customer_reference', shipment_record.customer_reference,
    'last_updated', shipment_record.updated_at,
    'created_at', shipment_record.created_at,
    'estimated_delivery', coalesce(shipment_record.estimated_delivery, '"Not available"'::jsonb),
    'carrier', coalesce(shipment_record.carrier, '"Zimbabwe Shipping"'::jsonb)
  );

  return result;
end;
$function$;
