
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
  
  // London Route - Adding the requested postcodes
  "EN": "LONDON ROUTE",
  "IG": "LONDON ROUTE",
  "RM": "LONDON ROUTE",
  "DA": "LONDON ROUTE",
  "BR": "LONDON ROUTE",
  "UB": "LONDON ROUTE",
  "HA": "LONDON ROUTE",
  "WD": "LONDON ROUTE",
  "E": "LONDON ROUTE",
  "EC": "LONDON ROUTE",
  "N": "LONDON ROUTE",
  "NW": "LONDON ROUTE",
  "SE": "LONDON ROUTE",
  "SW": "LONDON ROUTE",
  "W": "LONDON ROUTE",
  "WC": "LONDON ROUTE",
  
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

// Map of postal code areas for each route
const routeAreas: Record<string, string[]> = {
  "CARDIFF ROUTE": ["Cardiff", "Swansea", "Newport", "Swindon", "Bath"],
  "BOURNEMOUTH ROUTE": ["Bournemouth", "Southampton", "Guildford", "Reading", "Oxford"],
  "SOUTHEND ROUTE": ["Southend", "Chelmsford", "Colchester", "Cambridge", "Stevenage"],
  "LEEDS ROUTE": ["Leeds", "Sheffield", "Doncaster", "York", "Bradford", "Huddersfield", "Halifax"],
  "BIRMINGHAM ROUTE": ["Birmingham", "Coventry", "Worcester", "Dudley", "Wolverhampton", "Shrewsbury"],
  "NOTTINGHAM ROUTE": ["Nottingham", "Derby", "Leicester", "Peterborough", "Lincoln"],
  "MANCHESTER ROUTE": ["Manchester", "Liverpool", "Chester", "Stockport", "Wigan", "Bolton", "Oldham", "Blackpool", "Preston"],
  "LONDON ROUTE": ["North London", "East London", "Enfield", "Ilford", "Romford", "Dartford", "Bromley", "Uxbridge", "Harrow", "Watford"],
  "BRIGHTON ROUTE": ["Brighton", "Slough", "Croydon", "Twickenham", "Kingston", "Redhill", "Tunbridge Wells", "Maidstone"],
  "NORTHAMPTON ROUTE": ["Northampton", "Milton Keynes", "Luton", "Hemel Hempstead", "St Albans"]
};

