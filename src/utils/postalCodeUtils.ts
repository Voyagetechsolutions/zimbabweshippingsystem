
/**
 * UK Postal Code validation utilities
 */

// Map of postal code prefixes to routes for England
export const postalCodeToRouteMap: Record<string, string> = {
  // London area
  'EC': 'LONDON ROUTE',
  'WC': 'LONDON ROUTE',
  'N': 'LONDON ROUTE',
  'NW': 'LONDON ROUTE',
  'E': 'LONDON ROUTE',
  'SE': 'LONDON ROUTE',
  'SW': 'LONDON ROUTE',
  'W': 'LONDON ROUTE',
  'EN': 'LONDON ROUTE',
  'IG': 'LONDON ROUTE',
  'RM': 'LONDON ROUTE',
  'DA': 'LONDON ROUTE',
  'BR': 'LONDON ROUTE',
  'UB': 'LONDON ROUTE',
  'HA': 'LONDON ROUTE',
  'WD': 'LONDON ROUTE',
  // Birmingham area
  'B': 'BIRMINGHAM ROUTE',
  'CV': 'BIRMINGHAM ROUTE',
  'WV': 'BIRMINGHAM ROUTE',
  'DY': 'BIRMINGHAM ROUTE',
  'WS': 'BIRMINGHAM ROUTE',
  'WR': 'BIRMINGHAM ROUTE',
  'SY': 'BIRMINGHAM ROUTE',
  'TF': 'BIRMINGHAM ROUTE',
  // Manchester area
  'M': 'MANCHESTER ROUTE',
  'L': 'MANCHESTER ROUTE',
  'WA': 'MANCHESTER ROUTE',
  'OL': 'MANCHESTER ROUTE',
  'SK': 'MANCHESTER ROUTE',
  'ST': 'MANCHESTER ROUTE',
  'BB': 'MANCHESTER ROUTE',
  'PR': 'MANCHESTER ROUTE',
  'FY': 'MANCHESTER ROUTE',
  'BL': 'MANCHESTER ROUTE',
  'WN': 'MANCHESTER ROUTE',
  'CW': 'MANCHESTER ROUTE',
  'CH': 'MANCHESTER ROUTE',
  'LL': 'MANCHESTER ROUTE',
  // Leeds area
  'LS': 'LEEDS ROUTE',
  'WF': 'LEEDS ROUTE',
  'HX': 'LEEDS ROUTE',
  'DN': 'LEEDS ROUTE',
  'S': 'LEEDS ROUTE',
  'HD': 'LEEDS ROUTE',
  'YO': 'LEEDS ROUTE',
  'BD': 'LEEDS ROUTE',
  'HG': 'LEEDS ROUTE',
  // Cardiff area
  'CF': 'CARDIFF ROUTE',
  'GL': 'CARDIFF ROUTE',
  'BS': 'CARDIFF ROUTE',
  'SN': 'CARDIFF ROUTE',
  'BA': 'CARDIFF ROUTE',
  'SP': 'CARDIFF ROUTE',
  'NP': 'CARDIFF ROUTE',
  'CP': 'CARDIFF ROUTE',
  'SA': 'CARDIFF ROUTE',  
  // Bournemouth area
  'SO': 'BOURNEMOUTH ROUTE',
  'PO': 'BOURNEMOUTH ROUTE',
  'RG': 'BOURNEMOUTH ROUTE',
  'GU': 'BOURNEMOUTH ROUTE',
  'BH': 'BOURNEMOUTH ROUTE',
  'OX': 'BOURNEMOUTH ROUTE',
  // Nottingham area
  'NG': 'NOTTINGHAM ROUTE',
  'LE': 'NOTTINGHAM ROUTE',
  'DE': 'NOTTINGHAM ROUTE',
  'PE': 'NOTTINGHAM ROUTE',
  'LN': 'NOTTINGHAM ROUTE',
  // Brighton area
  'BN': 'BRIGHTON ROUTE',
  'RH': 'BRIGHTON ROUTE',
  'SL': 'BRIGHTON ROUTE',
  'TN': 'BRIGHTON ROUTE',
  'CT': 'BRIGHTON ROUTE',
  'CR': 'BRIGHTON ROUTE',
  'TW': 'BRIGHTON ROUTE',
  'KT': 'BRIGHTON ROUTE',
  'ME': 'BRIGHTON ROUTE',
  // Southend area
  'NR': 'SOUTHEND ROUTE',
  'IP': 'SOUTHEND ROUTE',
  'CO': 'SOUTHEND ROUTE',
  'CM': 'SOUTHEND ROUTE',
  'CB': 'SOUTHEND ROUTE',
  'SS': 'SOUTHEND ROUTE',
  'SG': 'SOUTHEND ROUTE',
  // Northampton area
  'MK': 'NORTHAMPTON ROUTE',
  'LU': 'NORTHAMPTON ROUTE',
  'AL': 'NORTHAMPTON ROUTE',
  'HP': 'NORTHAMPTON ROUTE',
  'NN': 'NORTHAMPTON ROUTE'
};

