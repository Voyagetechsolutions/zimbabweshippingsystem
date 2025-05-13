
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

    // Function to ensure we always have a valid date
    const ensureValidDate = (date: string | null): string => {
      if (!date || date.includes('undefined') || date.includes('null') || date === "No date available") {
        return "Next available collection date (our team will contact you)";
      }
      return date;
    };

    // For England
    if (country === 'England' && postalCode) {
      // Normalize postal code
      const normalizedPostCode = postalCode.trim().toUpperCase();
      const postCodePrefix = normalizedPostCode.match(/^[A-Z]{1,2}[0-9]{0,1}/)?.[0];
      
      // Check for restricted postal codes first
      if (postCodePrefix && restrictedPostalCodes.includes(postCodePrefix)) {
        restricted = true;
        setIsRestricted(true);
        
        // For restricted areas, set route and date to null
        newRoute = null;
        newCollectionDate = null;
      } else {
        // Normal route determination for non-restricted areas
        newRoute = getRouteForPostalCode(normalizedPostCode);
        
        // If route found, get collection date
        if (newRoute) {
          newCollectionDate = getDateByRoute(newRoute);
          console.log("Retrieved England route and date:", { newRoute, newCollectionDate });
        }
        
        // If no route found through postal code mapping, try a default for the UK region
        if (!newRoute) {
          // Determine appropriate UK region based on postal code
          const firstChar = normalizedPostCode.charAt(0);
          
          if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(firstChar)) {
            newRoute = "SCOTLAND ROUTE";
          } else if (['H', 'I', 'J', 'K'].includes(firstChar)) {
            newRoute = "NORTHAMPTON ROUTE";
          } else if (['L', 'M', 'N', 'O'].includes(firstChar)) {
            newRoute = "MANCHESTER ROUTE";
          } else if (['P', 'Q', 'R', 'S'].includes(firstChar)) {
            newRoute = "LEEDS ROUTE";
          } else if (['T', 'U', 'V', 'W'].includes(firstChar)) {
            newRoute = "BIRMINGHAM ROUTE";
          } else if (['X', 'Y', 'Z'].includes(firstChar)) {
            newRoute = "LONDON ROUTE";
          } else {
            newRoute = "LONDON ROUTE"; // Default
          }
          
          newCollectionDate = getDateByRoute(newRoute);
          console.log("Using region-based fallback route:", { newRoute, newCollectionDate });
        }
      }
    } 
    // For Ireland
    else if (country === 'Ireland' && city) {
      const normalizedCity = city.trim().toUpperCase();
      newRoute = getIrelandRouteForCity(normalizedCity);
      
      if (newRoute) {
        // Try to get city-specific date first, then fall back to route date
        newCollectionDate = getDateForIrelandCity(normalizedCity) || getDateByRoute(newRoute);
        console.log("Retrieved Ireland route and date:", { newRoute, newCollectionDate });
      }
      
      // If no route found, use default for Ireland
      if (!newRoute) {
        // Based on city name, try to determine region
        if (normalizedCity.includes('DUBLIN') || normalizedCity.includes('WICKLOW')) {
          newRoute = "DUBLIN CITY ROUTE";
        } else if (normalizedCity.includes('CORK') || normalizedCity.includes('WATERFORD')) {
          newRoute = "CORK ROUTE";
        } else if (normalizedCity.includes('LIMERICK') || normalizedCity.includes('CLARE')) {
          newRoute = "LIMERICK ROUTE";
        } else if (normalizedCity.includes('GALWAY') || normalizedCity.includes('ATHLONE')) {
          newRoute = "ATHLONE ROUTE";
        } else if (normalizedCity.includes('CAVAN') || normalizedCity.includes('MEATH')) {
          newRoute = "CAVAN ROUTE";
        } else if (normalizedCity.includes('BELFAST') || normalizedCity.includes('ARMAGH')) {
          newRoute = "BELFAST ROUTE";
        } else if (normalizedCity.includes('DERRY') || normalizedCity.includes('LONDONDERRY')) {
          newRoute = "LONDON DERRY ROUTE";
        } else {
          newRoute = "DUBLIN CITY ROUTE"; // Default
        }
        
        newCollectionDate = getDateByRoute(newRoute);
        console.log("Using region-based fallback route for Ireland:", { newRoute, newCollectionDate });
      }
    }
    // Default fallbacks if we still don't have route/date
    if (!restricted && (!newRoute || !newCollectionDate)) {
      if (country === 'England') {
        newRoute = "LONDON ROUTE";
        newCollectionDate = "Next available collection date";
        console.log("Using default England route:", { newRoute, newCollectionDate });
      } else if (country === 'Ireland') {
        newRoute = "DUBLIN CITY ROUTE";
        newCollectionDate = "Next available collection date";
        console.log("Using default Ireland route:", { newRoute, newCollectionDate });
      } else {
        newRoute = "Standard Route";
        newCollectionDate = "Next available collection date";
        console.log("Using standard fallback route:", { newRoute, newCollectionDate });
      }
    }

    // Ensure we always have a valid date string
    if (newCollectionDate) {
      newCollectionDate = ensureValidDate(newCollectionDate);
    }

    // Update state
    setRoute(newRoute);
    setCollectionDate(newCollectionDate);
    setIsDataReady(true);
    
    // ALWAYS call the callback with determined values
    if (onCollectionInfoReady) {
      console.log("Calling onCollectionInfoReady with:", { 
        route: restricted ? null : newRoute, 
        collectionDate: restricted ? null : newCollectionDate 
      });
      
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

  // For all other cases, show route and collection date
  return (
    <Alert className="bg-green-50 border-green-200 mt-4">
      <AlertTitle className="text-green-800 font-semibold">Collection Information</AlertTitle>
      <AlertDescription className="text-green-700">
        <p>Your shipment will be collected via the <strong>{route || 'Standard Route'}</strong>.</p>
        <p>Collection date: <strong>{collectionDate || 'Next available collection date'}</strong></p>
      </AlertDescription>
    </Alert>
  );
};

export default CollectionInfo;
