
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PhoneIcon } from 'lucide-react';
import { getRouteForPostalCode, getIrelandRouteForCity } from '@/utils/postalCodeUtils';
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
  
  // Process the collection information when props change
  useEffect(() => {
    let newRoute: string | null = null;
    let newCollectionDate: string | null = null;
    
    console.log("CollectionInfo useEffect running with:", { country, postalCode, city });
    
    if (country === 'England' && postalCode) {
      newRoute = getRouteForPostalCode(postalCode);
      if (newRoute) {
        newCollectionDate = getDateByRoute(newRoute);
        console.log("Retrieved England route and date:", { newRoute, newCollectionDate });
      }
    } else if (country === 'Ireland' && city) {
      const normalizedCity = city.trim().toUpperCase();
      newRoute = getIrelandRouteForCity(normalizedCity);
      if (newRoute) {
        newCollectionDate = getDateForIrelandCity(normalizedCity) || getDateByRoute(newRoute);
        console.log("Retrieved Ireland route and date:", { newRoute, newCollectionDate });
      }
    } else if (country === 'England' && !postalCode) {
      // Fallback for England when no postal code is provided
      newRoute = "Default England Route";
      newCollectionDate = "Next available collection date";
      console.log("Using fallback route for England");
    } else if (country === 'Ireland' && !city) {
      // Fallback for Ireland when no city is provided
      newRoute = "Default Ireland Route";
      newCollectionDate = "Next available collection date";
      console.log("Using fallback route for Ireland");
    } else {
      // Fallback for any other cases
      newRoute = "Standard Route";
      newCollectionDate = "Next available collection date";
      console.log("Using standard fallback route");
    }

    setRoute(newRoute);
    setCollectionDate(newCollectionDate);
    setIsDataReady(true);
    
    // Ensure we always call the callback with the route and collection date
    if (onCollectionInfoReady) {
      console.log("Calling onCollectionInfoReady with:", { route: newRoute, collectionDate: newCollectionDate });
      onCollectionInfoReady({ route: newRoute, collectionDate: newCollectionDate });
    } else {
      console.warn("onCollectionInfoReady callback is not provided to CollectionInfo component");
    }
  }, [country, postalCode, city, onCollectionInfoReady]);

  if (!isDataReady) {
    return <div className="text-center p-4">Loading collection information...</div>;
  }

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
