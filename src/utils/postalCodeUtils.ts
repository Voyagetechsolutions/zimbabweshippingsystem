
/**
 * UK Postal Code and Ireland City validation utilities
 * UK routes are fetched from database, Ireland uses city-based routing
 */

import { supabase } from '@/integrations/supabase/client';

// Cache for database routes
let cachedUKRoutes: { postcodePrefix: string; route: string; pickupDate: string }[] = [];
let cachedIrelandRoutes: { city: string; route: string; pickupDate: string }[] = [];
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fallback map of postal code prefixes to routes for England (used if database is empty)
export const postalCodeToRouteMap: Record<string, string> = {
  // London area
  'EC': 'LONDON',
  'WC': 'LONDON',
  'N': 'LONDON',
  'NW': 'LONDON',
  'E': 'LONDON',
  'SE': 'LONDON',
  'SW': 'LONDON',
  'W': 'LONDON',
  'EN': 'LONDON',
  'IG': 'LONDON',
  'RM': 'LONDON',
  'DA': 'LONDON',
  'BR': 'LONDON',
  'UB': 'LONDON',
  'HA': 'LONDON',
  'WD': 'LONDON',
  // Birmingham area
  'B': 'BIRMINGHAM',
  'CV': 'BIRMINGHAM',
  'WV': 'BIRMINGHAM',
  'DY': 'BIRMINGHAM',
  'WS': 'BIRMINGHAM',
  'WR': 'BIRMINGHAM',
  'SY': 'BIRMINGHAM',
  'TF': 'BIRMINGHAM',
  // Manchester area
  'M': 'MANCHESTER',
  'L': 'MANCHESTER',
  'WA': 'MANCHESTER',
  'OL': 'MANCHESTER',
  'SK': 'MANCHESTER',
  'ST': 'MANCHESTER',
  'BB': 'MANCHESTER',
  'PR': 'MANCHESTER',
  'FY': 'MANCHESTER',
  'BL': 'MANCHESTER',
  'WN': 'MANCHESTER',
  'CW': 'MANCHESTER',
  'CH': 'MANCHESTER',
  'LL': 'MANCHESTER',
  // Leeds area
  'LS': 'LEEDS',
  'WF': 'LEEDS',
  'HX': 'LEEDS',
  'DN': 'LEEDS',
  'S': 'LEEDS',
  'HD': 'LEEDS',
  'YO': 'LEEDS',
  'BD': 'LEEDS',
  'HG': 'LEEDS',
  // Cardiff area
  'CF': 'CARDIFF',
  'GL': 'CARDIFF',
  'BS': 'CARDIFF',
  'SN': 'CARDIFF',
  'BA': 'CARDIFF',
  'SP': 'CARDIFF',
  'NP': 'CARDIFF',
  'CP': 'CARDIFF',
  'SA': 'CARDIFF',
  // Bournemouth area
  'SO': 'BOURNEMOUTH',
  'PO': 'BOURNEMOUTH',
  'RG': 'BOURNEMOUTH',
  'GU': 'BOURNEMOUTH',
  'BH': 'BOURNEMOUTH',
  'OX': 'BOURNEMOUTH',
  // Nottingham area
  'NG': 'NOTTINGHAM',
  'LE': 'NOTTINGHAM',
  'DE': 'NOTTINGHAM',
  'PE': 'NOTTINGHAM',
  'LN': 'NOTTINGHAM',
  // Brighton area
  'BN': 'BRIGHTON',
  'RH': 'BRIGHTON',
  'SL': 'BRIGHTON',
  'TN': 'BRIGHTON',
  'CT': 'BRIGHTON',
  'CR': 'BRIGHTON',
  'TW': 'BRIGHTON',
  'KT': 'BRIGHTON',
  'ME': 'BRIGHTON',
  // Southend area
  'NR': 'SOUTHEND',
  'IP': 'SOUTHEND',
  'CO': 'SOUTHEND',
  'CM': 'SOUTHEND',
  'CB': 'SOUTHEND',
  'SS': 'SOUTHEND',
  'SG': 'SOUTHEND',
  // Northampton area
  'MK': 'NORTHAMPTON',
  'LU': 'NORTHAMPTON',
  'AL': 'NORTHAMPTON',
  'HP': 'NORTHAMPTON',
  'NN': 'NORTHAMPTON'
};

