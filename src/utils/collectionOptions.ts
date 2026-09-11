import { supabase } from '@/integrations/supabase/client';

/**
 * The collection dates a customer may choose between.
 *
 * A route runs once per monthly consignment, and more than one of those
 * consignments is usually open at a time: on 11 September a London customer
 * can still make the 19 September van, or wait for 17 October. The booking
 * form used to show exactly one date, because `collection_schedules` holds one
 * row per route and publishing a new month overwrote the old one in place.
 * `route_collection_dates` holds them all; this reads it.
 */

export type CollectionOption = {
  id: string;
  /** ISO day, e.g. "2026-09-19". */
  date: string;
  /** "September 19th, 2026" — the spelling every other screen and receipt uses. */
  label: string;
  periodId: string;
  /** The consignment name, e.g. "October 2026 Consignment". */
  period: string;
};

export type CollectionOffer = {
  route: string | null;
  scheduleId: string | null;
  country: string | null;
  options: CollectionOption[];
};

export const EMPTY_OFFER: CollectionOffer = {
  route: null, scheduleId: null, country: null, options: [],
};

/**
 * Ask the server which collections this route still has open.
 *
 * The route is resolved by the caller from `app_configuration.uk_route_coverage`
 * (UK postcode prefixes) or the Ireland city map, which is the one place that
 * decision is made. The server only normalises the " ROUTE" suffix, which live
 * rows spell both ways — the reason the form previously needed three queries to
 * find one row.
 */
export async function fetchCollectionOffer(route: string | null): Promise<CollectionOffer> {
  if (!route) return EMPTY_OFFER;
  const { data, error } = await (supabase.rpc as any)('collection_dates_for_route', { p_route: route });
  if (error || !data) return { ...EMPTY_OFFER, route };
  const options = Array.isArray(data.options) ? (data.options as CollectionOption[]) : [];
  return {
    route: data.route ?? route,
    scheduleId: data.scheduleId ?? null,
    country: data.country ?? null,
    options,
  };
}

/**
 * Keep the customer's choice only while it is still on offer.
 *
 * Changing the postcode changes the route, and a date from the old route must
 * not survive that — it would book them onto a van that never comes to them.
 * Falling back to the soonest date means the form always has a real answer,
 * which is what it showed before there was anything to choose.
 */
export function reconcileChoice(
  options: CollectionOption[],
  chosenId: string | null,
): CollectionOption | null {
  if (!options.length) return null;
  return options.find((o) => o.id === chosenId) || options[0];
}
