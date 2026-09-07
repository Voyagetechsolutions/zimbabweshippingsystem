/**
 * Hands a stop over to whichever map app the driver already uses.
 *
 * We optimise and draw the route; Google Maps, Waze or Apple Maps does the
 * actual turn-by-turn. That is a deliberate choice: real in-app navigation
 * means a paid SDK, a custom native build and a much larger App Review
 * surface, for a worse experience than the app already on the driver's phone.
 *
 * Every URL here is a documented, stable deep link that works whether or not
 * the app is installed — the https:// forms fall through to the website, so a
 * driver without Waze still gets directions rather than a dead button.
 *
 * Platform is a parameter rather than an import so this stays pure and
 * testable; screens pass `Platform.OS`.
 */

export type NavTarget = {
  latitude?: number | null;
  longitude?: number | null;
  /** Used when there is no usable point, and as the pin label when there is. */
  address?: string | null;
  label?: string | null;
};

export type NavApp = 'google' | 'waze' | 'apple';

export type NavOption = { app: NavApp; label: string; url: string };

const hasPoint = (t: NavTarget): t is NavTarget & { latitude: number; longitude: number } => {
  const { latitude, longitude } = t;
  return (
    typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
};

/** Six decimal places is roughly 0.1 m — far past what a van needs, and keeps URLs short. */
const coord = (value: number) => Number(value.toFixed(6)).toString();

/**
 * A destination string for the given target: coordinates when we have them,
 * otherwise the address text.
 *
 * Coordinates are strongly preferred. A free-text address is re-geocoded by
 * the map app, which is exactly the step that failed for this shipment in the
 * first place, so it can easily land somewhere else.
 */
function destination(target: NavTarget): string | null {
  if (hasPoint(target)) return `${coord(target.latitude)},${coord(target.longitude)}`;
  const address = String(target.address || '').trim();
  return address.length >= 3 ? address : null;
}

export function googleMapsUrl(target: NavTarget): string | null {
  const dest = destination(target);
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

export function wazeUrl(target: NavTarget): string | null {
  // Waze navigates to a point directly; with only an address it has to search.
  if (hasPoint(target)) {
    return `https://waze.com/ul?ll=${coord(target.latitude)},${coord(target.longitude)}&navigate=yes`;
  }
  const address = String(target.address || '').trim();
  if (address.length < 3) return null;
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function appleMapsUrl(target: NavTarget): string | null {
  const dest = destination(target);
  if (!dest) return null;
  // dirflg=d asks for driving directions.
  return `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=d`;
}

/**
 * The navigation choices to offer, best first.
 *
 * Google leads on both platforms because it is the one drivers here already
 * have. Apple Maps is offered only on iOS, where it is guaranteed present.
 */
export function navigationOptions(target: NavTarget, platform: string): NavOption[] {
  const options: Array<NavOption | null> = [
    { app: 'google', label: 'Google Maps', url: googleMapsUrl(target) as string },
    { app: 'waze', label: 'Waze', url: wazeUrl(target) as string },
    platform === 'ios'
      ? { app: 'apple', label: 'Apple Maps', url: appleMapsUrl(target) as string }
      : null,
  ];
  return options.filter((option): option is NavOption => Boolean(option && option.url));
}

/**
 * One Google Maps link covering several stops in order, for a driver who would
 * rather run the whole leg in the map app than come back after each stop.
 *
 * Google accepts a limited number of intermediate waypoints on a directions
 * URL; beyond that it silently drops them, which would quietly skip
 * collections. So the list is capped and the caller is told how many made it,
 * rather than being handed a link that lies about where it goes.
 */
export const MAX_WAYPOINTS = 9;

export function multiStopGoogleMapsUrl(
  start: NavTarget | null,
  stops: NavTarget[],
): { url: string; covered: number } | null {
  const usable = stops.map(destination).filter((d): d is string => Boolean(d));
  if (!usable.length) return null;

  // The final stop is the destination; everything before it is a waypoint.
  const capped = usable.slice(0, MAX_WAYPOINTS + 1);
  const finalStop = capped[capped.length - 1];
  const waypoints = capped.slice(0, -1);

  const params = new URLSearchParams({ api: '1', destination: finalStop, travelmode: 'driving' });
  const origin = start ? destination(start) : null;
  if (origin) params.set('origin', origin);
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));

  return { url: `https://www.google.com/maps/dir/?${params.toString()}`, covered: capped.length };
}
