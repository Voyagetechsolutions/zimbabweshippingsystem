
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
    areas: ["CENTRAL LONDON", "HEATHROW", "EAST LONDONROMFORD", "ALL AREAS INSIDE M25"]
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
    date: "", // No date provided for Scotland route
    areas: ["GLASSGOW", "EDINBURGH", "NECASTLE", "MIDDLESBROUGH", "PRESTON", "CARLLSLE"]
  }
];

export function getRouteNames(): string[] {
  return collectionSchedules.map(schedule => schedule.route);
}

export function getAreasByRoute(routeName: string): string[] {
  const route = collectionSchedules.find(schedule => schedule.route === routeName);
  return route?.areas || [];
}

export function getDateByRoute(routeName: string): string {
  const route = collectionSchedules.find(schedule => schedule.route === routeName);
  return route?.date || "No date available";
}

export function getDateByRouteAndArea(routeName: string, areaName: string): string {
  const route = collectionSchedules.find(schedule => 
    schedule.route === routeName && schedule.areas.includes(areaName)
  );
  return route?.date || "No date available";
}
