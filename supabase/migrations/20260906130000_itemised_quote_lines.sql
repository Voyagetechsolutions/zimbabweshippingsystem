-- An approved quote becomes one invoice line per item, not one lump.
--
-- The customer already lists their goods item by item, and an admin already
-- prices each of those items separately in the staff app — `custom_quotes`
-- carries the priced breakdown in `quote_items`. But booking off that quote
-- collapsed the whole thing back into a single line:
--
--   Approved quote: Item 1: 3-seater sofa, Item 2: fridge freezer …   £1,850
--
-- which is what made the invoice and the delivery note hard to work from.
-- Nobody loading a container can tick off one line covering nine things, and a
-- customer querying a price has nothing to point at. The breakdown existed the
-- whole time; this stops throwing it away.
--
-- Wraps rather than rewrites, exactly as the previous three revisions of this
-- routine did — the pricing itself is untouched.
--
-- Idempotent: safe to re-run.

do $$ begin
  if to_regprocedure('public.create_customer_booking_v3(jsonb)') is null then
    execute 'alter function public.create_customer_booking(jsonb) rename to create_customer_booking_v3';
  end if;
end $$;

create or replace function public.create_customer_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
  v_quote_id uuid := nullif(p->>'quoteId', '')::uuid;
  v_quote public.custom_quotes%rowtype;
  v_shipment_id uuid;
  v_ship public.shipments%rowtype;
  v_invoice jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_item jsonb;
  v_itemised numeric := 0;
  v_line jsonb;
  v_replaced boolean := false;
begin
  -- Everything the previous version did stays exactly as it was.
  v_result := public.create_customer_booking_v3(p);
  if v_quote_id is null then return v_result; end if;

  select * into v_quote from public.custom_quotes where id = v_quote_id;
  if not found or v_quote.quote_items is null or jsonb_array_length(v_quote.quote_items) = 0 then
    return v_result;
  end if;

  -- Every item must carry its own price, and they must add up to the amount the
  -- customer was quoted and agreed. If they do not, the single line stands:
  -- silently re-pricing a booking to make a breakdown fit would be worse than
  -- having no breakdown.
  for v_item in select * from jsonb_array_elements(v_quote.quote_items) loop
    if coalesce((v_item->>'amount')::numeric, 0) <= 0 then return v_result; end if;
    v_itemised := v_itemised + (v_item->>'amount')::numeric;
  end loop;
  if abs(v_itemised - coalesce(v_quote.quoted_amount, -1)) > 0.01 then return v_result; end if;

  v_shipment_id := (v_result->>'id')::uuid;
  select * into v_ship from public.shipments where id = v_shipment_id for update;
  if not found then return v_result; end if;

  v_invoice := coalesce(v_ship.metadata->'invoice', '{}'::jsonb);

  -- Swap the one "Approved quote: …" line for the priced breakdown, leaving
  -- every other line (drums, seals, door delivery) exactly where it was.
  for v_line in select * from jsonb_array_elements(coalesce(v_invoice->'items', '[]'::jsonb)) loop
    if not v_replaced and coalesce(v_line->>'description', '') like 'Approved quote:%' then
      v_replaced := true;
      for v_item in select * from jsonb_array_elements(v_quote.quote_items) loop
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'description', left(coalesce(nullif(trim(v_item->>'description'), ''), 'Quoted item'), 200),
          'quantity', 1,
          'unitPrice', (v_item->>'amount')::numeric));
      end loop;
    else
      v_lines := v_lines || jsonb_build_array(v_line);
    end if;
  end loop;
  if not v_replaced then return v_result; end if;

  v_invoice := jsonb_set(v_invoice, '{items}', v_lines, true);

  update public.shipments
     set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{invoice}', v_invoice, true),
         updated_at = now()
   where id = v_shipment_id;

  return v_result || jsonb_build_object('invoice', v_invoice);
end $$;

grant execute on function public.create_customer_booking(jsonb) to authenticated;
