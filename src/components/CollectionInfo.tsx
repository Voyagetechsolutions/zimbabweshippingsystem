
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PhoneIcon } from 'lucide-react';
import { getRouteForPostalCode, getIrelandRouteForCity, restrictedPostalCodes } from '@/utils/postalCodeUtils';
import { getDateByRoute, getDateForIrelandCity } from '@/data/collectionSchedule';
import { supabase } from '@/integrations/supabase/client';

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
  const [isDataReady, setIsDataReady] = useState(false);
  const [route, setRoute] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [fallbackSchedules, setFallbackSchedules] = useState<any[]>([]);
  
  // Fetch fallback schedules from Supabase
  useEffect(() => {
    const fetchFallbackSchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('collection_schedules')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setFallbackSchedules(data);
        }
      } catch (error) {
        console.error('Error fetching fallback schedules:', error);
      }
    };
    
    fetchFallbackSchedules();
  }, []);
  
  // Determine a fallback date when no specific date is available
  const getFallbackCollectionDate = () => {
    // First try to use dates from the database
    if (fallbackSchedules.length > 0) {
      const currentCountry = country === 'England' ? 'UK' : country;
      
      // Try to find a schedule for this country
      const countrySchedule = fallbackSchedules.find(schedule => 
        schedule.route.includes(currentCountry) || 
        schedule.areas.some((area: string) => area.includes(currentCountry))
      );
      
      if (countrySchedule) {
        return countrySchedule.pickup_date;
      }
      
      // If no country-specific schedule, return the most recent one
      return fallbackSchedules[0].pickup_date;
    }
    
    // If no database schedules, use static fallback
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    return nextWeek.toLocaleDateString('en-GB', options);
  };

  // Process collection information when props change
  useEffect(() => {
    console.log("CollectionInfo useEffect running with:", { country, postalCode, city });
    
    let newRoute: string | null = null;
    let newCollectionDate: string | null = null;
    let restricted = false;

    // Check for restricted postal codes
    if (country === 'England' && postalCode) {
      const postCodePrefix = postalCode.toUpperCase().match(/^[A-Z]{1,2}[0-9]{0,1}/)?.[0];
      if (postCodePrefix && restrictedPostalCodes.includes(postCodePrefix)) {
        restricted = true;
        setIsRestricted(true);
      } else {
        // Try to determine route and date for England
        newRoute = getRouteForPostalCode(postalCode);
        if (newRoute) {
          newCollectionDate = getDateByRoute(newRoute);
          console.log("Retrieved England route and date:", { newRoute, newCollectionDate });
        }
      }
    } else if (country === 'Ireland' && city) {
      // Try to determine route and date for Ireland
      const normalizedCity = city.trim().toUpperCase();
      newRoute = getIrelandRouteForCity(normalizedCity);
      if (newRoute) {
        newCollectionDate = getDateForIrelandCity(normalizedCity) || getDateByRoute(newRoute);
        console.log("Retrieved Ireland route and date:", { newRoute, newCollectionDate });
      }
    }
    
    // If restricted, set route and date to null but report this to the parent
    if (restricted) {
      newRoute = "Manual Booking Required";
      newCollectionDate = "Contact for details";
    } 
    // If we couldn't determine a specific route and date, use fallbacks
    else if (!newRoute || !newCollectionDate) {
      if (country === 'England') {
        newRoute = "UK Standard Route";
      } else if (country === 'Ireland') {
        newRoute = "Ireland Standard Route";
      } else {
        newRoute = "Standard Route";
      }
      
      // Get a fallback collection date
      newCollectionDate = getFallbackCollectionDate();
      console.log("Using fallback route and date:", { newRoute, newCollectionDate });
    }

    // Update state
    setRoute(newRoute);
    setCollectionDate(newCollectionDate);
    setIsDataReady(true);
    
    // Call the callback with determined values
    if (onCollectionInfoReady) {
      console.log("Calling onCollectionInfoReady with:", { route: newRoute, collectionDate: newCollectionDate });
      onCollectionInfoReady({ 
        route: newRoute, 
        collectionDate: newCollectionDate 
      });
    }
  }, [country, postalCode, city, fallbackSchedules, onCollectionInfoReady]);

  // Show loading indicator while data is being prepared
  if (!isDataReady) {
    return <div className="text-center p-4">Loading collection information...</div>;
  }

  // Show specific message for restricted postal codes
  if (isRestricted) {
    return (
      <Alert className="bg-amber-50 border-amber-200 mt-4">
        <AlertTitle className="text-amber-800 font-semibold">Restricted Postal Code</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p>This postal code requires a manual booking. Please contact our support team to arrange collection.</p>
          <p className="flex items-center mt-2">
            Contact support: 
            <a href="tel:+44 7584 100552" className="text-blue-600 font-semibold flex items-center ml-2">
              <PhoneIcon className="h-4 w-4 mr-1" /> +44 7584 100552
            </a>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Show the collection information (this will always show now with our fallbacks)
  return (
    <Alert className="bg-green-50 border-green-200 mt-4">
      <AlertTitle className="text-green-800 font-semibold">Collection Information</AlertTitle>
      <AlertDescription className="text-green-700">
        <p>Your shipment will be collected via the <strong>{route}</strong>.</p>
        <p>Collection date: <strong>{collectionDate}</strong></p>
        {!postalCode && country === 'England' && (
          <p className="text-xs mt-1">Note: For more accurate collection information, please provide a postal code.</p>
        )}
        {!city && country === 'Ireland' && (
          <p className="text-xs mt-1">Note: For more accurate collection information, please provide a city.</p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default CollectionInfo;
