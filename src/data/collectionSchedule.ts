
import { getRouteForPostalCode, isRestrictedPostalCode } from '@/utils/postalCodeUtils';

// Collection dates by route
const routeSchedules: Record<string, string> = {
  'London North': 'Every Monday',
  'London North West': 'Every Monday',
  'London West': 'Every Tuesday',
  'London South West': 'Every Tuesday',
  'London South East': 'Every Wednesday',
  'London East': 'Every Wednesday',
  'London Central': 'Every Thursday',
  
  // Greater London
  'South London': 'Every Friday',
  'East London': 'Every Friday',
  'North London': 'Every Saturday',
  'West London': 'Every Saturday',
  
  // Rest of UK
  'Birmingham': 'First Monday of the month',
  'Cardiff': 'Second Monday of the month',
  'Chester': 'Second Monday of the month',
  'Coventry': 'First Tuesday of the month',
  'Glasgow': 'Third Monday of the month',
  'Liverpool': 'Second Tuesday of the month',
  'Manchester': 'Second Tuesday of the month',
  'Nottingham': 'First Wednesday of the month',
  'Oxford': 'First Thursday of the month',
  'Sheffield': 'Second Wednesday of the month',
};

// Get collection date by route
export const getDateByRoute = (route: string): string | null => {
  return routeSchedules[route] || null;
};

// Get collection date by postcode
export const getDateByPostcode = (postcode: string): string | null => {
  const route = getRouteForPostalCode(postcode);
  if (!route) return null;
  return routeSchedules[route] || null;
};

// Check if postcode is serviced
export const isServicedPostcode = (postcode: string): boolean => {
  return !isRestrictedPostalCode(postcode) && getRouteForPostalCode(postcode) !== null;
};