// Map of Ireland cities to routes
export const irelandCityToRouteMap: Record<string, string> = {
  // Londonderry Route
  'LARNE': 'LONDONDERRY ROUTE',
  'BALLYCLARE': 'LONDONDERRY ROUTE',
  'BALLYMENA': 'LONDONDERRY ROUTE',
  'BALLYMONEY': 'LONDONDERRY ROUTE',
  'KILREA': 'LONDONDERRY ROUTE',
  'COLERAINE': 'LONDONDERRY ROUTE',
  'LONDONDERRY': 'LONDONDERRY ROUTE',
  'LIFFORD': 'LONDONDERRY ROUTE',
  'OMAGH': 'LONDONDERRY ROUTE',
  'COOKSTOWN': 'LONDONDERRY ROUTE',
  'CARRICKFERGUS': 'LONDONDERRY ROUTE',
  // Belfast Route
  'BELFAST': 'BELFAST ROUTE',
  'BANGOR': 'BELFAST ROUTE',
  'COMBER': 'BELFAST ROUTE',
  'LISBURN': 'BELFAST ROUTE',
  'NEWRY': 'BELFAST ROUTE',
  'NEWTOWNWARDS': 'BELFAST ROUTE',
  'DUNMURRY': 'BELFAST ROUTE',
  'LURGAN': 'BELFAST ROUTE',
  'PORTADOWN': 'BELFAST ROUTE',
  'BANBRIDGE': 'BELFAST ROUTE',
  'MOY': 'BELFAST ROUTE',
  'DUNGANNON': 'BELFAST ROUTE',
  'ARMAGH': 'BELFAST ROUTE',
  // Cavan Route
  'MAYNOOTH': 'CAVAN ROUTE',
  'ASHBOURNE': 'CAVAN ROUTE',
  'SWORDS': 'CAVAN ROUTE',
  'SKERRIES': 'CAVAN ROUTE',
  'DROGHEDA': 'CAVAN ROUTE',
  'DUNDALK': 'CAVAN ROUTE',
  'CAVAN': 'CAVAN ROUTE',
  'VIRGINIA': 'CAVAN ROUTE',
  'KELLS': 'CAVAN ROUTE',
  'NAVAN': 'CAVAN ROUTE',
  'TRIM': 'CAVAN ROUTE',
  // Athlone Route
  'MALIGURAR': 'ATHLONE ROUTE',
  'LONGFORD': 'ATHLONE ROUTE',
  'ROSCOMMON': 'ATHLONE ROUTE',
  'BOYLE': 'ATHLONE ROUTE',
  'SLIGO': 'ATHLONE ROUTE',
  'BALLINA': 'ATHLONE ROUTE',
  'SWINFORD': 'ATHLONE ROUTE',
  'CASTLEBAR': 'ATHLONE ROUTE',
  'TUAM': 'ATHLONE ROUTE',
  'GALWAY': 'ATHLONE ROUTE',
  'ATHENRY': 'ATHLONE ROUTE',
  'ATHLONE': 'ATHLONE ROUTE',
  // Limerick Route
  'NEWBRIDGE': 'LIMERICK ROUTE',
  'PORTLAOISE': 'LIMERICK ROUTE',
  'ROSCREA': 'LIMERICK ROUTE',
  'LIMERICK': 'LIMERICK ROUTE',
  'ENNIS': 'LIMERICK ROUTE',
  'DOOLIN': 'LIMERICK ROUTE',
  'LOUGHREA': 'LIMERICK ROUTE',
  'BALLINASLOE': 'LIMERICK ROUTE',
  'TULLAMORE': 'LIMERICK ROUTE',
  // Dublin City Route
  'SANDFORD': 'DUBLIN CITY ROUTE',
  'RIALTO': 'DUBLIN CITY ROUTE',
  'BALLYMOUNT': 'DUBLIN CITY ROUTE',
  'CABRA': 'DUBLIN CITY ROUTE',
  'BEAUMONT': 'DUBLIN CITY ROUTE',
  'MALAHIDE': 'DUBLIN CITY ROUTE',
  'PORTMARNOCK': 'DUBLIN CITY ROUTE',
  'DALKEY': 'DUBLIN CITY ROUTE',
  'SHANKILL': 'DUBLIN CITY ROUTE',
  'BRAY': 'DUBLIN CITY ROUTE',
  'DUBLIN': 'DUBLIN CITY ROUTE',
  // Cork Route
  'CASHEL': 'CORK ROUTE',
  'FERMOY': 'CORK ROUTE',
  'CORK': 'CORK ROUTE',
  'DUNGARVAN': 'CORK ROUTE',
  'WATERFORD': 'CORK ROUTE',
  'NEW ROSS': 'CORK ROUTE',
  'WEXFORD': 'CORK ROUTE',
  'GOREY': 'CORK ROUTE',
  'GREYSTONES': 'CORK ROUTE'
};

