
/**
 * Utility functions for working with UK postal codes
 */

// Extract area from the postcode
export const getAreasFromPostalCode = (postcode: string): string[] => {
  // Extract the first part of the postcode (e.g., "SW" from "SW1A 1AA")
  const prefix = postcode.trim().toUpperCase().split(' ')[0].replace(/[0-9]/g, '');
  
  // Map of postcode prefixes to areas
  const areaMap: Record<string, string[]> = {
    'N': ['North London'],
    'NW': ['North West London'],
    'W': ['West London'],
    'SW': ['South West London'],
    'SE': ['South East London'],
    'E': ['East London'],
    'EC': ['East Central London'],
    'WC': ['West Central London'],
    'BR': ['Bromley'],
    'CR': ['Croydon'],
    'DA': ['Dartford'],
    'EN': ['Enfield'],
    'HA': ['Harrow'],
    'IG': ['Ilford'],
    'KT': ['Kingston upon Thames'],
    'RM': ['Romford'],
    'SM': ['Sutton'],
    'TW': ['Twickenham'],
    'UB': ['Southall', 'Uxbridge'],
    'WD': ['Watford'],
    // Add more mappings as needed
  };
  
  return areaMap[prefix] || ['Area not specified'];
};

// Get the route for a given postal code
export const getRouteForPostalCode = (postcode: string): string | null => {
  if (!postcode) return null;
  
  // Normalize postcode
  const normalizedPostcode = postcode.trim().toUpperCase();
  
  // Extract the first part of the postcode (e.g., "SW" from "SW1A 1AA")
  const prefix = normalizedPostcode.split(' ')[0].replace(/[0-9]/g, '');
  
  // Map postal code prefixes to routes
  const routeMap: Record<string, string> = {
    // London
    'N': 'London North',
    'NW': 'London North West',
    'W': 'London West',
    'SW': 'London South West',
    'SE': 'London South East',
    'E': 'London East',
    'EC': 'London Central',
    'WC': 'London Central',
    
    // Greater London
    'BR': 'South London',
    'CR': 'South London',
    'DA': 'East London',
    'EN': 'North London',
    'HA': 'North West London',
    'IG': 'East London',
    'KT': 'South West London',
    'RM': 'East London',
    'SM': 'South London',
    'TW': 'West London',
    'UB': 'West London',
    'WD': 'North London',
    
    // Rest of UK - sample data
    'B': 'Birmingham',
    'CF': 'Cardiff',
    'CH': 'Chester',
    'CV': 'Coventry',
    'G': 'Glasgow',
    'L': 'Liverpool',
    'M': 'Manchester',
    'NG': 'Nottingham',
    'OX': 'Oxford',
    'S': 'Sheffield',
    // Add more routes as needed
  };
  
  return routeMap[prefix] || null;
};

// Check if a postal code is in a restricted area
export const isRestrictedPostalCode = (postcode: string): boolean => {
  if (!postcode) return false;
  
  // Normalize postcode
  const normalizedPostcode = postcode.trim().toUpperCase();
  
  // List of restricted area prefixes
  const restrictedPrefixes = [
    'EX', 'TQ', 'DT', 'SA',  // South West
    'LD', 'HR', 'IP', 'NR',  // Wales & East Anglia
    'HU', 'TS', 'DL', 'SR',  // North East
    'DH', 'CA', 'NE', 'TD',  // North & Borders
    'EH', 'ML', 'KA', 'DG',  // Scotland South
    'G', 'KY', 'PA', 'IV',   // Scotland Central & Highlands
    'AB', 'DD'               // Scotland North East
  ];
  
  // Check if the postcode starts with any of the restricted prefixes
  return restrictedPrefixes.some(prefix => normalizedPostcode.startsWith(prefix));
};

// Get the outward code (first part of postcode)
export const getOutwardCode = (postcode: string): string => {
  const parts = postcode.trim().toUpperCase().split(' ');
  return parts[0];
};

// Get the inward code (second part of postcode)
export const getInwardCode = (postcode: string): string | null => {
  const parts = postcode.trim().toUpperCase().split(' ');
  return parts.length > 1 ? parts[1] : null;
};

// Validate a UK postcode format
export const isValidUKPostcode = (postcode: string): boolean => {
  // UK postcode regex pattern
  const postcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return postcodePattern.test(postcode.trim());
};
