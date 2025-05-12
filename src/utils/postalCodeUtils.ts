
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
  // London Derry Route
  'LARNE': 'LONDON DERRY ROUTE',
  'BALLYCLARE': 'LONDON DERRY ROUTE',
  'BALLYMENA': 'LONDON DERRY ROUTE',
  'BALLYMONEY': 'LONDON DERRY ROUTE',
  'KILERA': 'LONDON DERRY ROUTE',
  'COLERAINE': 'LONDON DERRY ROUTE',
  'LONDONDERRY': 'LONDON DERRY ROUTE',
  'LIFFORD': 'LONDON DERRY ROUTE',
  'OMAGH': 'LONDON DERRY ROUTE',
  'COOKSTOWN': 'LONDON DERRY ROUTE',
  'CARRICKFERGUS': 'LONDON DERRY ROUTE',
  // Belfast Route
  'BELFAST': 'BELFAST ROUTE',
  'BANGOR': 'BELFAST ROUTE',
  'COMBER': 'BELFAST ROUTE',
  'LISBURN': 'BELFAST ROUTE',
  'NEWRY': 'BELFAST ROUTE',
  'NEWTOWNARDS': 'BELFAST ROUTE',
  'DUNMURRY': 'BELFAST ROUTE',
  'LURGAN': 'BELFAST ROUTE',
  'PORTADOWN': 'BELFAST ROUTE',
  'BANBRIDGE': 'BELFAST ROUTE',
  'MOY': 'BELFAST ROUTE',
  'DUNGANNON': 'BELFAST ROUTE',
  'ARMAGH': 'ARMAGH ROUTE',
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
  'NAVAN': 'NAVAN ROUTE',
  'TRIM': 'TRIM ROUTE',
  // Athlone Route
  'MALIGURAR': 'ATHLONE ROUTE',
  'LONGFORD': 'ATHLONE ROUTE',
  'ROSECOMMON': 'ATHLONE ROUTE',
  'BOYLE': 'ATHLONE ROUTE',
  'SLIGO': 'SLIGO ROUTE',
  'BALLINA': 'BALLINA ROUTE',
  'SWINFORD': 'SWINFORD ROUTE',
  'CASTLEBAR': 'CASTLEBAR ROUTE',
  'TAURM': 'ATHLONE ROUTE',
  'GALWAY': 'GALWAY ROUTE',
  'ATERNY': 'ATHLONE ROUTE',
  'ATHLONE': 'ATHLONE ROUTE',
  // Limerick Route
  'NEWBRIDGE': 'LIMERICK ROUTE',
  'PORTLAOISE': 'LIMERICK ROUTE',
  'ROSCREA': 'ROSCREA ROUTE',
  'LIMERICK': 'LIMERICK ROUTE',
  'ENNIS': 'ENNIS ROUTE',
  'DOOLIN': 'DOOLIN ROUTE',
  'LOUGHREA': 'LOUGHREA ROUTE',
  'BALLINASLOE': 'BALLINASLOE ROUTE',
  'TULLAMORE': 'TULLAMORE ROUTE',
  // Dublin City Route
  'SANDFORD': 'DUBLIN CITY ROUTE',
  'RIATO': 'DUBLIN CITY ROUTE',
  'BALLYMOUNT': 'DUBLIN CITY ROUTE',
  'CABRA': 'DUBLIN CITY ROUTE',
  'BEAUMONT': 'DUBLIN CITY ROUTE',
  'MALAHIDE': 'MALAHIDE ROUTE',
  'PORTMANOCK': 'PORTMANOCK ROUTE',
  'DALKEY': 'DALKEY ROUTE',
  'SHANDKILL': 'SHANDKILL ROUTE',
  'BRAY': 'BRAY ROUTE',
  'DUBLIN': 'DUBLIN CITY ROUTE',
  // Cork Route
  'PORTALOUSE': 'CORK ROUTE',
  'CASHEL': 'CASHEL ROUTE',
  'FERMOY': 'FERMOY ROUTE',
  'CORK': 'CORK ROUTE',
  'DUNGARVEAN': 'CORK ROUTE',
  'WATERFORD': 'WATERFORD ROUTE',
  'NEW ROSS': 'NEW ROSS ROUTE',
  'WEXFORD': 'WEXFORD ROUTE',
  'GOREY': 'GOREY ROUTE',
  'GREYSTONE': 'GREYSTONE ROUTE'
};

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
