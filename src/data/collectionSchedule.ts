
import { supabase } from '@/integrations/supabase/client';

export interface RouteSchedule {
  route: string;
  date: string;
  areas: string[];
}

// Initial data that will be used until we load from the database
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
    date: "30th of April",
    areas: ["GLASSGOW", "EDINBURGH", "NECASTLE", "MIDDLESBROUGH", "PRESTON", "CARLLSLE"]
  }
];

// Sync collection schedules with Supabase
export async function syncSchedulesWithDatabase() {
  const { data, error } = await supabase
    .from('collection_schedules')
    .select('*');
  
  if (error) {
    console.error('Error loading collection schedules:', error);
    return false;
  }
  
  if (data && data.length > 0) {
    // Clear the local array and populate with data from the database
    collectionSchedules.length = 0;
    data.forEach(item => {
      collectionSchedules.push({
        route: item.route,
        date: item.pickup_date,
        areas: item.areas
      });
    });
    return true;
  } else {
    // If no data in database, initialize it with our default data
    const { error } = await supabase
      .from('collection_schedules')
      .insert(
        collectionSchedules.map(schedule => ({
          route: schedule.route,
          pickup_date: schedule.date,
          areas: schedule.areas
        }))
      );
    
    if (error) {
      console.error('Error initializing collection schedules:', error);
      return false;
    }
    return true;
  }
}

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

// Update date for a specific route and sync with database
export async function updateRouteDate(routeName: string, newDate: string): Promise<boolean> {
  // Update in local array
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    collectionSchedules[index].date = newDate;
    
    // Sync with database
    const { error } = await supabase
      .from('collection_schedules')
      .update({ pickup_date: newDate })
      .eq('route', routeName);
    
    if (error) {
      console.error('Error updating route date:', error);
      return false;
    }
    
    return true;
  }
  return false;
}

// Add a new route and sync with database
export async function addRoute(route: string, date: string, areas: string[]): Promise<boolean> {
  // Check if route already exists
  if (collectionSchedules.some(schedule => schedule.route === route)) {
    return false;
  }
  
  // Add to local array
  collectionSchedules.push({
    route,
    date,
    areas
  });
  
  // Sync with database
  const { error } = await supabase
    .from('collection_schedules')
    .insert({
      route,
      pickup_date: date,
      areas
    });
  
  if (error) {
    console.error('Error adding route:', error);
    // Rollback local change
    const index = collectionSchedules.findIndex(schedule => schedule.route === route);
    if (index !== -1) {
      collectionSchedules.splice(index, 1);
    }
    return false;
  }
  
  return true;
}

// Remove a route and sync with database
export async function removeRoute(routeName: string): Promise<boolean> {
  // Remove from local array
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    const removedRoute = collectionSchedules.splice(index, 1)[0];
    
    // Sync with database
    const { error } = await supabase
      .from('collection_schedules')
      .delete()
      .eq('route', routeName);
    
    if (error) {
      console.error('Error removing route:', error);
      // Rollback local change
      collectionSchedules.splice(index, 0, removedRoute);
      return false;
    }
    
    return true;
  }
  return false;
}

// Add an area to a route and sync with database
export async function addAreaToRoute(routeName: string, area: string): Promise<boolean> {
  // Update in local array
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    if (!collectionSchedules[index].areas.includes(area)) {
      collectionSchedules[index].areas.push(area);
      
      // Sync with database
      const { error } = await supabase
        .from('collection_schedules')
        .update({ areas: collectionSchedules[index].areas })
        .eq('route', routeName);
      
      if (error) {
        console.error('Error adding area to route:', error);
        // Rollback local change
        const areaIndex = collectionSchedules[index].areas.indexOf(area);
        if (areaIndex !== -1) {
          collectionSchedules[index].areas.splice(areaIndex, 1);
        }
        return false;
      }
      
      return true;
    }
  }
  return false;
}

// Remove an area from a route and sync with database
export async function removeAreaFromRoute(routeName: string, area: string): Promise<boolean> {
  // Update in local array
  const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
  if (index !== -1) {
    const areaIndex = collectionSchedules[index].areas.indexOf(area);
    if (areaIndex !== -1) {
      const prevAreas = [...collectionSchedules[index].areas];
      collectionSchedules[index].areas.splice(areaIndex, 1);
      
      // Sync with database
      const { error } = await supabase
        .from('collection_schedules')
        .update({ areas: collectionSchedules[index].areas })
        .eq('route', routeName);
      
      if (error) {
        console.error('Error removing area from route:', error);
        // Rollback local change
        collectionSchedules[index].areas = prevAreas;
        return false;
      }
      
      return true;
    }
  }
  return false;
}