// List of Ireland cities for dropdown (grouped by route)
export const irelandCities: { city: string; route: string }[] = [
  // Londonderry Route
  { city: 'Larne', route: 'LONDONDERRY ROUTE' },
  { city: 'Ballyclare', route: 'LONDONDERRY ROUTE' },
  { city: 'Ballymena', route: 'LONDONDERRY ROUTE' },
  { city: 'Ballymoney', route: 'LONDONDERRY ROUTE' },
  { city: 'Kilrea', route: 'LONDONDERRY ROUTE' },
  { city: 'Coleraine', route: 'LONDONDERRY ROUTE' },
  { city: 'Londonderry', route: 'LONDONDERRY ROUTE' },
  { city: 'Lifford', route: 'LONDONDERRY ROUTE' },
  { city: 'Omagh', route: 'LONDONDERRY ROUTE' },
  { city: 'Cookstown', route: 'LONDONDERRY ROUTE' },
  { city: 'Carrickfergus', route: 'LONDONDERRY ROUTE' },
  // Belfast Route
  { city: 'Belfast', route: 'BELFAST ROUTE' },
  { city: 'Bangor', route: 'BELFAST ROUTE' },
  { city: 'Comber', route: 'BELFAST ROUTE' },
  { city: 'Lisburn', route: 'BELFAST ROUTE' },
  { city: 'Newry', route: 'BELFAST ROUTE' },
  { city: 'Newtownwards', route: 'BELFAST ROUTE' },
  { city: 'Dunmurry', route: 'BELFAST ROUTE' },
  { city: 'Lurgan', route: 'BELFAST ROUTE' },
  { city: 'Portadown', route: 'BELFAST ROUTE' },
  { city: 'Banbridge', route: 'BELFAST ROUTE' },
  { city: 'Moy', route: 'BELFAST ROUTE' },
  { city: 'Dungannon', route: 'BELFAST ROUTE' },
  { city: 'Armagh', route: 'BELFAST ROUTE' },
  // Cavan Route
  { city: 'Maynooth', route: 'CAVAN ROUTE' },
  { city: 'Ashbourne', route: 'CAVAN ROUTE' },
  { city: 'Swords', route: 'CAVAN ROUTE' },
  { city: 'Skerries', route: 'CAVAN ROUTE' },
  { city: 'Drogheda', route: 'CAVAN ROUTE' },
  { city: 'Dundalk', route: 'CAVAN ROUTE' },
  { city: 'Cavan', route: 'CAVAN ROUTE' },
  { city: 'Virginia', route: 'CAVAN ROUTE' },
  { city: 'Kells', route: 'CAVAN ROUTE' },
  { city: 'Navan', route: 'CAVAN ROUTE' },
  { city: 'Trim', route: 'CAVAN ROUTE' },
  // Athlone Route
  { city: 'Maligurar', route: 'ATHLONE ROUTE' },
  { city: 'Longford', route: 'ATHLONE ROUTE' },
  { city: 'Roscommon', route: 'ATHLONE ROUTE' },
  { city: 'Boyle', route: 'ATHLONE ROUTE' },
  { city: 'Sligo', route: 'ATHLONE ROUTE' },
  { city: 'Ballina', route: 'ATHLONE ROUTE' },
  { city: 'Swinford', route: 'ATHLONE ROUTE' },
  { city: 'Castlebar', route: 'ATHLONE ROUTE' },
  { city: 'Tuam', route: 'ATHLONE ROUTE' },
  { city: 'Galway', route: 'ATHLONE ROUTE' },
  { city: 'Athenry', route: 'ATHLONE ROUTE' },
  { city: 'Athlone', route: 'ATHLONE ROUTE' },
  // Limerick Route
  { city: 'Newbridge', route: 'LIMERICK ROUTE' },
  { city: 'Portlaoise', route: 'LIMERICK ROUTE' },
  { city: 'Roscrea', route: 'LIMERICK ROUTE' },
  { city: 'Limerick', route: 'LIMERICK ROUTE' },
  { city: 'Ennis', route: 'LIMERICK ROUTE' },
  { city: 'Doolin', route: 'LIMERICK ROUTE' },
  { city: 'Loughrea', route: 'LIMERICK ROUTE' },
  { city: 'Ballinasloe', route: 'LIMERICK ROUTE' },
  { city: 'Tullamore', route: 'LIMERICK ROUTE' },
  // Dublin City Route
  { city: 'Sandford', route: 'DUBLIN CITY ROUTE' },
  { city: 'Rialto', route: 'DUBLIN CITY ROUTE' },
  { city: 'Ballymount', route: 'DUBLIN CITY ROUTE' },
  { city: 'Cabra', route: 'DUBLIN CITY ROUTE' },
  { city: 'Beaumont', route: 'DUBLIN CITY ROUTE' },
  { city: 'Malahide', route: 'DUBLIN CITY ROUTE' },
  { city: 'Portmarnock', route: 'DUBLIN CITY ROUTE' },
  { city: 'Dalkey', route: 'DUBLIN CITY ROUTE' },
  { city: 'Shankill', route: 'DUBLIN CITY ROUTE' },
  { city: 'Bray', route: 'DUBLIN CITY ROUTE' },
  // Cork Route
  { city: 'Portlaoise', route: 'CORK ROUTE' },
  { city: 'Cashel', route: 'CORK ROUTE' },
  { city: 'Fermoy', route: 'CORK ROUTE' },
  { city: 'Cork', route: 'CORK ROUTE' },
  { city: 'Dungarvan', route: 'CORK ROUTE' },
  { city: 'Waterford', route: 'CORK ROUTE' },
  { city: 'New Ross', route: 'CORK ROUTE' },
  { city: 'Wexford', route: 'CORK ROUTE' },
  { city: 'Gorey', route: 'CORK ROUTE' },
  { city: 'Greystones', route: 'CORK ROUTE' },
];