// Map of Ireland cities to routes (Ireland doesn't use postal codes)
export const irelandCityToRouteMap: Record<string, string> = {
  // Londonderry Route
  'LARNE': 'LONDONDERRY',
  'BALLYCLARE': 'LONDONDERRY',
  'BALLYMENA': 'LONDONDERRY',
  'BALLYMONEY': 'LONDONDERRY',
  'KILREA': 'LONDONDERRY',
  'COLERAINE': 'LONDONDERRY',
  'LONDONDERRY': 'LONDONDERRY',
  'LIFFORD': 'LONDONDERRY',
  'OMAGH': 'LONDONDERRY',
  'COOKSTOWN': 'LONDONDERRY',
  'CARRICKFERGUS': 'LONDONDERRY',
  // Belfast Route
  'BELFAST': 'BELFAST',
  'BANGOR': 'BELFAST',
  'COMBER': 'BELFAST',
  'LISBURN': 'BELFAST',
  'NEWRY': 'BELFAST',
  'NEWTOWNWARDS': 'BELFAST',
  'DUNMURRY': 'BELFAST',
  'LURGAN': 'BELFAST',
  'PORTADOWN': 'BELFAST',
  'BANBRIDGE': 'BELFAST',
  'MOY': 'BELFAST',
  'DUNGANNON': 'BELFAST',
  'ARMAGH': 'BELFAST',
  // Cavan Route
  'MAYNOOTH': 'CAVAN',
  'ASHBOURNE': 'CAVAN',
  'SWORDS': 'CAVAN',
  'SKERRIES': 'CAVAN',
  'DROGHEDA': 'CAVAN',
  'DUNDALK': 'CAVAN',
  'CAVAN': 'CAVAN',
  'VIRGINIA': 'CAVAN',
  'KELLS': 'CAVAN',
  'NAVAN': 'CAVAN',
  'TRIM': 'CAVAN',
  // Athlone Route
  'MULLINGAR': 'ATHLONE',
  'LONGFORD': 'ATHLONE',
  'ROSCOMMON': 'ATHLONE',
  'BOYLE': 'ATHLONE',
  'SLIGO': 'ATHLONE',
  'BALLINA': 'ATHLONE',
  'SWINFORD': 'ATHLONE',
  'CASTLEBAR': 'ATHLONE',
  'TUAM': 'ATHLONE',
  'GALWAY': 'ATHLONE',
  'ATHENRY': 'ATHLONE',
  'ATHLONE': 'ATHLONE',
  // Limerick Route
  'NEWBRIDGE': 'LIMERICK',
  'PORTLAOISE': 'LIMERICK',
  'ROSCREA': 'LIMERICK',
  'LIMERICK': 'LIMERICK',
  'ENNIS': 'LIMERICK',
  'DOOLIN': 'LIMERICK',
  'LOUGHREA': 'LIMERICK',
  'BALLINASLOE': 'LIMERICK',
  'TULLAMORE': 'LIMERICK',
  // Dublin City Route
  'SANDYFORD': 'DUBLIN CITY',
  'RIALTO': 'DUBLIN CITY',
  'BALLYMOUNT': 'DUBLIN CITY',
  'CABRA': 'DUBLIN CITY',
  'BEAUMONT': 'DUBLIN CITY',
  'MALAHIDE': 'DUBLIN CITY',
  'PORTMARNOCK': 'DUBLIN CITY',
  'DALKEY': 'DUBLIN CITY',
  'SHANKILL': 'DUBLIN CITY',
  'BRAY': 'DUBLIN CITY',
  'DUBLIN': 'DUBLIN CITY',
  // Cork Route
  'CASHEL': 'CORK',
  'FERMOY': 'CORK',
  'CORK': 'CORK',
  'DUNGARVAN': 'CORK',
  'WATERFORD': 'CORK',
  'NEW ROSS': 'CORK',
  'WEXFORD': 'CORK',
  'GOREY': 'CORK',
  'GREYSTONES': 'CORK'
};

