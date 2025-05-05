
import React from 'react';
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
  let route: string | null = null;
  let collectionDate: string | null = null;
  
  if (country === 'England' && postalCode) {
    route = getRouteForPostalCode(postalCode);
    if (route) {
      collectionDate = getDateByRoute(route);
    }
  } else if (country === 'Ireland' && city) {
    const normalizedCity = city.trim().toUpperCase();
    route = getIrelandRouteForCity(normalizedCity);
    if (route) {
      collectionDate = getDateByRoute(route);
    }
  }

  // Call the callback if provided to pass the collection info
  React.useEffect(() => {
    if (onCollectionInfoReady) {
      onCollectionInfoReady({ route, collectionDate });
    }
  }, [route, collectionDate, onCollectionInfoReady]);

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