// List of restricted postal codes
export const restrictedPostalCodes: string[] = [
  'EX', 'TQ', 'DT', 'LD', 'HR', 'IP', 'NR', 'HU',
  'TS', 'DL', 'SR', 'CA', 'NE', 'TD', 'EH', 'ML',
  'KA', 'DG', 'G', 'DH', 'KY', 'PA', 'IV', 'AB', 'DD'
];

// Check if a postal code matches the required format (starts with 1-2 letters followed by numbers)
export const isValidUKPostcode = (postcode: string): boolean => {
  // Updated UK postcode validation: 
  // Should start with 1-2 letters, or 1 letter followed by 1 number
  const regex = /^[A-Z]{1,2}[0-9]/i;
  return regex.test(postcode.trim());
};

// Format a postcode to standard UK format
export const formatUKPostcode = (postcode: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  const cleanPostcode = postcode.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return cleanPostcode;
};

// Get the outward part of the postcode (the first part)
export const getOutwardPostcode = (postcode: string): string => {
  const cleanPostcode = formatUKPostcode(postcode);
  // The outward code is everything before the last 3 characters
  return cleanPostcode.slice(0, -3);
};

// Get the inward part of the postcode (the last part)
export const getInwardPostcode = (postcode: string): string => {
  const cleanPostcode = formatUKPostcode(postcode);
  // The inward code is the last 3 characters
  return cleanPostcode.slice(-3);
};

// Determine the route for a UK postal code
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
  const prefix = formattedCode.match(/^[A-Z]{1,2}/i);
  if (!prefix) return null;
  
  // Look up the route based on the prefix
  return postalCodeToRouteMap[prefix[0]] || null;
};

// Determine the route for an Ireland city
export const getIrelandRouteForCity = (city: string): string | null => {
  if (!city) return null;
  
  // Clean and format city name
  const formattedCity = city.trim().toUpperCase();
  
  // Look up the route based on the city
  return irelandCityToRouteMap[formattedCity] || null;
};