// List of Ireland cities for dropdown (grouped by route)
export const irelandCities: { city: string; route: string }[] = [
  // Londonderry Route
  { city: 'Larne', route: 'LONDONDERRY' },
  { city: 'Ballyclare', route: 'LONDONDERRY' },
  { city: 'Ballymena', route: 'LONDONDERRY' },
  { city: 'Ballymoney', route: 'LONDONDERRY' },
  { city: 'Kilrea', route: 'LONDONDERRY' },
  { city: 'Coleraine', route: 'LONDONDERRY' },
  { city: 'Londonderry', route: 'LONDONDERRY' },
  { city: 'Lifford', route: 'LONDONDERRY' },
  { city: 'Omagh', route: 'LONDONDERRY' },
  { city: 'Cookstown', route: 'LONDONDERRY' },
  { city: 'Carrickfergus', route: 'LONDONDERRY' },
  // Belfast Route
  { city: 'Belfast', route: 'BELFAST' },
  { city: 'Bangor', route: 'BELFAST' },
  { city: 'Comber', route: 'BELFAST' },
  { city: 'Lisburn', route: 'BELFAST' },
  { city: 'Newry', route: 'BELFAST' },
  { city: 'Newtownwards', route: 'BELFAST' },
  { city: 'Dunmurry', route: 'BELFAST' },
  { city: 'Lurgan', route: 'BELFAST' },
  { city: 'Portadown', route: 'BELFAST' },
  { city: 'Banbridge', route: 'BELFAST' },
  { city: 'Moy', route: 'BELFAST' },
  { city: 'Dungannon', route: 'BELFAST' },
  { city: 'Armagh', route: 'BELFAST' },
  // Cavan Route
  { city: 'Maynooth', route: 'CAVAN' },
  { city: 'Ashbourne', route: 'CAVAN' },
  { city: 'Swords', route: 'CAVAN' },
  { city: 'Skerries', route: 'CAVAN' },
  { city: 'Drogheda', route: 'CAVAN' },
  { city: 'Dundalk', route: 'CAVAN' },
  { city: 'Cavan', route: 'CAVAN' },
  { city: 'Virginia', route: 'CAVAN' },
  { city: 'Kells', route: 'CAVAN' },
  { city: 'Navan', route: 'CAVAN' },
  { city: 'Trim', route: 'CAVAN' },
  // Athlone Route
  { city: 'Mullingar', route: 'ATHLONE' },
  { city: 'Longford', route: 'ATHLONE' },
  { city: 'Roscommon', route: 'ATHLONE' },
  { city: 'Boyle', route: 'ATHLONE' },
  { city: 'Sligo', route: 'ATHLONE' },
  { city: 'Ballina', route: 'ATHLONE' },
  { city: 'Swinford', route: 'ATHLONE' },
  { city: 'Castlebar', route: 'ATHLONE' },
  { city: 'Tuam', route: 'ATHLONE' },
  { city: 'Galway', route: 'ATHLONE' },
  { city: 'Athenry', route: 'ATHLONE' },
  { city: 'Athlone', route: 'ATHLONE' },
  // Limerick Route
  { city: 'Newbridge', route: 'LIMERICK' },
  { city: 'Portlaoise', route: 'LIMERICK' },
  { city: 'Roscrea', route: 'LIMERICK' },
  { city: 'Limerick', route: 'LIMERICK' },
  { city: 'Ennis', route: 'LIMERICK' },
  { city: 'Doolin', route: 'LIMERICK' },
  { city: 'Loughrea', route: 'LIMERICK' },
  { city: 'Ballinasloe', route: 'LIMERICK' },
  { city: 'Tullamore', route: 'LIMERICK' },
  // Dublin City Route
  { city: 'Sandyford', route: 'DUBLIN CITY' },
  { city: 'Rialto', route: 'DUBLIN CITY' },
  { city: 'Ballymount', route: 'DUBLIN CITY' },
  { city: 'Cabra', route: 'DUBLIN CITY' },
  { city: 'Beaumont', route: 'DUBLIN CITY' },
  { city: 'Malahide', route: 'DUBLIN CITY' },
  { city: 'Portmarnock', route: 'DUBLIN CITY' },
  { city: 'Dalkey', route: 'DUBLIN CITY' },
  { city: 'Shankill', route: 'DUBLIN CITY' },
  { city: 'Bray', route: 'DUBLIN CITY' },
  { city: 'Dublin', route: 'DUBLIN CITY' },
  // Cork Route
  { city: 'Cashel', route: 'CORK' },
  { city: 'Fermoy', route: 'CORK' },
  { city: 'Cork', route: 'CORK' },
  { city: 'Dungarvan', route: 'CORK' },
  { city: 'Waterford', route: 'CORK' },
  { city: 'New Ross', route: 'CORK' },
  { city: 'Wexford', route: 'CORK' },
  { city: 'Gorey', route: 'CORK' },
  { city: 'Greystones', route: 'CORK' },
];

