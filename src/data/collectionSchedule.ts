
import { getRouteForPostalCode, isRestrictedPostalCode } from '@/utils/postalCodeUtils';
import { supabase } from '@/integrations/supabase/client';

// Define the RouteSchedule interface
export interface RouteSchedule {
  route: string;
  date: string;
  areas: string[];
}

// Collection dates by route
const routeSchedules: Record<string, string> = {
  'London North': 'Every Monday',
  'London North West': 'Every Monday',
  'London West': 'Every Tuesday',
  'London South West': 'Every Tuesday',
  'London South East': 'Every Wednesday',
  'London East': 'Every Wednesday',
  'London Central': 'Every Thursday',
  
  // Greater London
  'South London': 'Every Friday',
  'East London': 'Every Friday',
  'North London': 'Every Saturday',
  'West London': 'Every Saturday',
  
  // Rest of UK
  'Birmingham': 'First Monday of the month',
  'Cardiff': 'Second Monday of the month',
  'Chester': 'Second Monday of the month',
  'Coventry': 'First Tuesday of the month',
  'Glasgow': 'Third Monday of the month',
  'Liverpool': 'Second Tuesday of the month',
  'Manchester': 'Second Tuesday of the month',
  'Nottingham': 'First Wednesday of the month',
  'Oxford': 'First Thursday of the month',
  'Sheffield': 'Second Wednesday of the month',
};

// Collection schedules data
export const collectionSchedules: RouteSchedule[] = [
  {
    route: 'LONDON NORTH',
    date: 'Every Monday',
    areas: ['NORTH LONDON', 'HIGHGATE', 'HAMPSTEAD', 'FINCHLEY', 'BARNET']
  },
  {
    route: 'LONDON EAST',
    date: 'Every Wednesday',
    areas: ['EAST LONDON', 'STRATFORD', 'HACKNEY', 'BOW', 'BETHNAL GREEN']
  },
  {
    route: 'LONDON SOUTH',
    date: 'Every Friday',
    areas: ['SOUTH LONDON', 'CROYDON', 'BRIXTON', 'STREATHAM', 'PECKHAM']
  },
  {
    route: 'LONDON WEST',
    date: 'Every Tuesday',
    areas: ['WEST LONDON', 'EALING', 'HOUNSLOW', 'HAMMERSMITH', 'ACTON']
  },
  {
    route: 'LONDON CENTRAL',
    date: 'Every Thursday',
    areas: ['CENTRAL LONDON', 'WESTMINSTER', 'CAMDEN', 'ISLINGTON', 'CITY OF LONDON']
  },
  {
    route: 'BIRMINGHAM',
    date: 'First Monday of the month',
    areas: ['BIRMINGHAM CITY', 'SOLIHULL', 'SUTTON COLDFIELD', 'ERDINGTON']
  },
  {
    route: 'MANCHESTER',
    date: 'Second Tuesday of the month',
    areas: ['MANCHESTER CITY', 'OLDHAM', 'STOCKPORT', 'SALFORD', 'BOLTON']
  },
  {
    route: 'LIVERPOOL',
    date: 'Second Tuesday of the month',
    areas: ['LIVERPOOL CITY', 'WIRRAL', 'SEFTON', 'KNOWSLEY', 'ST HELENS']
  },
  {
    route: 'GLASGOW',
    date: 'Third Monday of the month',
    areas: ['GLASGOW CITY', 'PAISLEY', 'CUMBERNAULD', 'EAST KILBRIDE', 'HAMILTON']
  },
  {
    route: 'CARDIFF',
    date: 'Second Monday of the month',
    areas: ['CARDIFF CITY', 'NEWPORT', 'CAERPHILLY', 'PENARTH', 'BARRY']
  }
];

// Get collection date by route
export const getDateByRoute = (route: string): string | null => {
  return routeSchedules[route] || null;
};

// Get collection date by postcode
export const getDateByPostcode = (postcode: string): string | null => {
  const route = getRouteForPostalCode(postcode);
  if (!route) return null;
  return routeSchedules[route] || null;
};

// Check if postcode is serviced
export const isServicedPostcode = (postcode: string): boolean => {
  return !isRestrictedPostalCode(postcode) && getRouteForPostalCode(postcode) !== null;
};

