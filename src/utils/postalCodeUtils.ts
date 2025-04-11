
// Map of postal code prefixes to routes
export const postalCodeToRouteMap: Record<string, string> = {
  // Cardiff Route
  "SP": "CARDIFF ROUTE",
  "SN": "CARDIFF ROUTE",
  "BA": "CARDIFF ROUTE",
  "NP": "CARDIFF ROUTE",
  "CP": "CARDIFF ROUTE",
  "SA": "CARDIFF ROUTE",
  
  // Bournemouth Route
  "BH": "BOURNEMOUTH ROUTE",
  "SO": "BOURNEMOUTH ROUTE",
  "GU": "BOURNEMOUTH ROUTE",
  "RG": "BOURNEMOUTH ROUTE",
  "OX": "BOURNEMOUTH ROUTE",
  
  // Southend Route
  "SG": "SOUTHEND ROUTE",
  "CM": "SOUTHEND ROUTE",
  "SS": "SOUTHEND ROUTE",
  "CO": "SOUTHEND ROUTE",
  "CB": "SOUTHEND ROUTE",
  
  // Leeds Route
  "LS": "LEEDS ROUTE",
  "S": "LEEDS ROUTE",
  "DN": "LEEDS ROUTE",
  "WF": "LEEDS ROUTE",
  "YO": "LEEDS ROUTE",
  "HD": "LEEDS ROUTE",
  "HX": "LEEDS ROUTE",
  "BD": "LEEDS ROUTE",
  "HG": "LEEDS ROUTE",
  
  // Birmingham Route
  "CV": "BIRMINGHAM ROUTE",
  "B": "BIRMINGHAM ROUTE",
  "WR": "BIRMINGHAM ROUTE",
  "DY": "BIRMINGHAM ROUTE",
  "WV": "BIRMINGHAM ROUTE",
  "SY": "BIRMINGHAM ROUTE",
  "WS": "BIRMINGHAM ROUTE",
  "TF": "BIRMINGHAM ROUTE",
  
  // Nottingham Route
  "NG": "NOTTINGHAM ROUTE",
  "DE": "NOTTINGHAM ROUTE",
  "LE": "NOTTINGHAM ROUTE",
  "PE": "NOTTINGHAM ROUTE",
  "LN": "NOTTINGHAM ROUTE",
  
  // Manchester Route
  "ST": "MANCHESTER ROUTE",
  "M": "MANCHESTER ROUTE",
  "SK": "MANCHESTER ROUTE",
  "CW": "MANCHESTER ROUTE",
  "CH": "MANCHESTER ROUTE",
  "LL": "MANCHESTER ROUTE",
  "L": "MANCHESTER ROUTE",
  "WN": "MANCHESTER ROUTE",
  "BL": "MANCHESTER ROUTE",
  "OL": "MANCHESTER ROUTE",
  "FY": "MANCHESTER ROUTE",
  "PR": "MANCHESTER ROUTE",
  "BB": "MANCHESTER ROUTE",
  
  // London Route
  "EN": "LONDON ROUTE",
  "IG": "LONDON ROUTE",
  "RM": "LONDON ROUTE",
  "DA": "LONDON ROUTE",
  "BR": "LONDON ROUTE",
  "UB": "LONDON ROUTE",
  "HA": "LONDON ROUTE",
  "WD": "LONDON ROUTE",
  
  // Brighton Route
  "SL": "BRIGHTON ROUTE",
  "CR": "BRIGHTON ROUTE",
  "TW": "BRIGHTON ROUTE",
  "KT": "BRIGHTON ROUTE",
  "RH": "BRIGHTON ROUTE",
  "BN": "BRIGHTON ROUTE",
  "TN": "BRIGHTON ROUTE",
  "ME": "BRIGHTON ROUTE",
  
  // Northampton Route
  "NN": "NORTHAMPTON ROUTE",
  "MK": "NORTHAMPTON ROUTE",
  "LU": "NORTHAMPTON ROUTE",
  "HP": "NORTHAMPTON ROUTE",
  "AL": "NORTHAMPTON ROUTE"
};

// Restricted areas (with contact before booking)
export const restrictedPostalCodes = [
  "EX", "TQ", "DT", "SA", "LD", "HR", "IP", "NR", "HU", "TS", 
  "DL", "SR", "DH", "CA", "NE", "TD", "EH", "ML", "KA", "DG", 
  "G", "KY", "PA", "IV", "AB", "DD"
];

// Get route for a given postal code
export function getRouteForPostalCode(postalCode: string): string | null {
  if (!postalCode) return null;
  
  // Extract the alphabetic prefix from the postal code
  const prefix = postalCode.trim().toUpperCase().match(/^[A-Z]+/);
  if (!prefix) return null;
  
  return postalCodeToRouteMap[prefix[0]] || null;
}

// Check if a postal code is in a restricted area
export function isRestrictedPostalCode(postalCode: string): boolean {
  if (!postalCode) return false;
  
  // Extract the alphabetic prefix from the postal code
  const prefix = postalCode.trim().toUpperCase().match(/^[A-Z]+/);
  if (!prefix) return false;
  
  return restrictedPostalCodes.includes(prefix[0]);
}
