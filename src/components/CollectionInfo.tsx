
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PhoneIcon } from 'lucide-react';
import { getRouteForPostalCode, getIrelandRouteForCity, restrictedPostalCodes } from '@/utils/postalCodeUtils';
import { getDateByRoute, getDateForIrelandCity } from '@/data/collectionSchedule';

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
  
  // Process the collection information when props change
  useEffect(() => {
    // Print debug information
    console.log("CollectionInfo useEffect running with:", { country, postalCode, city });
    
    let newRoute: string | null = null;
    let newCollectionDate: string | null = null;
    let restricted = false;

    // Check for restricted postal codes first
    if (country === 'England' && postalCode) {
      const postCodePrefix = postalCode.toUpperCase().match(/^[A-Z]{1,2}/)?.[0];
      if (postCodePrefix && restrictedPostalCodes.includes(postCodePrefix)) {
        restricted = true;
        setIsRestricted(true);
        
        // For restricted areas, set route and date to null
        newRoute = null;
        newCollectionDate = null;
      } else {
        // Normal route determination for non-restricted areas
        newRoute = getRouteForPostalCode(postalCode);
        if (newRoute) {
          newCollectionDate = getDateByRoute(newRoute);
          console.log("Retrieved England route and date:", { newRoute, newCollectionDate });
        }
      }
    } else if (country === 'Ireland' && city) {
      const normalizedCity = city.trim().toUpperCase();
      newRoute = getIrelandRouteForCity(normalizedCity);
      if (newRoute) {
        newCollectionDate = getDateForIrelandCity(normalizedCity) || getDateByRoute(newRoute);
        console.log("Retrieved Ireland route and date:", { newRoute, newCollectionDate });
      }
    }
    
    // If we couldn't determine a route and date based on inputs and it's not restricted, use fallbacks
    if (!restricted && (!newRoute || !newCollectionDate)) {
      if (country === 'England') {
        newRoute = "Default England Route";
        newCollectionDate = "Next available collection date";
        console.log("Using fallback route for England");
      } else if (country === 'Ireland') {
        newRoute = "Default Ireland Route";
        newCollectionDate = "Next available collection date";
        console.log("Using fallback route for Ireland");
      } else {
        newRoute = "Standard Route";
        newCollectionDate = "Next available collection date";
        console.log("Using standard fallback route");
      }
    }

    // Update state
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
  }, [country, postalCode, city, onCollectionInfoReady]);

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

  // Show an alert if we couldn't determine a specific route or collection date
  if (!route || !collectionDate) {
    return (
      <Alert className="bg-amber-50 border-amber-200 mt-4">
        <AlertTitle className="text-amber-800 font-semibold">Area Not Available</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p>Your area is not available but will be considered.</p>
          <p className="flex items-center mt-2">
            Contact support to make a booking: 
            <a href="tel:+353871954910" className="text-blue-600 font-semibold flex items-center ml-2">
              <PhoneIcon className="h-4 w-4 mr-1" /> +353 871954910
            </a>
          </p>
        </AlertDescription>
      </Alert>
    );
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