// Sync schedules with the database
export const syncSchedulesWithDatabase = async (): Promise<boolean> => {
  try {
    // Fetch collection schedules from database
    const { data, error } = await supabase
      .from('collection_schedules')
      .select('*');
      
    if (error) throw error;
    
    // If no schedules in database, initialize with our static data
    if (!data || data.length === 0) {
      // Convert our static data to the format expected by the database
      const scheduleData = collectionSchedules.map(schedule => ({
        route: schedule.route,
        pickup_date: schedule.date,
        areas: schedule.areas
      }));
      
      // Initialize database with our schedules using a direct function call
      const { error: initError } = await supabase.functions.invoke('initialize-collection-schedules', {
        body: { schedules: scheduleData }
      });
      
      if (initError) throw initError;
    } else {
      // Update our static data with database data
      collectionSchedules.length = 0; // Clear array

      data.forEach(dbSchedule => {
        collectionSchedules.push({
          route: dbSchedule.route,
          date: dbSchedule.pickup_date,
          areas: dbSchedule.areas
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing schedules with database:', error);
    return false;
  }
};

// Update route date
export const updateRouteDate = async (route: string, newDate: string): Promise<boolean> => {
  try {
    // Update in database using a direct query instead of RPC
    const { error } = await supabase
      .from('collection_schedules')
      .update({ pickup_date: newDate })
      .eq('route', route);
    
    if (error) throw error;
    
    // Update in our static data
    const scheduleIndex = collectionSchedules.findIndex(s => s.route === route);
    if (scheduleIndex !== -1) {
      collectionSchedules[scheduleIndex].date = newDate;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating route date:', error);
    return false;
  }
};

// Add a new route
export const addRoute = async (route: string, date: string, areas: string[]): Promise<boolean> => {
  try {
    // Check if route already exists
    const existingRoute = collectionSchedules.find(s => s.route === route);
    if (existingRoute) {
      throw new Error('A route with this name already exists');
    }
    
    // Add to database using direct insert
    const { error } = await supabase
      .from('collection_schedules')
      .insert({
        route: route,
        pickup_date: date,
        areas: areas
      });
    
    if (error) throw error;
    
    // Add to our static data
    collectionSchedules.push({
      route,
      date,
      areas
    });
    
    return true;
  } catch (error) {
    console.error('Error adding route:', error);
    throw error;
  }
};

// Remove a route
export const removeRoute = async (route: string): Promise<boolean> => {
  try {
    // Remove from database with direct delete
    const { error } = await supabase
      .from('collection_schedules')
      .delete()
      .eq('route', route);
    
    if (error) throw error;
    
    // Remove from our static data
    const scheduleIndex = collectionSchedules.findIndex(s => s.route === route);
    if (scheduleIndex !== -1) {
      collectionSchedules.splice(scheduleIndex, 1);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing route:', error);
    return false;
  }
};

// Add area to route
export const addAreaToRoute = async (route: string, area: string): Promise<boolean> => {
  try {
    // Get current route data
    const { data, error: fetchError } = await supabase
      .from('collection_schedules')
      .select('areas')
      .eq('route', route)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Check if area already exists in route
    if (data && data.areas.includes(area)) {
      throw new Error('This area is already part of the route');
    }
    
    // Update the areas array
    const updatedAreas = data ? [...data.areas, area] : [area];
    
    // Update database
    const { error } = await supabase
      .from('collection_schedules')
      .update({ areas: updatedAreas })
      .eq('route', route);
    
    if (error) throw error;
    
    // Update our static data
    const scheduleIndex = collectionSchedules.findIndex(s => s.route === route);
    if (scheduleIndex !== -1) {
      collectionSchedules[scheduleIndex].areas.push(area);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding area to route:', error);
    throw error;
  }
};

// Remove area from route
export const removeAreaFromRoute = async (route: string, area: string): Promise<boolean> => {
  try {
    // Get current route data
    const { data, error: fetchError } = await supabase
      .from('collection_schedules')
      .select('areas')
      .eq('route', route)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!data) return false;
    
    // Filter out the area to remove
    const updatedAreas = data.areas.filter(a => a !== area);
    
    // Update database
    const { error } = await supabase
      .from('collection_schedules')
      .update({ areas: updatedAreas })
      .eq('route', route);
    
    if (error) throw error;
    
    // Update our static data
    const scheduleIndex = collectionSchedules.findIndex(s => s.route === route);
    if (scheduleIndex !== -1) {
      const areaIndex = collectionSchedules[scheduleIndex].areas.indexOf(area);
      if (areaIndex !== -1) {
        collectionSchedules[scheduleIndex].areas.splice(areaIndex, 1);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error removing area from route:', error);
    return false;
  }
};
