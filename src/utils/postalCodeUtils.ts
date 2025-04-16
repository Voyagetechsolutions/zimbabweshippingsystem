
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

// Ireland city to route map
export const irelandCityToRouteMap: Record<string, string> = {
  // London Derry Route
  "LARNE": "LONDON DERRY ROUTE",
  "BALLYCLARE": "LONDON DERRY ROUTE",
  "BALLYMENA": "LONDON DERRY ROUTE",
  "BALLYMONEY": "LONDON DERRY ROUTE",
  "KILERA": "LONDON DERRY ROUTE",
  "COLERAINE": "LONDON DERRY ROUTE",
  "LONDONDERRY": "LONDON DERRY ROUTE",
  "LIFFORD": "LONDON DERRY ROUTE",
  "OMAGH": "LONDON DERRY ROUTE",
  "COOKSTOWN": "LONDON DERRY ROUTE",
  "CARRICKFERGUS": "LONDON DERRY ROUTE",
  
  // Belfast Route
  "BELFAST": "BELFAST ROUTE",
  "BANGOR": "BELFAST ROUTE",
  "COMBER": "BELFAST ROUTE",
  "LISBURN": "BELFAST ROUTE",
  "NEWRY": "BELFAST ROUTE",
  "NEWTOWNARDS": "BELFAST ROUTE",
  "DUNMURRY": "BELFAST ROUTE",
  "LURGAN": "BELFAST ROUTE",
  "PORTADOWN": "BELFAST ROUTE",
  "BANBRIDGE": "BELFAST ROUTE",
  "MOY": "BELFAST ROUTE",
  "DUNGANNON": "BELFAST ROUTE",
  "ARMAGH": "BELFAST ROUTE",
  
  // Cavan Route
  "MAYNOOTH": "CAVAN ROUTE",
  "ASHBOURNE": "CAVAN ROUTE",
  "SWORDS": "CAVAN ROUTE",
  "SKERRIES": "CAVAN ROUTE",
  "DROGHEDA": "CAVAN ROUTE",
  "DUNDALK": "CAVAN ROUTE",
  "CAVAN": "CAVAN ROUTE",
  "VIRGINIA": "CAVAN ROUTE",
  "KELLS": "CAVAN ROUTE",
  "NAVAN": "CAVAN ROUTE",
  "TRIM": "CAVAN ROUTE",
  
  // Athlone Route
  "MALIGURAR": "ATHLONE ROUTE",
  "LONGFORD": "ATHLONE ROUTE",
  "ROSECOMMON": "ATHLONE ROUTE",
  "BOYLE": "ATHLONE ROUTE",
  "SLIGO": "ATHLONE ROUTE",
  "BALLINA": "ATHLONE ROUTE",
  "SWINFORD": "ATHLONE ROUTE",
  "CASTLEBAR": "ATHLONE ROUTE",
  "TAURM": "ATHLONE ROUTE",
  "GALWAY": "ATHLONE ROUTE",
  "ATERNY": "ATHLONE ROUTE",
  "ATHLONE": "ATHLONE ROUTE",
  
  // Limerick Route
  "NEWBRIDGE": "LIMERICK ROUTE",
  "PORTLAOISE": "LIMERICK ROUTE",
  "ROSCREA": "LIMERICK ROUTE",
  "LIMERICK": "LIMERICK ROUTE",
  "ENNIS": "LIMERICK ROUTE",
  "DOOLIN": "LIMERICK ROUTE",
  "LOUGHREA": "LIMERICK ROUTE",
  "BALLINASLOE": "LIMERICK ROUTE",
  "TULLAMORE": "LIMERICK ROUTE",
  
  // Dublin City Route
  "SANDFORD": "DUBLIN CITY ROUTE",
  "RIATO": "DUBLIN CITY ROUTE",
  "BALLYMOUNT": "DUBLIN CITY ROUTE",
  "CABRA": "DUBLIN CITY ROUTE",
  "BEAUMONT": "DUBLIN CITY ROUTE",
  "MALAHIDE": "DUBLIN CITY ROUTE",
  "PORTMANOCK": "DUBLIN CITY ROUTE",
  "DALKEY": "DUBLIN CITY ROUTE",
  "SHANDKILL": "DUBLIN CITY ROUTE",
  "BRAY": "DUBLIN CITY ROUTE",
  
  // Cork Route
  "PORTALOUSE": "CORK ROUTE",
  "CASHEL": "CORK ROUTE",
  "FERMOY": "CORK ROUTE",
  "CORK": "CORK ROUTE",
  "DUNGARVEAN": "CORK ROUTE",
  "WATERFORD": "CORK ROUTE",
  "NEW ROSS": "CORK ROUTE",
  "WEXFORD": "CORK ROUTE",
  "GOREY": "CORK ROUTE",
  "GREYSTONE": "CORK ROUTE"
};

// Get Ireland route for a given city
export function getIrelandRouteForCity(city: string): string | null {
  if (!city) return null;
  
  const normalizedCity = city.trim().toUpperCase();
  return irelandCityToRouteMap[normalizedCity] || null;
}
