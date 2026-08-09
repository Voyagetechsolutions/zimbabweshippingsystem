/**
 * Address and postcode lookup for the UK (incl. Scotland and Northern Ireland)
 * and Ireland.
 *
 * Two free services, no API key and no billing:
 *  - postcodes.io  — validates a UK postcode and resolves its town/district and
 *                    coordinates. This is the authoritative half: the postcode
 *                    is what decides whether we collect from an address.
 *  - Photon (OSM)  — street-level suggestions for the search bar. Suggestions
 *                    are a convenience only; they never decide coverage.
 *
 * Everything goes through the `AddressLookupProvider` shape below so a paid
 * provider (Royal Mail PAF, Google Places) can be dropped in later without
 * touching any form.
 */

import { restrictedPostalCodes, getRouteForPostalCode } from '@/utils/postalCodeUtils';

export interface PostcodeDetails {
  postcode: string;
  town: string;
  district: string;
  region: string;
  /** England | Scotland | Wales | Northern Ireland */
  country: string;
  latitude: number | null;
  longitude: number | null;
  /** Names worth matching against a collection schedule's `areas`. */
  candidates: string[];
}

export interface AddressSuggestion {
  /** Single-line label shown in the dropdown. */
  label: string;
  /** House number + street, suitable for the address field. */
  line1: string;
  town: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
}

export type CoverageStatus = 'covered' | 'needs_confirmation' | 'not_covered' | 'unknown';

export interface Coverage {
  status: CoverageStatus;
  route: string | null;
  message: string;
}

export const normalisePostcode = (value?: string | null): string =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** The part of a UK postcode before the final three characters (e.g. LU1). */
export const outwardCode = (value?: string | null): string => {
  const clean = normalisePostcode(value);
  return clean.length > 4 ? clean.slice(0, -3) : clean;
};

/** Leading letters only (e.g. LU) — what the route tables are keyed on. */
export const postcodePrefix = (value?: string | null): string =>
  (outwardCode(value).match(/^[A-Z]+/) || [''])[0];

/** Formats for display: LU13XX -> LU1 3XX. */
export const prettyPostcode = (value?: string | null): string => {
  const clean = normalisePostcode(value);
  if (clean.length < 5) return clean;
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
};

/**
 * Whether we collect from a postcode.
 *
 * `getRouteForPostalCode` returns null both for areas we deliberately don't
 * service and for prefixes it simply doesn't recognise. Booking needs to tell
 * those apart, so the restricted list is checked separately here.
 */
export const coverageForPostcode = (postcode?: string | null): Coverage => {
  const clean = normalisePostcode(postcode);
  if (clean.length < 2) {
    return { status: 'unknown', route: null, message: '' };
  }

  // Compare whole letter-prefixes, not string prefixes: "G" (Glasgow, not
  // serviced) must not swallow "GL" (Gloucester) or "GU" (Guildford), both of
  // which are on live routes.
  const letters = postcodePrefix(clean);
  const restricted = restrictedPostalCodes.includes(letters);

  if (restricted) {
    return {
      status: 'not_covered',
      route: null,
      message:
        'We do not currently run a collection route to this postcode. Contact us and we will tell you the nearest area we cover.',
    };
  }

  const route = getRouteForPostalCode(clean);
  if (route) {
    return {
      status: 'covered',
      route,
      message: `This postcode is on our ${route.replace(' ROUTE', '')} collection route.`,
    };
  }

  return {
    status: 'needs_confirmation',
    route: null,
    message:
      'We have no published route for this postcode yet. You can still book — our team will confirm your collection before the pickup date.',
  };
};

/** Full postcode -> place details. Returns null for an invalid postcode. */
export const lookupPostcode = async (postcode: string): Promise<PostcodeDetails | null> => {
  const clean = normalisePostcode(postcode);
  if (clean.length < 5) return null;
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
    if (!response.ok) return null;
    const json = await response.json();
    const result = json?.result;
    if (!result) return null;
    const candidates = [result.admin_district, result.admin_ward, result.region, result.admin_county, result.parish]
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 2);
    return {
      postcode: result.postcode || prettyPostcode(clean),
      town: result.post_town || result.admin_district || result.region || '',
      district: result.admin_district || '',
      region: result.region || '',
      country: result.country || '',
      latitude: typeof result.latitude === 'number' ? result.latitude : null,
      longitude: typeof result.longitude === 'number' ? result.longitude : null,
      candidates,
    };
  } catch {
    return null;
  }
};

/** Partial postcode -> up to `limit` valid completions. */
export const autocompletePostcode = async (partial: string, limit = 8): Promise<string[]> => {
  const clean = normalisePostcode(partial);
  if (clean.length < 2) return [];
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}/autocomplete?limit=${limit}`,
    );
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json?.result) ? json.result : [];
  } catch {
    return [];
  }
};

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

/**
 * Street-level address suggestions across GB and Ireland.
 *
 * When a postcode has already been resolved its coordinates are passed as a
 * bias, which is what makes "24 King" return King Street in the customer's own
 * town rather than the largest King Street in the country.
 */
export const searchAddresses = async (
  query: string,
  options: { near?: { latitude: number; longitude: number } | null; limit?: number } = {},
): Promise<AddressSuggestion[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options.limit ?? 8),
    lang: 'en',
  });
  if (options.near) {
    params.set('lat', String(options.near.latitude));
    params.set('lon', String(options.near.longitude));
  }

  try {
    const response = await fetch(`${PHOTON_ENDPOINT}?${params.toString()}`);
    if (!response.ok) return [];
    const json = await response.json();
    const features = Array.isArray(json?.features) ? json.features : [];

    return features
      .map((feature: any): AddressSuggestion | null => {
        const p = feature?.properties || {};
        // Only GB and Ireland are serviceable origins.
        if (p.countrycode && !['GB', 'IE'].includes(String(p.countrycode).toUpperCase())) return null;

        const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ').trim();
        if (!street) return null;
        const town = p.city || p.town || p.village || p.district || p.county || '';
        const label = [street, town, p.postcode].filter(Boolean).join(', ');
        const coords = feature?.geometry?.coordinates;

        return {
          label,
          line1: street,
          town,
          postcode: p.postcode ? prettyPostcode(p.postcode) : '',
          latitude: Array.isArray(coords) ? coords[1] ?? null : null,
          longitude: Array.isArray(coords) ? coords[0] ?? null : null,
        };
      })
      .filter((item: AddressSuggestion | null): item is AddressSuggestion => item !== null)
      // Photon happily returns the same street twice from different OSM objects.
      .filter((item: AddressSuggestion, index: number, all: AddressSuggestion[]) =>
        all.findIndex((other) => other.label === item.label) === index);
  } catch {
    return [];
  }
};

export interface AddressLookupProvider {
  lookupPostcode: typeof lookupPostcode;
  autocompletePostcode: typeof autocompletePostcode;
  searchAddresses: typeof searchAddresses;
}

/** Swap this out to move to a paid provider. */
export const addressLookup: AddressLookupProvider = {
  lookupPostcode,
  autocompletePostcode,
  searchAddresses,
};
