
import { supabase } from '@/integrations/supabase/client';
import { postalCodeToRouteMap, restrictedPostalCodes } from '@/utils/postalCodeUtils';

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

// Add a function to get areas based on postal code prefix
export function getAreasFromPostalCode(postalCode: string): string[] {
  const prefix = postalCode.trim().toUpperCase().match(/^[A-Z]+/);
  if (!prefix) return [];
  
  const route = postalCodeToRouteMap[prefix[0]];
  if (!route) return [];
  
  return getAreasByRoute(route);
}

// Type for the collection_schedules table in Supabase
type CollectionSchedule = {
  id: string;
  route: string;
  pickup_date: string;
  areas: string[];
  created_at: string;
  updated_at: string;
}

// Sync collection schedules with Supabase
export async function syncSchedulesWithDatabase() {
  try {
    // Call the edge function to get collection schedules
    const response = await fetch('https://oncsaunsqtekwwbzvvyh.supabase.co/functions/v1/get-collection-schedules', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch collection schedules');
    }
    
    const result = await response.json();
    
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      // Clear the local array and populate with data from the database
      collectionSchedules.length = 0;
      
      result.data.forEach((item: CollectionSchedule) => {
        collectionSchedules.push({
          route: item.route,
          date: item.pickup_date,
          areas: item.areas
        });
      });
      return true;
    } else {
      // If no data in database, initialize it with our default data
      await initializeCollectionSchedules();
      return true;
    }
  } catch (error) {
    console.error('Error syncing schedules with database:', error);
    return false;
  }
}

// Initialize collection schedules in the database
async function initializeCollectionSchedules() {
  try {
    for (const schedule of collectionSchedules) {
      await supabase
        .from('collection_schedules')
        .insert({
          route: schedule.route,
          pickup_date: schedule.date,
          areas: schedule.areas
        });
    }
    return true;
  } catch (error) {
    console.error('Error initializing collection schedules:', error);
    return false;
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
    
    // Sync with database using direct table update
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
  
  // Sync with database using direct table insert
  const { error } = await supabase
    .from('collection_schedules')
    .insert({
      route: route,
      pickup_date: date,
      areas: areas
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
    
    // Sync with database using direct table delete
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
      
      // Get current areas from database
      const { data, error: fetchError } = await supabase
        .from('collection_schedules')
        .select('areas')
        .eq('route', routeName)
        .single();
      
      if (fetchError) {
        console.error('Error fetching areas:', fetchError);
        // Rollback local change
        const areaIndex = collectionSchedules[index].areas.indexOf(area);
        if (areaIndex !== -1) {
          collectionSchedules[index].areas.splice(areaIndex, 1);
        }
        return false;
      }
      
      // Update areas in database
      const updatedAreas = [...data.areas, area];
      const { error: updateError } = await supabase
        .from('collection_schedules')
        .update({ areas: updatedAreas })
        .eq('route', routeName);
      
      if (updateError) {
        console.error('Error updating areas:', updateError);
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
      
      // Get current areas from database
      const { data, error: fetchError } = await supabase
        .from('collection_schedules')
        .select('areas')
        .eq('route', routeName)
        .single();
      
      if (fetchError) {
        console.error('Error fetching areas:', fetchError);
        // Rollback local change
        collectionSchedules[index].areas = prevAreas;
        return false;
      }
      
      // Update areas in database
      const updatedAreas = data.areas.filter((a: string) => a !== area);
      const { error: updateError } = await supabase
        .from('collection_schedules')
        .update({ areas: updatedAreas })
        .eq('route', routeName);
      
      if (updateError) {
        console.error('Error updating areas:', updateError);
        // Rollback local change
        collectionSchedules[index].areas = prevAreas;
        return false;
      }
      
      return true;
    }
  }
  return false;
}