// List of restricted postal codes (areas we don't service)
export const restrictedPostalCodes: string[] = [
  'EX', 'TQ', 'DT', 'LD', 'HR', 'HU',
  'TS', 'DL', 'SR', 'CA', 'NE', 'TD', 'EH', 'ML',
  'KA', 'DG', 'G', 'DH', 'KY', 'PA', 'IV', 'AB', 'DD'
];

/**
 * Fetch routes from database and cache them
 */
export const fetchRoutesFromDatabase = async (): Promise<void> => {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedUKRoutes.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from('collection_schedules')
      .select('*')
      .order('route', { ascending: true });

    if (error) throw error;

    // Process UK routes (England)
    cachedUKRoutes = [];
    cachedIrelandRoutes = [];

    (data || []).forEach((schedule: any) => {
      const route = schedule.route;
      const pickupDate = schedule.pickup_date || 'Not set';
      const country = schedule.country || 'England';

      if (country === 'England') {
        // Extract postcodes from areas (stored as "Postcodes: SW1, SW2, ...")
        const postcodesEntry = schedule.areas.find((a: string) => a.startsWith('Postcodes:'));
        if (postcodesEntry) {
          const postcodes = postcodesEntry.replace('Postcodes: ', '').split(',').map((p: string) => p.trim());
          postcodes.forEach((postcode: string) => {
            if (postcode) {
              cachedUKRoutes.push({
                postcodePrefix: postcode.toUpperCase(),
                route: route,
                pickupDate: pickupDate
              });
            }
          });
        }
      } else if (country === 'Ireland') {
        // Extract cities from areas (excluding postcodes entries)
        const cities = schedule.areas.filter((a: string) => !a.startsWith('Postcodes:'));
        cities.forEach((city: string) => {
          cachedIrelandRoutes.push({
            city: city.toUpperCase(),
            route: route,
            pickupDate: pickupDate
          });
        });
      }
    });

    cacheTimestamp = now;
    console.log('Routes loaded from database:', {
      ukRoutes: cachedUKRoutes.length,
      irelandRoutes: cachedIrelandRoutes.length
    });
  } catch (error) {
    console.error('Error fetching routes from database:', error);
  }
};

/**
 * Clear the route cache (call when routes are updated in admin)
 */
export const clearRouteCache = (): void => {
  cachedUKRoutes = [];
  cachedIrelandRoutes = [];
  cacheTimestamp = 0;
};

/**
 * Get Ireland cities from database (with fallback to hardcoded list)
 */
export const getIrelandCitiesFromDatabase = async (): Promise<{ city: string; route: string }[]> => {
  await fetchRoutesFromDatabase();

  if (cachedIrelandRoutes.length > 0) {
    // Convert cached routes to city list format
    return cachedIrelandRoutes.map(r => ({
      city: r.city.charAt(0) + r.city.slice(1).toLowerCase(),
      route: r.route
    }));
  }

  // Fallback to hardcoded list
  return irelandCities;
};

// Check if a postal code matches the required format (starts with 1-2 letters followed by numbers)
export const isValidUKPostcode = (postcode: string): boolean => {
  const regex = /^[A-Z]{1,2}[0-9]/i;
  return regex.test(postcode.trim());
};

