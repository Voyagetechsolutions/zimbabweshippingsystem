
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PhoneIcon } from 'lucide-react';
import { getRouteForPostalCode, getIrelandRouteForCity, restrictedPostalCodes } from '@/utils/postalCodeUtils';
import { supabase } from '@/integrations/supabase/client';
import { generateUniqueId } from '@/utils/utils';

interface CollectionInfoProps {
  country: string;
  postalCode?: string;
  city?: string;
  onCollectionInfoReady?: (data: { route: string | null; collectionDate: string | null }) => void;
}

const CollectionInfo: React.FC<CollectionInfoProps> = ({ 
  country, 
  postalCode, 
  city,
  onCollectionInfoReady
}) => {
  // Use state to track when data is ready
  const [isDataReady, setIsDataReady] = useState(false);
  const [route, setRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  
  // Fetch updated schedule data from database
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const { data, error } = await supabase
          .from('collection_schedules')
          .select('*');
        
        if (error) {
          console.error('Error fetching schedule data:', error);
          // Use fallback data with updated dates
          setScheduleData([
            { route: "NORTHAMPTON ROUTE", pickup_date: "29th of August" },
            { route: "LEEDS ROUTE", pickup_date: "30th of August" },
            { route: "NOTTINGHAM ROUTE", pickup_date: "2nd of September" },
            { route: "BIRMINGHAM ROUTE", pickup_date: "4th of September" },
            { route: "LONDON ROUTE", pickup_date: "6th of September" },
            { route: "CARDIFF ROUTE", pickup_date: "8th of September" },
            { route: "BOURNEMOUTH ROUTE", pickup_date: "9th of September" },
            { route: "BRIGHTON ROUTE", pickup_date: "10th of September" },
            { route: "SOUTHEND ROUTE", pickup_date: "12th of September" }
          ]);
        } else {
          setScheduleData(data || []);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        // Use fallback data
        setScheduleData([
          { route: "NORTHAMPTON ROUTE", pickup_date: "29th of August" },
          { route: "LEEDS ROUTE", pickup_date: "30th of August" },
          { route: "NOTTINGHAM ROUTE", pickup_date: "2nd of September" },
          { route: "BIRMINGHAM ROUTE", pickup_date: "4th of September" },
          { route: "LONDON ROUTE", pickup_date: "6th of September" },
          { route: "CARDIFF ROUTE", pickup_date: "8th of September" },
          { route: "BOURNEMOUTH ROUTE", pickup_date: "9th of September" },
          { route: "BRIGHTON ROUTE", pickup_date: "10th of September" },
          { route: "SOUTHEND ROUTE", pickup_date: "12th of September" }
        ]);
      }
    };
    
    fetchScheduleData();
  }, []);

  // Helper function to get date by route from fetched data
  const getDateByRouteFromData = (routeName: string): string => {
    const schedule = scheduleData.find(s => s.route === routeName);
    return schedule?.pickup_date || "Next available collection date";
  };

  // Helper function to get Ireland route date
  const getDateForIrelandCityFromData = (city: string): string | null => {
    // Ireland routes mapping
    const irelandRoutes = {
      'LONDON DERRY ROUTE': '18th of April',
      'BELFAST ROUTE': '19th of April',
      'CAVAN ROUTE': '21st of April',
      'ATHLONE ROUTE': '23rd of April',
      'LIMERICK ROUTE': '24th of April',
      'DUBLIN CITY ROUTE': '26th of April',
      'CORK ROUTE': '28th of April'
    };
    
    // Get route for the city (you can expand this mapping as needed)
    const cityToRoute: Record<string, string> = {
      'BELFAST': 'BELFAST ROUTE',
      'DUBLIN': 'DUBLIN CITY ROUTE',
      'CORK': 'CORK ROUTE',
      // Add more mappings as needed
    };
    
    const routeName = cityToRoute[city.toUpperCase()];
    return routeName ? irelandRoutes[routeName as keyof typeof irelandRoutes] || null : null;
  };
  
  // Process the collection information when props change
  useEffect(() => {
    if (scheduleData.length === 0) return; // Wait for schedule data to load
    
    // Print debug information
    console.log("CollectionInfo useEffect running with:", { country, postalCode, city });
    
    let newRoute: string | null = null;
    let newCollectionDate: string | null = null;
    let restricted = false;

    // Check for restricted postal codes first
    if (country === 'England' && postalCode) {
      const postCodePrefix = postalCode.toUpperCase().match(/^[A-Z]{1,2}[0-9]{0,1}/)?.[0];
      if (postCodePrefix && restrictedPostalCodes.includes(postCodePrefix)) {
        restricted = true;
        setIsRestricted(true);
        
        // For restricted areas, provide fallback date instead of null
        newRoute = "Restricted Route";
        newCollectionDate = "Contact support for booking";
      } else {
        // Normal route determination for non-restricted areas
        newRoute = getRouteForPostalCode(postalCode);
        if (newRoute) {
          newCollectionDate = getDateByRouteFromData(newRoute);
          console.log("Retrieved England route and date:", { newRoute, newCollectionDate });
        }
      }
    } else if (country === 'Ireland' && city) {
      const normalizedCity = city.trim().toUpperCase();
      newRoute = getIrelandRouteForCity(normalizedCity);
      if (newRoute) {
        newCollectionDate = getDateForIrelandCityFromData(normalizedCity) || getDateByRouteFromData(newRoute);
        console.log("Retrieved Ireland route and date:", { newRoute, newCollectionDate });
      }
    }
    
    // IMPORTANT: Always ensure we have a route and collection date
    // If we couldn't determine a route and date based on inputs, use appropriate fallbacks
    if (!newRoute) {
      if (country === 'England') {
        newRoute = "Default England Route";
        newCollectionDate = newCollectionDate || "Next available collection date";
        console.log("Using fallback route for England");
      } else if (country === 'Ireland') {
        newRoute = "Default Ireland Route";
        newCollectionDate = newCollectionDate || "Next available collection date";
        console.log("Using fallback route for Ireland");
      } else {
        newRoute = "Standard Route";
        newCollectionDate = newCollectionDate || "Next available collection date";
        console.log("Using standard fallback route");
      }
    }
    
    // Make sure collectionDate is never null
    if (!newCollectionDate) {
      newCollectionDate = "Next available collection date";
    }

    // Update state with guaranteed values
    setRoute(newRoute);
    setCollectionDate(newCollectionDate);
    setIsDataReady(true);
    
    // ALWAYS call the callback with determined values
    if (onCollectionInfoReady) {
      console.log("Calling onCollectionInfoReady with:", { route: newRoute, collectionDate: newCollectionDate, restricted });
      onCollectionInfoReady({ 
        route: restricted ? "Restricted Route" : newRoute, 
        collectionDate: restricted ? "Contact support for booking" : newCollectionDate 
      });
    } else {
      console.warn("onCollectionInfoReady callback is not provided to CollectionInfo component");
    }
  }, [country, postalCode, city, onCollectionInfoReady, scheduleData]);

  // Don't render anything if data isn't ready yet
  if (!isDataReady) {
    return <div className="text-center p-4">Loading collection information...</div>;
  }

  // Show specific message for restricted postal codes
  if (isRestricted) {
    return (
      <Alert className="bg-amber-50 border-amber-200 mt-4">
        <AlertTitle className="text-amber-800 font-semibold">Restricted Postal Code</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p>Please contact +44 7584 100552 to place a booking manually. We currently don't have a schedule for this route unless manually booking.</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Always show the collection information since we now guarantee route and date will have values
  return (
    <Alert className="bg-green-50 border-green-200 mt-4">
      <AlertTitle className="text-green-800 font-semibold">Collection Information</AlertTitle>
      <AlertDescription className="text-green-700">
        <p>Your shipment will be collected via the <strong>{route}</strong>.</p>
        <p>Collection date: <strong>{collectionDate}</strong></p>
      </AlertDescription>
    </Alert>
  );
};

export default CollectionInfo;