// Ireland city to route mapping
export const irelandCityToRouteMap: Record<string, string> = {
  // Londonderry Route
  "Larne": "LONDONDERRY ROUTE",
  "BallyClare": "LONDONDERRY ROUTE",
  "BallyMena": "LONDONDERRY ROUTE", 
  "BallyMoney": "LONDONDERRY ROUTE",
  "Kilera": "LONDONDERRY ROUTE",
  "Coleraine": "LONDONDERRY ROUTE",
  "Londonderry": "LONDONDERRY ROUTE",
  "Lifford": "LONDONDERRY ROUTE",
  "Omagh": "LONDONDERRY ROUTE",
  "Cookstown": "LONDONDERRY ROUTE",
  "Carrickfergus": "LONDONDERRY ROUTE",
  
  // Belfast Route
  "Belfast": "BELFAST ROUTE",
  "Bangor": "BELFAST ROUTE",
  "Comber": "BELFAST ROUTE",
  "Lisburn": "BELFAST ROUTE",
  "Newry": "BELFAST ROUTE",
  // "Cookstown" already listed in LONDONDERRY ROUTE
  "Newtownards": "BELFAST ROUTE",
  "Dunmurry": "BELFAST ROUTE",
  "Lurgan": "BELFAST ROUTE", 
  "Portadown": "BELFAST ROUTE",
  "Banbridge": "BELFAST ROUTE",
  "Moy": "BELFAST ROUTE",
  "Dungannon": "BELFAST ROUTE",
  "Armagh": "BELFAST ROUTE",
  
  // Cavan Route
  "Maynooth": "CAVAN ROUTE",
  "Ashbourne": "CAVAN ROUTE",
  "Swords": "CAVAN ROUTE",
  "Skerries": "CAVAN ROUTE",
  "Drogheda": "CAVAN ROUTE",
  "Dundalk": "CAVAN ROUTE",
  "Cavan": "CAVAN ROUTE",
  "Virginia": "CAVAN ROUTE",
  "Kells": "CAVAN ROUTE",
  "Navan": "CAVAN ROUTE",
  "Trim": "CAVAN ROUTE",
  
  // Athlone Route
  "Maligurar": "ATHLONE ROUTE",
  "LongFord": "ATHLONE ROUTE",
  "Rosecommon": "ATHLONE ROUTE",
  "Boyle": "ATHLONE ROUTE",
  "Sligo": "ATHLONE ROUTE",
  "Ballina": "ATHLONE ROUTE",
  "Swinford": "ATHLONE ROUTE",
  "Castlebar": "ATHLONE ROUTE",
  "Taurm": "ATHLONE ROUTE",
  "Galway": "ATHLONE ROUTE",
  "Aterny": "ATHLONE ROUTE",
  "Athlone": "ATHLONE ROUTE",
  
  // Limerick Route
  "Newbridge": "LIMERICK ROUTE",
  "Portlaoise": "LIMERICK ROUTE",
  "Roscrea": "LIMERICK ROUTE",
  "Limerick": "LIMERICK ROUTE",
  "Ennis": "LIMERICK ROUTE",
  "Doolin": "LIMERICK ROUTE",
  "Loughrea": "LIMERICK ROUTE",
  "Ballinasloe": "LIMERICK ROUTE",
  "Tullamore": "LIMERICK ROUTE",
  
  // Dublin City Route
  "Sandford": "DUBLIN CITY ROUTE",
  "Riato": "DUBLIN CITY ROUTE",
  "Ballymount": "DUBLIN CITY ROUTE",
  "Cabra": "DUBLIN CITY ROUTE",
  "Beaumont": "DUBLIN CITY ROUTE",
  "Malahide": "DUBLIN CITY ROUTE",
  "Portmanock": "DUBLIN CITY ROUTE",
  "Dalkey": "DUBLIN CITY ROUTE",
  "Shandkill": "DUBLIN CITY ROUTE",
  "Bray": "DUBLIN CITY ROUTE",
  
  // Cork Route
  "Portalouse": "CORK ROUTE",
  "Cashel": "CORK ROUTE",
  "Fermoy": "CORK ROUTE",
  "Cork": "CORK ROUTE",
  "Dungarvean": "CORK ROUTE",
  "Waterford": "CORK ROUTE",
  "New Ross": "CORK ROUTE",
  "Wexford": "CORK ROUTE",
  "Gorey": "CORK ROUTE",
  "Greystone": "CORK ROUTE"
};

// Collection dates for Ireland routes
export const irelandRouteSchedules: Record<string, string> = {
  "LONDONDERRY ROUTE": "18th of April",
  "BELFAST ROUTE": "19th of April",
  "CAVAN ROUTE": "21st of April",
  "ATHLONE ROUTE": "23rd of April",
  "LIMERICK ROUTE": "24th of April",
  "DUBLIN CITY ROUTE": "26th of April",
  "CORK ROUTE": "28th of April"
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

// Get route for Ireland city
export function getRouteForIrelandCity(city: string): string | null {
  if (!city) return null;
  
  const normalizedCity = city.trim().charAt(0).toUpperCase() + city.trim().slice(1).toLowerCase();
  return irelandCityToRouteMap[normalizedCity] || null;
}

// Get collection date for Ireland route
export function getIrelandRouteDate(route: string): string | null {
  if (!route) return null;
  return irelandRouteSchedules[route] || null;
}

// Get areas for a given postal code
export function getAreasFromPostalCode(postalCode: string): string[] {
  if (!postalCode) return [];
  
  const route = getRouteForPostalCode(postalCode);
  if (!route) return [];
  
  return routeAreas[route] || [];
}

// Check if a postal code is in a restricted area
export function isRestrictedPostalCode(postalCode: string): boolean {
  if (!postalCode) return false;
  
  // Extract the alphabetic prefix from the postal code
  const prefix = postalCode.trim().toUpperCase().match(/^[A-Z]+/);
  if (!prefix) return false;
  
  return restrictedPostalCodes.includes(prefix[0]);
}
