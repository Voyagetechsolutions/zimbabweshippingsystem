
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getRouteForPostalCode, getIrelandRouteForCity, restrictedPostalCodes } from '@/utils/postalCodeUtils';
import { supabase } from '@/integrations/supabase/client';
import BusinessContactValue from '@/components/BusinessContactValue';

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
  const [scheduleData, setScheduleData] = useState<any[] | null>(null);
  
  // Fetch updated schedule data from database
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const { data, error } = await supabase
          .from('collection_schedules')
          .select('*');
        
        if (error) {
          console.error('Error fetching schedule data:', error);
          setScheduleData([]);
        } else {
          setScheduleData(data || []);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        setScheduleData([]);
      }
    };
    
    fetchScheduleData();
  }, []);

  // Helper function to get date by route from fetched data
  const getDateByRouteFromData = (routeName: string): string | null => {
    if (!scheduleData) return null;
    const schedule = scheduleData.find(s => s.route === routeName);
    return schedule?.pickup_date || null;
  };
  
  // Process the collection information when props change
  useEffect(() => {
    if (scheduleData === null) return; // Wait for the database request to finish.
    
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
        newCollectionDate = getDateByRouteFromData(newRoute);
        console.log("Retrieved Ireland route and date:", { newRoute, newCollectionDate });
      }
    }
    
    // Never invent a route or date: admin-managed schedule data is authoritative.
    setRoute(newRoute);
    setCollectionDate(newCollectionDate);
    setIsDataReady(true);
    
    // ALWAYS call the callback with determined values
    if (onCollectionInfoReady) {
      console.log("Calling onCollectionInfoReady with:", { route: newRoute, collectionDate: newCollectionDate, restricted });
      onCollectionInfoReady({ 
        route: restricted ? null : newRoute,
        collectionDate: restricted ? null : newCollectionDate
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
          <p>Please contact <BusinessContactValue /> to place a booking manually. We currently don't have a schedule for this route unless manually booking.</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!route || !collectionDate) {
    return <div className="text-center p-4">No collection date is currently published for this address. Please contact <BusinessContactValue />.</div>;
  }

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