// Format a postcode to standard UK format
export const formatUKPostcode = (postcode: string): string => {
  const cleanPostcode = postcode.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return cleanPostcode;
};

// Get the outward part of the postcode (the first part)
export const getOutwardPostcode = (postcode: string): string => {
  const cleanPostcode = formatUKPostcode(postcode);
  return cleanPostcode.slice(0, -3);
};

// Get the inward part of the postcode (the last part)
export const getInwardPostcode = (postcode: string): string => {
  const cleanPostcode = formatUKPostcode(postcode);
  return cleanPostcode.slice(-3);
};

/**
 * Determine the route for a UK postal code
 * First checks database cache, then falls back to hardcoded map
 */
export const getRouteForPostalCode = (postalCode: string): string | null => {
  if (!postalCode) return null;

  // Format and clean the postal code
  const formattedCode = formatUKPostcode(postalCode);

  // Check if it's a restricted postal code
  for (const restrictedCode of restrictedPostalCodes) {
    if (formattedCode.startsWith(restrictedCode)) {
      return null;
    }
  }

  // Extract the prefix (first 1-2 letters)
  const prefixMatch = formattedCode.match(/^[A-Z]{1,2}/i);
  if (!prefixMatch) return null;

  const prefix = prefixMatch[0].toUpperCase();

  // First, check database cache for exact match
  if (cachedUKRoutes.length > 0) {
    // Try to find exact prefix match first (e.g., "SW1" before "SW")
    const exactMatch = cachedUKRoutes.find(r =>
      formattedCode.startsWith(r.postcodePrefix)
    );
    if (exactMatch) return exactMatch.route;

    // Try prefix match
    const prefixMatches = cachedUKRoutes.filter(r =>
      prefix === r.postcodePrefix || r.postcodePrefix.startsWith(prefix) || prefix.startsWith(r.postcodePrefix)
    );
    if (prefixMatches.length > 0) {
      // Return the most specific match
      const sorted = prefixMatches.sort((a, b) => b.postcodePrefix.length - a.postcodePrefix.length);
      return sorted[0].route;
    }
  }

  // Fallback to hardcoded map
  return postalCodeToRouteMap[prefix] || null;
};

/**
 * Determine the route for an Ireland city
 * First checks database cache, then falls back to hardcoded map
 */
export const getIrelandRouteForCity = (city: string): string | null => {
  if (!city) return null;

  // Clean and format city name
  const formattedCity = city.trim().toUpperCase();

  // First, check database cache
  if (cachedIrelandRoutes.length > 0) {
    const match = cachedIrelandRoutes.find(r =>
      r.city === formattedCity || r.city.includes(formattedCity) || formattedCity.includes(r.city)
    );
    if (match) return match.route;
  }

  // Fallback to hardcoded map
  return irelandCityToRouteMap[formattedCity] || null;
};

/**
 * Get the pickup date for a route
 */
export const getPickupDateForRoute = async (routeName: string, isIreland: boolean): Promise<string | null> => {
  await fetchRoutesFromDatabase();

  const routes = isIreland ? cachedIrelandRoutes : cachedUKRoutes;
  const match = routes.find(r => r.route === routeName || r.route === routeName.replace(' ROUTE', ''));

  if (match && match.pickupDate !== 'Not set') {
    return match.pickupDate;
  }

  // Fallback: fetch directly from database
  try {
    const { data, error } = await supabase
      .from('collection_schedules')
      .select('pickup_date')
      .eq('route', routeName)
      .single();

    if (!error && data) {
      return data.pickup_date;
    }

    // Try without " ROUTE" suffix
    const { data: data2, error: error2 } = await supabase
      .from('collection_schedules')
      .select('pickup_date')
      .eq('route', routeName.replace(' ROUTE', ''))
      .single();

    if (!error2 && data2) {
      return data2.pickup_date;
    }
  } catch (error) {
    console.error('Error fetching pickup date:', error);
  }

  return null;
};

/**
 * Initialize route cache (call on app startup or when booking form loads)
 */
export const initializeRouteCache = async (): Promise<void> => {
  await fetchRoutesFromDatabase();
};
