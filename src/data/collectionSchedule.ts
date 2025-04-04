
export interface RouteSchedule {
  route: string;
  date: string;
  areas: string[];
}

export const collectionSchedules: RouteSchedule[] = [
  {
    route: "CARDIFF ROUTE",
    date: "21st of April",
    areas: ["CARDIFF", "GLOUCESTER", "BRISTOL", "SWINDON", "BATH", "SALISBURY"]
  },
  {
    route: "BOURNEMOUTH ROUTE",
    date: "22nd of April",
    areas: ["SOUTHAMPTON", "OXFORD", "HAMPHIRE", "READING", "GUILFORD", "PORTSMOUTH"]
  },
  {
    route: "BIRMINGHAM ROUTE",
    date: "24th of April",
    areas: ["WOLVEHAMPTON", "COVENTRY", "WARWICK", "DUDLEY", "WALSALL", "RUGBY"]
  },
  {
    route: "LONDON ROUTE",
    date: "19th of April",
    areas: ["CENTRAL LONDON", "HEATHROW", "EAST LONDON", "ROMFORD", "ALL AREAS INSIDE M25"]
  },
  {
    route: "LEEDS ROUTE",
    date: "17th of April",
    areas: ["WAKEFIELD", "HALIFAX", "DONCASTER", "SHEFFIELD", "HUDDERSFIELD", "YORK"]
  },
  {
    route: "NOTTINGHAM ROUTE",
    date: "18th of April",
    areas: ["LIECESTER", "DERBY", "PETERSBOROUGH", "CORBY", "MARKET HARB"]
  },
  {
    route: "MANCHESTER ROUTE",
    date: "26th of April",
    areas: ["LIVERPOOL", "STOKE ON TRENT", "BOLTON", "WARRINGTON", "OLDHAM", "SHREWBURY"]
  },
  {
    route: "BRIGHTON ROUTE",
    date: "28th of April",
    areas: ["HIGH COMBE", "SLOUGH", "VRAWLEY", "LANCING", "EASTBOURNE", "CANTEBURY"]
  },
  {
    route: "SOUTHEND ROUTE",
    date: "29th of April",
    areas: ["NORWICH", "IPSWICH", "COLCHESTER", "BRAINTREE", "CAMBRIDGE", "BASILDON"]
  },
  {
    route: "NORTHAMPTON ROUTE",
    date: "16th of April",
    areas: ["KETTERING", "BEDFORD", "MILTON KEYNES", "BANBURY", "AYLESBURY", "LUTON"]
  },
  {
    route: "SCOTLAND ROUTE",
    date: "30th of April", // Added date for Scotland route
    areas: ["GLASSGOW", "EDINBURGH", "NECASTLE", "MIDDLESBROUGH", "PRESTON", "CARLLSLE"]
  }
];

// Get all route names
export function getRouteNames(): string[] {
  return collectionSchedules.map(schedule => schedule.route);
}

// Get areas for a specific route
export function getAreasByRoute(routeName: string): string[] {
  const route = collectionSchedules.find(schedule => schedule.route === routeName);
  return route?.areas || [];
}

// Get date for a specific route
export function getDateByRoute(routeName: string): string {
  const route = collectionSchedules.find(schedule => schedule.route === routeName);
  return route?.date || "No date available";
}

// Get date by route and area
export function getDateByRouteAndArea(routeName: string, areaName: string): string {
  const route = collectionSchedules.find(schedule => 
    schedule.route === routeName && schedule.areas.includes(areaName)
  );
  return route?.date || "No date available";
}

// Update date for a specific route
export function updateRouteDate(routeName: string, newDate: string): boolean {
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    collectionSchedules[index].date = newDate;
    return true;
  }
  return false;
}

// Add a new route
export function addRoute(route: string, date: string, areas: string[]): boolean {
  // Check if route already exists
  if (collectionSchedules.some(schedule => schedule.route === route)) {
    return false;
  }
  
  collectionSchedules.push({
    route,
    date,
    areas
  });
  
  return true;
}

// Remove a route
export function removeRoute(routeName: string): boolean {
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    collectionSchedules.splice(index, 1);
    return true;
  }
  return false;
}

// Add an area to a route
export function addAreaToRoute(routeName: string, area: string): boolean {
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    if (!collectionSchedules[index].areas.includes(area)) {
      collectionSchedules[index].areas.push(area);
      return true;
    }
  }
  return false;
}

// Remove an area from a route
export function removeAreaFromRoute(routeName: string, area: string): boolean {
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    const areaIndex = collectionSchedules[index].areas.indexOf(area);
    if (areaIndex !== -1) {
      collectionSchedules[index].areas.splice(areaIndex, 1);
      return true;
    }
  }
  return false;
}
