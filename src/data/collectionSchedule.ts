import { supabase } from '@/integrations/supabase/client';
import { postalCodeToRouteMap, restrictedPostalCodes, irelandCityToRouteMap } from '@/utils/postalCodeUtils';

export interface RouteSchedule {
  route: string;
  date: string;
  areas: string[];
  country?: string;
}

// Initial data that will be used until we load from the database
export const collectionSchedules: RouteSchedule[] = [
  {
    route: "CARDIFF ROUTE",
    date: "30th of June",
    areas: ["CARDIFF", "GLOUCESTER", "BRISTOL", "SWINDON", "BATH", "SALISBURY"],
    country: "England"
  },
  {
    route: "BOURNEMOUTH ROUTE",
    date: "01st of July",
    areas: ["SOUTHAMPTON", "OXFORD", "HAMPHIRE", "READING", "GUILFORD", "PORTSMOUTH"],
    country: "England"
  },
  {
    route: "BIRMINGHAM ROUTE",
    date: "26th of June",
    areas: ["WOLVEHAMPTON", "COVENTRY", "WARWICK", "DUDLEY", "WALSALL", "RUGBY"],
    country: "England"
  },
  {
    route: "LONDON ROUTE",
    date: "28th of June",
    areas: ["CENTRAL LONDON", "HEATHROW", "EAST LONDON", "ROMFORD", "ALL AREAS INSIDE M25"],
    country: "England"
  },
  {
    route: "LEEDS ROUTE",
    date: "24th of June",
    areas: ["WAKEFIELD", "HALIFAX", "DONCASTER", "SHEFFIELD", "HUDDERSFIELD", "YORK"],
    country: "England"
  },
  {
    route: "NOTTINGHAM ROUTE",
    date: "27th of June",
    areas: ["LIECESTER", "DERBY", "PETERSBOROUGH", "CORBY", "MARKET HARB"],
    country: "England"
  },
  {
    route: "MANCHESTER ROUTE",
    date: "05th of July",
    areas: ["LIVERPOOL", "STOKE ON TRENT", "BOLTON", "WARRINGTON", "OLDHAM", "SHREWBURY"],
    country: "England"
  },
  {
    route: "BRIGHTON ROUTE",
    date: "03rd of July",
    areas: ["HIGH COMBE", "SLOUGH", "VRAWLEY", "LANCING", "EASTBOURNE", "CANTEBURY"],
    country: "England"
  },
  {
    route: "SOUTHEND ROUTE",
    date: "07th of July",
    areas: ["NORWICH", "IPSWICH", "COLCHESTER", "BRAINTREE", "CAMBRIDGE", "BASILDON"],
    country: "England"
  },
  {
    route: "NORTHAMPTON ROUTE",
    date: "23rd of June",
    areas: ["KETTERING", "BEDFORD", "MILTON KEYNES", "BANBURY", "AYLESBURY", "LUTON"],
    country: "England"
  },
  {
    route: "SCOTLAND ROUTE",
    date: "Please contact support to place booking",
    areas: ["GLASSGOW", "EDINBURGH", "NECASTLE", "MIDDLESBROUGH", "PRESTON", "CARLLSLE"],
    country: "England"
  },
  {
    route: "LONDON DERRY ROUTE",
    date: "18th of April",
    areas: ["LARNE", "BALLYCLARE", "BALLYMENA", "BALLYMONEY", "KILERA", "COLERAINE", "LONDONDERRY", "LIFFORD", "OMAGH", "COOKSTOWN", "CARRICKFERGUS"],
    country: "Ireland"
  },
  {
    route: "BELFAST ROUTE",
    date: "19th of April",
    areas: ["BELFAST", "BANGOR", "COMBER", "LISBURN", "NEWRY", "COOKSTOWN", "NEWTOWNARDS", "DUNMURRY", "LURGAN", "PORTADOWN", "BANBRIDGE", "MOY", "DUNGANNON", "ARMAGH"],
    country: "Ireland"
  },
  {
    route: "CAVAN ROUTE",
    date: "21st of April",
    areas: ["MAYNOOTH", "ASHBOURNE", "SWORDS", "SKERRIES", "DROGHEDA", "DUNDALK", "CAVAN", "VIRGINIA", "KELLS", "NAVAN", "TRIM"],
    country: "Ireland"
  },
  {
    route: "ATHLONE ROUTE",
    date: "23rd of April",
    areas: ["MALIGURAR", "LONGFORD", "ROSECOMMON", "BOYLE", "SLIGO", "BALLINA", "SWINFORD", "CASTLEBAR", "TAURM", "GALWAY", "ATERNY", "ATHLONE"],
    country: "Ireland"
  },
  {
    route: "LIMERICK ROUTE",
    date: "24th of April",
    areas: ["NEWBRIDGE", "PORTLAOISE", "ROSCREA", "LIMERICK", "ENNIS", "DOOLIN", "LOUGHREA", "BALLINASLOE", "TULLAMORE"],
    country: "Ireland"
  },
  {
    route: "DUBLIN CITY ROUTE",
    date: "26th of April",
    areas: ["SANDFORD", "RIATO", "BALLYMOUNT", "CABRA", "BEAUMONT", "MALAHIDE", "PORTMANOCK", "DALKEY", "SHANDKILL", "BRAY"],
    country: "Ireland"
  },
  {
    route: "CORK ROUTE",
    date: "28th of April",
    areas: ["PORTALOUSE", "CASHEL", "FERMOY", "CORK", "DUNGARVEAN", "WATERFORD", "NEW ROSS", "WEXFORD", "GOREY", "GREYSTONE"],
    country: "Ireland"
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
  country?: string;
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
      
      result.data.forEach((item: any) => {
        collectionSchedules.push({
          route: item.route,
          date: item.pickup_date,
          areas: item.areas,
          country: item.country || 'England'
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
          areas: schedule.areas,
          country: schedule.country || 'England'
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

// Get date for a specific route - IMPROVED with better error handling
export function getDateByRoute(routeName: string): string {
  try {
    if (!routeName) {
      console.warn("getDateByRoute called with empty route name");
      return "Next available collection date";
    }
    
    const route = collectionSchedules.find(schedule => schedule.route === routeName);
    
    if (!route || !route.date) {
      console.warn(`No date found for route: ${routeName}`);
      return "Next available collection date";
    }
    
    return route.date;
  } catch (error) {
    console.error(`Error in getDateByRoute for ${routeName}:`, error);
    return "Next available collection date";
  }
}

// Get date for an Ireland city - IMPROVED with better error handling
export function getDateForIrelandCity(city: string): string | null {
  try {
    if (!city) {
      console.warn("getDateForIrelandCity called with empty city");
      return "Next available collection date";
    }
    
    const normalizedCity = city.trim().toUpperCase();
    const route = getRouteForIrelandCity(normalizedCity);
    
    if (!route) {
      console.warn(`No route found for city: ${city}`);
      return "Next available collection date";
    }
    
    const schedule = collectionSchedules.find(s => s.route === route);
    return schedule?.date || "Next available collection date";
  } catch (error) {
    console.error(`Error in getDateForIrelandCity for ${city}:`, error);
    return "Next available collection date";
  }
}

// Update route date for a specific route and sync with database - Fixed to properly update the database
export async function updateRouteDate(routeName: string, newDate: string): Promise<boolean> {
  try {
    console.log(`Updating route date for ${routeName} to ${newDate}`);
    
    // Update in local array
    const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
    if (index !== -1) {
      collectionSchedules[index].date = newDate;
      
      // Sync with database using direct table update
      const { error } = await supabase
        .from('collection_schedules')
        .update({ 
          pickup_date: newDate,
          updated_at: new Date().toISOString()
        })
        .eq('route', routeName);
      
      if (error) {
        console.error('Error updating route date:', error);
        return false;
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error in updateRouteDate:', error);
    return false;
  }
}

// Add a new route and sync with database
export async function addRoute(route: string, date: string, areas: string[], country: string = 'England'): Promise<boolean> {
  // Check if route already exists
  if (collectionSchedules.some(schedule => schedule.route === route)) {
    return false;
  }
  
  // Add to local array
  collectionSchedules.push({
    route,
    date,
    areas,
    country
  });
  
  // Sync with database using direct table insert
  const { error } = await supabase
    .from('collection_schedules')
    .insert({
      route: route,
      pickup_date: date,
      areas: areas,
      country: country
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
  try {
    console.log(`Adding area ${area} to route ${routeName}`);
    
    // Update in local array
    const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
    if (index !== -1) {
      if (!collectionSchedules[index].areas.includes(area)) {
        collectionSchedules[index].areas.push(area);
        
        // Get the current areas array from the database
        const { data, error: fetchError } = await supabase
          .from('collection_schedules')
          .select('areas')
          .eq('route', routeName)
          .single();
        
        if (fetchError) {
          console.error('Error fetching current areas:', fetchError);
          return false;
        }
        
        // Add the new area to the existing areas array
        const updatedAreas = [...(data?.areas || []), area];
        
        // Update the database with the new areas array
        const { error: updateError } = await supabase
          .from('collection_schedules')
          .update({ 
            areas: updatedAreas,
            updated_at: new Date().toISOString()
          })
          .eq('route', routeName);
        
        if (updateError) {
          console.error('Error adding area:', updateError);
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
  } catch (error) {
    console.error('Error in addAreaToRoute:', error);
    return false;
  }
}

// Remove an area from a route and sync with database
export async function removeAreaFromRoute(routeName: string, area: string): Promise<boolean> {
  try {
    console.log(`Removing area ${area} from route ${routeName}`);
    
    // Update in local array
    const index = collectionSchedules.findIndex(schedule => schedule.route === routeName);
    if (index !== -1) {
      const areaIndex = collectionSchedules[index].areas.indexOf(area);
      if (areaIndex !== -1) {
        const prevAreas = [...collectionSchedules[index].areas];
        collectionSchedules[index].areas.splice(areaIndex, 1);
        
        // Get the current areas array from the database
        const { data, error: fetchError } = await supabase
          .from('collection_schedules')
          .select('areas')
          .eq('route', routeName)
          .single();
        
        if (fetchError) {
          console.error('Error fetching current areas:', fetchError);
          return false;
        }
        
        // Remove the area from the existing areas array
        const updatedAreas = (data?.areas || []).filter(a => a !== area);
        
        // Update the database with the new areas array
        const { error: updateError } = await supabase
          .from('collection_schedules')
          .update({ 
            areas: updatedAreas,
            updated_at: new Date().toISOString()
          })
          .eq('route', routeName);
        
        if (updateError) {
          console.error('Error removing area:', updateError);
          // Rollback local change
          collectionSchedules[index].areas = prevAreas;
          return false;
        }
        
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error in removeAreaFromRoute:', error);
    return false;
  }
}

// Get all routes for a specific country
export function getRoutesByCountry(country: string): string[] {
  return collectionSchedules
    .filter(schedule => schedule.country === country)
    .map(schedule => schedule.route);
}

// Get Ireland cities list
export function getIrelandCities(): string[] {
  const cities: string[] = [];
  
  collectionSchedules
    .filter(schedule => schedule.country === 'Ireland')
    .forEach(schedule => {
      schedule.areas.forEach(area => {
        if (!cities.includes(area)) {
          cities.push(area);
        }
      });
    });
  
  return cities.sort();
}

// Get route for an Ireland city
export function getRouteForIrelandCity(city: string): string | null {
  const normalizedCity = city.trim().toUpperCase();
  
  for (const schedule of collectionSchedules) {
    if (schedule.country === 'Ireland' && 
        schedule.areas.includes(normalizedCity)) {
      return schedule.route;
    }
  }
  
  return null;
}

// Get date for an Ireland city
export function getDateForIrelandCity(city: string): string | null {
  const route = getRouteForIrelandCity(city);
  if (!route) return null;
  
  const schedule = collectionSchedules.find(s => s.route === route);
  return schedule?.date || null;
}
